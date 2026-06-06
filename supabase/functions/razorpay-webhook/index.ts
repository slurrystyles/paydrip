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

const planMap: Record<string, {
  plan: 'pro' | 'enterprise',
  interval: 'monthly' | 'annual'
}> = {
  'plan_SyJNyVp4K5qcL2': { 
    plan: 'pro', interval: 'monthly' 
  },
  'plan_SyJOoiKBiTmW8v': { 
    plan: 'pro', interval: 'annual' 
  },
  'plan_SyJPyzAjDNMvBj': { 
    plan: 'enterprise', interval: 'monthly' 
  },
  'plan_SyJPcIxk8lHQz5': { 
    plan: 'enterprise', interval: 'annual' 
  },
};

const supportedEvents = [
  "subscription.activated",
  "subscription.charged",
  "subscription.cancelled",
  "subscription.expired",
  "subscription.halted"
];

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

    // 2. Extract subscription payment info and resolve User ID
    const subscriptionEntity = payload.payload?.subscription?.entity;
    const paymentEntity = payload.payload?.payment?.entity;

    const email =
      subscriptionEntity?.notes?.email ||
      paymentEntity?.email ||
      subscriptionEntity?.customer_email ||
      null;

    const planId = subscriptionEntity?.plan_id || null;
    const razorpaySubscriptionId = subscriptionEntity?.id || null;
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

    const planInfo = planId ? planMap[planId] : null;

    if (!planInfo) {
      console.error(`Unable to map planId: "${planId}" to any active subscription plans.`);
      return new Response(JSON.stringify({ 
        success: false, 
        message: `Signature verified but planId "${planId}" is unmapped.` 
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

    const mappedPlan = planInfo.plan;
    const isAnnual = planInfo.interval === 'annual';
    const currentPeriodStart = new Date().toISOString();
    const currentPeriodEnd = new Date(Date.now() + (isAnnual ? 365 : 30) * 24 * 60 * 60 * 1000).toISOString();

    // 3. Update the profile 'plan' column in public.users if active/charged or expired
    if (eventName === 'subscription.activated' || eventName === 'subscription.charged') {
      console.log(`Mapping user ${userId} to plan "${mappedPlan}"`);
      const { error: userUpdateError } = await supabase
        .from("users")
        .update({ plan: mappedPlan })
        .eq("id", userId);

      if (userUpdateError) {
        console.error(`Failed to update public.users.plan for user ${userId}:`, userUpdateError);
        throw userUpdateError;
      }
    } else if (eventName === 'subscription.expired') {
      console.log(`Downgrading user ${userId} to plan "free"`);
      const { error: userUpdateError } = await supabase
        .from("users")
        .update({ plan: 'free' })
        .eq("id", userId);

      if (userUpdateError) {
        console.error(`Failed to update public.users.plan for user ${userId}:`, userUpdateError);
        throw userUpdateError;
      }
    }

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
      const targetSlug = (eventName === 'subscription.expired') ? 'free' : mappedPlan;
      const { data: planRow, error: planError } = await supabaseSecurity
        .from("plans")
        .select("id")
        .eq("slug", targetSlug)
        .maybeSingle();

      if (planError) {
        console.error(`Failed to locate plan with slug "${targetSlug}" in security.plans:`, planError);
      } else if (planRow) {
        const dbPlanId = planRow.id;
        
        // Check if there is an existing subscription for this organization
        const { data: existingSub, error: subSelectError } = await supabaseSecurity
          .from("subscriptions")
          .select("id")
          .eq("organization_id", orgId)
          .maybeSingle();

        const subscriptionMetadata = {
          razorpay_subscription_id: razorpaySubscriptionId,
          razorpay_plan_id: planId,
          razorpay_payment_id: paymentId,
          plan: mappedPlan,
          interval: planInfo.interval,
          email: email,
          user_id: userId
        };

        let status = 'active';
        let cancelAtPeriodEnd = false;
        let pEnd = null;

        if (eventName === 'subscription.activated' || eventName === 'subscription.charged') {
          status = 'active';
          cancelAtPeriodEnd = false;
          pEnd = currentPeriodEnd;
        } else if (eventName === 'subscription.cancelled') {
          status = 'canceled';
          cancelAtPeriodEnd = true;
        } else if (eventName === 'subscription.expired') {
          status = 'canceled';
          cancelAtPeriodEnd = false;
        } else if (eventName === 'subscription.halted') {
          status = 'past_due';
          cancelAtPeriodEnd = false;
        }

        if (subSelectError) {
          console.error("Failed querying existing subscription record:", subSelectError);
        } else if (existingSub) {
          // Update the existing subscription
          const updateData: Record<string, any> = {
            status: status,
            cancel_at_period_end: cancelAtPeriodEnd,
            metadata: subscriptionMetadata,
            updated_at: new Date().toISOString()
          };

          if (dbPlanId) {
            updateData.plan_id = dbPlanId;
          }

          if (pEnd) {
            updateData.current_period_start = currentPeriodStart;
            updateData.current_period_end = pEnd;
          }

          const { error: updateSubError } = await supabaseSecurity
            .from("subscriptions")
            .update(updateData)
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
              plan_id: dbPlanId,
              status: status,
              current_period_start: currentPeriodStart,
              current_period_end: pEnd || currentPeriodEnd,
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
