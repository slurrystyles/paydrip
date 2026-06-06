import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const RAZORPAY_WEBHOOK_SECRET = Deno.env.get("RAZORPAY_WEBHOOK_SECRET");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

/**
 * Timing-safe signature verification for Razorpay Webhooks
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
 * Map Razorpay payment link reference_id to DB Plan Slug
 */
const planMap: Record<string, "pro" | "enterprise"> = {
  "paydrip-pro-monthly": "pro",
  "paydrip-pro-annual": "pro",
  "paydrip-ent-monthly": "enterprise",
  "paydrip-ent-annual": "enterprise",
};

serve(async (req) => {
  try {
    // 1. Signature Verification
    const signature = req.headers.get("x-razorpay-signature")?.trim();
    if (!signature) {
      console.error("Webhook rejected: Missing x-razorpay-signature header");
      return new Response(JSON.stringify({ error: "Missing identity verification signature." }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!RAZORPAY_WEBHOOK_SECRET) {
      console.error("Missing server-side configuration: RAZORPAY_WEBHOOK_SECRET");
      return new Response(JSON.stringify({ error: "Server misconfiguration. Webhook secret is not set." }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const rawBody = await req.text();
    const isSignatureValid = await verifySignature(rawBody, signature, RAZORPAY_WEBHOOK_SECRET);

    if (!isSignatureValid) {
      console.error("Webhook rejected: Invalid signature provided.");
      return new Response(JSON.stringify({ error: "Invalid signature. Request could not be verified." }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Parse the verified JSON payload
    const payload = JSON.parse(rawBody);
    const eventName = payload.event;
    
    console.log(`Received verified Razorpay webhook event: "${eventName}"`);

    // We only process specific payment link paid events
    if (eventName !== "payment_link.paid") {
      console.log(`Skipping event "${eventName}" as it matches no payment tracking criteria.`);
      return new Response(JSON.stringify({ success: true, message: `Ignored unhandled event: ${eventName}` }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Ensure database keys are available
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing Supabase configuration. URL or service role key is undefined.");
    }

    // 2. Extract purchase/payment link info and resolve User ID
    const paymentLinkEntity = payload.payload?.payment_link?.entity;
    const paymentEntity = payload.payload?.payment?.entity;

    const paymentLinkId = paymentLinkEntity?.id || null;
    const orderId = paymentLinkEntity?.order_id || null;
    const referenceId = paymentLinkEntity?.reference_id || null;
    const email = paymentLinkEntity?.customer?.email || paymentEntity?.email || null;
    const paymentId = paymentEntity?.id || null;

    if (!email) {
      console.error("Unable to map webhook: customer email is missing in payload.");
      return new Response(JSON.stringify({ 
        success: false, 
        message: "Signature verified but customer email was missing in the payload." 
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const mappedPlan = referenceId ? planMap[referenceId] : null;

    if (!mappedPlan) {
      console.error(`Unable to map referenceId: "${referenceId}" to any active subscription plans.`);
      return new Response(JSON.stringify({ 
        success: false, 
        message: `Signature verified but referenceId "${referenceId}" is unmapped.` 
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log(`Looking up user by email: ${email}`);
    const { data: userRow, error: userLookupError } = await supabase
      .from("users")
      .select("id")
      .eq("email", email.trim().toLowerCase())
      .maybeSingle();

    if (userLookupError) {
      console.error("Database user query failure:", userLookupError);
    }

    const userId = userRow?.id;

    if (!userId) {
      console.error(`Unable to map webhook to any active user. Email: ${email}`);
      return new Response(JSON.stringify({ 
        success: false, 
        message: "Signature verified but could not resolve user ID/email in application database." 
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Determine period end based on monthly vs yearly configuration
    const isAnnual = referenceId ? referenceId.endsWith("-annual") : false;
    const currentPeriodStart = new Date().toISOString();
    const currentPeriodEnd = new Date(Date.now() + (isAnnual ? 365 : 30) * 24 * 60 * 60 * 1000).toISOString();

    console.log(`Mapping user ${userId} to plan "${mappedPlan}" (isAnnual: ${isAnnual})`);

    // 3. Update the profile 'plan' column in public.users
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

    // 4. Look up User's associated organization_id
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

      // Query the plan ID based on mapped slug in security.plans
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
          razorpay_payment_id: paymentId,
          razorpay_payment_link_id: paymentLinkId,
          razorpay_order_id: orderId,
          reference_id: referenceId,
          email: email
        };

        if (subSelectError) {
          console.error("Failed querying existing subscription record:", subSelectError);
        } else if (existingSub) {
          // Update the existing active subscription
          const { error: updateSubError } = await supabaseSecurity
            .from("subscriptions")
            .update({
              plan_id: planId,
              status: "active",
              current_period_start: currentPeriodStart,
              current_period_end: currentPeriodEnd,
              cancel_at_period_end: false,
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
              status: "active",
              current_period_start: currentPeriodStart,
              current_period_end: currentPeriodEnd,
              cancel_at_period_end: false,
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
    console.error("Critical error in razorpay-webhook Edge Function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
