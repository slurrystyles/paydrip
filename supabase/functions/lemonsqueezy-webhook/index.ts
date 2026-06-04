import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const LEMONSQUEEZY_WEBHOOK_SECRET = Deno.env.get("LEMONSQUEEZY_WEBHOOK_SECRET");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

/**
 * Timing-safe signature verification for Lemon Squeezy Webhooks
 */
async function verifySignature(rawBody: string, signature: string, secret: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(rawBody)
  );
  
  const hashArray = Array.from(new Uint8Array(signatureBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  
  if (hashHex.length !== signature.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < hashHex.length; i++) {
    result |= hashHex.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  
  return result === 0;
}

/**
 * Map Lemon Squeezy Variant ID to DB Plan Slug
 * Pro Monthly: 1745055
 * Pro Annual: 1745071
 * Enterprise Monthly: 1745090
 * Enterprise Annual: 1745078
 */
function getPlanFromVariant(variantId: number, status: string): "free" | "pro" | "enterprise" {
  // If the subscription is cancelled directly / expired / unpaid, demote to free
  if (["cancelled", "expired", "unpaid"].includes(status)) {
    return "free";
  }

  const variantMap: Record<number, "free" | "pro" | "enterprise"> = {
    1745055: "pro",        // Pro Monthly
    1745071: "pro",        // Pro Annual
    1745090: "enterprise", // Enterprise Monthly
    1745078: "enterprise",  // Enterprise Annual
  };

  return variantMap[variantId] || "free";
}

/**
 * Map Lemon Squeezy status to security.subscriptions acceptable status enum:
 * 'active', 'past_due', 'canceled', 'incomplete', 'trialing'
 */
function mapSubscriptionStatus(status: string): "active" | "past_due" | "canceled" | "incomplete" | "trialing" {
  switch (status) {
    case "active":
      return "active";
    case "on_trial":
      return "trialing";
    case "paused":
      return "canceled";
    case "past_due":
      return "past_due";
    case "unpaid":
      return "past_due";
    case "cancelled":
      return "canceled";
    case "expired":
      return "canceled";
    default:
      return "active";
  }
}

serve(async (req) => {
  try {
    // 1. Signature Verification
    const signature = req.headers.get("x-signature");
    if (!signature) {
      console.error("Webhook rejected: Missing x-signature header");
      return new Response(JSON.stringify({ error: "Missing identity verification signature." }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!LEMONSQUEEZY_WEBHOOK_SECRET) {
      console.error("Missing server-side configuration: LEMONSQUEEZY_WEBHOOK_SECRET");
      return new Response(JSON.stringify({ error: "Server misconfiguration. Webhook secret is not set." }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const rawBody = await req.text();
    const isSignatureValid = await verifySignature(rawBody, signature, LEMONSQUEEZY_WEBHOOK_SECRET);

    if (!isSignatureValid) {
      console.error("Webhook rejected: Invalid signature provided.");
      return new Response(JSON.stringify({ error: "Invalid signature. Request could not be verified." }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Parse the verified JSON payload
    const payload = JSON.parse(rawBody);
    const eventName = payload.meta?.event_name;
    
    console.log(`Received verified Lemon Squeezy webhook event: "${eventName}"`);

    // We only process specific subscription-related events
    const supportedEvents = [
      "subscription_created",
      "subscription_updated",
      "subscription_cancelled",
      "subscription_expired",
      "subscription_payment_failed"
    ];

    if (!supportedEvents.includes(eventName)) {
      console.log(`Skipping event "${eventName}" as it matches no subscription tracking criteria.`);
      return new Response(JSON.stringify({ success: true, message: `Ignored unhandled event: ${eventName}` }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Ensure database keys are available
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing Supabase configuration. URL or service role key is undefined.");
    }

    // 2. Extract subscription information and resolve User ID
    const dataObj = payload.data;
    const attributes = dataObj?.attributes;
    
    if (!attributes) {
      throw new Error("Malformed request syntax: missing data attributes.");
    }

    const subscriptionId = dataObj.id; // Lemon Squeezy subscription ID
    const variantId = Number(attributes.variant_id);
    const email = attributes.user_email;
    const status = attributes.status;
    const renewsAt = attributes.renews_at;
    const endsAt = attributes.ends_at;
    const trialEndsAt = attributes.trial_ends_at;
    const cancelled = attributes.cancelled;

    // Resolve user_id: check meta.custom_data.user_id first, fallback to lookup by user_email
    let userId = payload.meta?.custom_data?.user_id;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    if (!userId && email) {
      console.log(`No explicit user_id provided in custom_data. Looking up user by email: ${email}`);
      const { data: userRow, error: userLookupError } = await supabase
        .from("users")
        .select("id")
        .eq("email", email.trim().toLowerCase())
        .maybeSingle();

      if (userLookupError) {
        console.error("Database user query failure:", userLookupError);
      } else if (userRow) {
        userId = userRow.id;
        console.log(`Found matching user profile in public.users: ${userId}`);
      }
    }

    if (!userId) {
      console.error(`Unable to map webhook to any active user. Email: ${email}, custom_data:`, payload.meta?.custom_data);
      // Return 200 as requested for verified payloads to prevent excessive retries from Lemon Squeezy
      return new Response(JSON.stringify({ 
        success: false, 
        message: "Signature verified but could not resolve user ID/email in application database." 
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 3. Map values to plan slugs and subscription attributes
    const mappedPlan = getPlanFromVariant(variantId, status);
    const mappedSubStatus = mapSubscriptionStatus(status);
    const currentPeriodStart = attributes.created_at || new Date().toISOString();
    const currentPeriodEnd = renewsAt || endsAt || trialEndsAt || new Date().toISOString();
    const cancelAtPeriodEnd = !!cancelled;

    console.log(`Mapping user ${userId} to plan "${mappedPlan}" with status "${mappedSubStatus}" based on variant ${variantId} (${status})`);

    // 4. Update the profile 'plan' column in public.users
    const { error: userUpdateError } = await supabase
      .from("users")
      .update({ plan: mappedPlan })
      .eq("id", userId);

    if (userUpdateError) {
      console.error(`Failed to update public.users.plan for user ${userId}:`, userUpdateError);
      throw userUpdateError;
    }
    console.log(`Successfully updated public.users.plan to "${mappedPlan}" for user ${userId}`);

    // Create a server client point into 'security' schema to interface with plans & subscriptions
    const supabaseSecurity = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      db: { schema: "security" },
    });

    // 5. Look up User's associated organization_id
    const { data: membershipRow, error: membershipError } = await supabase
      .from("memberships")
      .select("organization_id")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();

    if (membershipError) {
      console.error(`Failed querying membership connection for user ${userId}:`, membershipError);
    } else if (membershipRow?.organization_id) {
      const orgId = membershipRow.organization_id;
      console.log(`Found associated organization ID ${orgId} for user ${userId}`);

      // Query the plan ID based on mapped slug slug in security.plans
      const { data: planRow, error: planError } = await supabaseSecurity
        .from("plans")
        .select("id")
        .eq("slug", mappedPlan)
        .maybeSingle();

      if (planError) {
        console.error(`Failed to locate plan with slug "${mappedPlan}" in security.plans:`, planError);
      } else if (planRow) {
        const planId = planRow.id;
        
        // Check if there is an existing subscription for this organization
        const { data: existingSub, error: subSelectError } = await supabaseSecurity
          .from("subscriptions")
          .select("id")
          .eq("organization_id", orgId)
          .maybeSingle();

        const subscriptionMetadata = {
          user_id: userId,
          plan: mappedPlan,
          lemon_squeezy_subscription_id: String(subscriptionId),
          lemon_squeezy_variant_id: variantId,
          lemon_squeezy_status: status,
          current_period_end: currentPeriodEnd,
        };

        if (subSelectError) {
          console.error("Failed querying existing subscription record:", subSelectError);
        } else if (existingSub) {
          // Update the existing active subscription
          const { error: updateSubError } = await supabaseSecurity
            .from("subscriptions")
            .update({
              plan_id: planId,
              status: mappedSubStatus,
              current_period_start: currentPeriodStart,
              current_period_end: currentPeriodEnd,
              cancel_at_period_end: cancelAtPeriodEnd,
              metadata: subscriptionMetadata,
              updated_at: new Date().toISOString()
            })
            .eq("organization_id", orgId);

          if (updateSubError) {
            console.error(`Failed updating security.subscriptions for organization ${orgId}:`, updateSubError);
          } else {
            console.log(`Successfully updated existing security.subscriptions for organization ${orgId}`);
          }
        } else {
          // Insert a new subscription record
          const { error: insertSubError } = await supabaseSecurity
            .from("subscriptions")
            .insert({
              organization_id: orgId,
              plan_id: planId,
              status: mappedSubStatus,
              current_period_start: currentPeriodStart,
              current_period_end: currentPeriodEnd,
              cancel_at_period_end: cancelAtPeriodEnd,
              metadata: subscriptionMetadata,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });

          if (insertSubError) {
            console.error(`Failed inserting new security.subscriptions for organization ${orgId}:`, insertSubError);
          } else {
            console.log(`Successfully created new security.subscriptions for organization ${orgId}`);
          }
        }

        /*
         * Note regarding direct columns request:
         * The user schema definitions for `security.subscriptions` in security_hardening_v2.sql
         * do not directly hold columns like `user_id`, `plan`, `lemon_squeezy_subscription_id`, or `lemon_squeezy_variant_id`.
         * Instead, they map to `plan_id` in `security.plans`, link to memberships by `organization_id`, and store extra attributes
         * inside `metadata` JSONB.
         *
         * If the subscriptions table has/had these columns directly available, they would be updated like so:
         * const { error } = await supabaseSecurity
         *   .from("subscriptions")
         *   .update({
         *     user_id: userId,
         *     plan: mappedPlan,
         *     status: mappedSubStatus,
         *     lemon_squeezy_subscription_id: String(subscriptionId),
         *     lemon_squeezy_variant_id: Number(variantId),
         *     current_period_end: currentPeriodEnd
         *   })
         *   .eq("organization_id", orgId);
         */
      }
    } else {
      console.warn(`No connected organization index was found for user ${userId}. Skipping security.subscriptions insert/update.`);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Webhook processed successfully." 
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Critical error in lemonsqueezy-webhook Edge Function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
