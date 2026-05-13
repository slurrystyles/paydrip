import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const body = await req.json();
    const { to, subject, html, invoice_id, type, organization_id } = body;

    console.log(`Sending email to ${to}, type: ${type}, org: ${organization_id}`);

    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY is missing");
      return new Response(JSON.stringify({ error: "RESEND_API_KEY is not set in Supabase Secrets." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Daily Cap Check
    const { data: canSend, error: capError } = await supabase.rpc("check_daily_email_cap");
    if (capError) {
      console.error("Cap check error:", capError);
      // Fallback: if RPC fails (e.g. migration not run), assume we can send for now but log it
      console.warn("RPC check_daily_email_cap not found or failed. Skipping cap check.");
    } else if (canSend === false) {
      console.warn("Daily email cap reached");
      await supabase.from("audit_log").insert({
        invoice_id,
        organization_id,
        audit_type: "email_cap_reached",
        meta: { to, type, reason: "Daily limit of 90 reached" }
      });
      return new Response(JSON.stringify({ error: "Daily email limit (90) reached for today." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Call Resend API
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Paydrip Treasury <onboarding@resend.dev>",
        to: [to],
        subject: subject,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #334155;">
            ${html}
            <hr style="margin-top: 40px; border: 0; border-top: 1px solid #e2e8f0;" />
            <p style="font-size: 11px; color: #94a3b8; text-align: center;">
              Sent via Paydrip Invoice Recovery.<br/>
              To stop receiving these notifications, 
              <a href="#" style="color: #6366f1;">unsubscribe here</a>.
            </p>
          </div>
        `,
      }),
    });

    const data = await res.json();

    if (res.ok) {
      // 3. Log Success
      await supabase.from("audit_log").insert({
        invoice_id,
        organization_id,
        audit_type: "email_sent",
        recipient_email: to,
        delivery_status: "success",
        meta: { message_id: data.id, type, subject }
      });

      return new Response(JSON.stringify({ success: true, message_id: data.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    } else {
      // 4. Log Failure
      await supabase.from("audit_log").insert({
        invoice_id,
        organization_id,
        audit_type: "email_failed",
        recipient_email: to,
        delivery_status: "failed",
        meta: { error: data, type }
      });

      return new Response(JSON.stringify({ error: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
