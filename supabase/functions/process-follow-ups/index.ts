import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { getEmailTemplate } from "../_shared/email-templates.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const PROJECT_REF = Deno.env.get("PROJECT_REF");
const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // 1. Query follow_up_steps that are due
    const { data: steps, error: fetchError } = await supabase
      .from("follow_up_steps")
      .select(`
        *,
        sequence:follow_up_sequences!inner(
          *,
          invoice:invoices!inner(*)
        )
      `)
      .eq("status", "pending")
      .lte("scheduled_at", new Date().toISOString())
      .eq("sequence.status", "active")
      .order("scheduled_at", { ascending: true })
      .limit(50);

    if (fetchError) throw fetchError;

    const summary = { processed: 0, sent: 0, failed: 0, skipped: 0 };

    for (const step of (steps || [])) {
      summary.processed++;
      const invoice = step.sequence.invoice;
      const sequence = step.sequence;
      const organizationId = sequence.organization_id;

      try {
        // a. Check invoice is still unpaid
        if (invoice.status === 'paid' || invoice.status === 'cancelled') {
          await supabase.from("follow_up_steps").update({ status: 'skipped', executed_at: new Date().toISOString(), meta: { reason: 'invoice_marked_paid' } }).eq("id", step.id);
          summary.skipped++;
          continue;
        }

        // b. Check daily email cap
        const { data: canSend, error: capError } = await supabase.rpc("check_daily_email_cap");
        if (capError || canSend === false) {
           await supabase.from("follow_up_steps").update({ status: 'failed', executed_at: new Date().toISOString(), meta: { error: 'daily_email_cap_reached' } }).eq("id", step.id);
           summary.failed++;
           continue;
        }

        // c. Generate content with Gemini
        const clientSnapshot = invoice.snapshot_json || {};
        const clientName = clientSnapshot.name || 'Valued Client';
        const clientEmail = clientSnapshot.email;
        const businessName = invoice.business_name || "Paydrip Merchant"; // Fallback
        const amount = invoice.amount;
        const dueDate = new Date(invoice.due_date).toLocaleDateString();
        const daysOverdue = Math.max(0, Math.floor((new Date().getTime() - new Date(invoice.due_date).getTime()) / (1000 * 60 * 60 * 24)));

        if (!clientEmail) {
          await supabase.from("follow_up_steps").update({ status: 'failed', executed_at: new Date().toISOString(), meta: { error: 'client_email_missing' } }).eq("id", step.id);
          summary.failed++;
          continue;
        }

        let emailContent = null;
        if (GEMINI_API_KEY) {
          try {
            const systemPrompt = `You are a professional payment recovery assistant for ${businessName}. Generate a ${step.template_type} email for ${clientName} regarding invoice #${invoice.invoice_number} for ₹${amount}, due on ${dueDate} (${daysOverdue} days overdue). Keep it under 150 words. Be professional, not aggressive. Return only the email body, no subject line.`;
            
            const aiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ contents: [{ parts: [{ text: systemPrompt }] }] })
            });
            const aiData = await aiRes.json();
            emailContent = aiData.candidates?.[0]?.content?.parts?.[0]?.text;
          } catch (e) {
            console.error("Gemini failed, using fallback:", e);
          }
        }

        // Use fallback if AI fails or key is missing
        if (!emailContent) {
          const template = getEmailTemplate(step.template_type, {
            businessName,
            invoiceNumber: invoice.invoice_number,
            amount: amount.toString(),
            dueDate,
            clientName,
            publicLink: `https://${PROJECT_REF}.supabase.co/v/${invoice.public_token}`
          });
          emailContent = template.html;
        } else {
           // Wrap text-only AI content in a basic HTML body if it looks like plain text
           if (!emailContent.includes('<p>') && !emailContent.includes('<div>')) {
             emailContent = `<div style="font-family: sans-serif; line-height: 1.5; color: #374151;">${emailContent.replace(/\n/g, '<br/>')}</div>`;
           }
        }

        const subject = `${step.template_type.replace('_', ' ').toUpperCase()}: Invoice #${invoice.invoice_number}`;

        // d. Call send-email function
        const sendRes = await fetch(`https://${PROJECT_REF}.supabase.co/functions/v1/send-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${SERVICE_ROLE_KEY}`
          },
          body: JSON.stringify({
            to: clientEmail,
            subject,
            html: emailContent,
            invoice_id: invoice.id,
            type: step.template_type,
            organization_id: organizationId
          })
        });

        if (!sendRes.ok) throw new Error(`SendEmail failed: ${sendRes.statusText}`);

        // e. Update Step Status
        await supabase.from("follow_up_steps").update({ 
          status: 'sent', 
          executed_at: new Date().toISOString(),
          meta: { gemini_used: !!GEMINI_API_KEY, timestamp: new Date().toISOString() }
        }).eq("id", step.id);
        summary.sent++;

        // f. Update Sequence State
        const { data: nextSteps } = await supabase
          .from("follow_up_steps")
          .select("scheduled_at")
          .eq("sequence_id", sequence.id)
          .eq("status", "pending")
          .order("scheduled_at", { ascending: true })
          .limit(1);

        const nextRunAt = nextSteps && nextSteps.length > 0 ? nextSteps[0].scheduled_at : null;
        const sequenceStatus = nextRunAt ? 'active' : 'completed';

        await supabase.from("follow_up_sequences").update({
          current_step: step.step_number,
          next_run_at: nextRunAt,
          status: sequenceStatus,
          updated_at: new Date().toISOString()
        }).eq("id", sequence.id);

      } catch (itemError) {
        console.error(`Error processing step ${step.id}:`, itemError);
        await supabase.from("follow_up_steps").update({ 
          status: 'failed', 
          executed_at: new Date().toISOString(),
          meta: { error: String(itemError) } 
        }).eq("id", step.id);
        summary.failed++;
      }
    }

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
