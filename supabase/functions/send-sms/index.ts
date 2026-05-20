import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER");
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
    const { to, body, invoice_id, organization_id } = await req.json();

    console.log(`Sending SMS to ${to}, org: ${organization_id}`);

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
      console.error("Twilio credentials missing");
      return new Response(JSON.stringify({ error: "Twilio credentials are not set in Supabase Secrets." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
    const twilioRes = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${auth}`,
        },
        body: new URLSearchParams({
          To: to,
          From: TWILIO_PHONE_NUMBER,
          Body: body,
        }).toString(),
      }
    );

    const data = await twilioRes.json();

    if (twilioRes.ok) {
      // Log Success in sms_logs
      await supabase.from("sms_logs").insert({
        organization_id,
        invoice_id,
        to_phone: to,
        message_body: body,
        twilio_message_sid: data.sid,
        status: "sent"
      });

      // Also log to audit_log for consistency
      await supabase.from("audit_log").insert({
        entity_id: invoice_id,
        entity_type: "invoice",
        organization_id,
        audit_type: "sms_sent",
        meta: { twilio_sid: data.sid, to }
      });

      return new Response(JSON.stringify({ success: true, sid: data.sid }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    } else {
      // Log Failure
      await supabase.from("sms_logs").insert({
        organization_id,
        invoice_id,
        to_phone: to,
        message_body: body,
        status: "failed",
        error_message: data.message || "Unknown Twilio error"
      });

      await supabase.from("audit_log").insert({
        entity_id: invoice_id,
        entity_type: "invoice",
        organization_id,
        audit_type: "sms_failed",
        meta: { error: data, to }
      });

      return new Response(JSON.stringify({ error: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
