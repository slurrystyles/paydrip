import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

serve(async (req) => {
  try {
    const { planId, userEmail, userName } = await req.json();

    if (!planId || !userEmail) {
      return new Response(
        JSON.stringify({ error: "planId and userEmail required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID");
    const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET");

    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      return new Response(
        JSON.stringify({ error: "Razorpay credentials missing" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const credentials = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);

    const response = await fetch(
      "https://api.razorpay.com/v1/subscriptions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Basic ${credentials}`
        },
        body: JSON.stringify({
          plan_id: planId,
          total_count: 120,
          quantity: 1,
          customer_notify: 1,
          notify_info: {
            notify_email: userEmail
          },
          notes: {
            email: userEmail,
            name: userName
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Razorpay API error:", data);
      return new Response(
        JSON.stringify({ 
          error: "Failed to create subscription",
          details: data 
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log("Subscription created:", data.id);

    return new Response(
      JSON.stringify({ 
        subscription_id: data.id,
        short_url: data.short_url 
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
