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

        // c. Fetch Template and Configuration
        const clientSnapshot = invoice.snapshot_json || {};
        const clientName = clientSnapshot.name || 'Valued Client';
        const clientEmail = clientSnapshot.email;
        const businessName = invoice.business_name || "Paydrip Merchant";
        const amount = invoice.amount;
        const dueDate = new Date(invoice.due_date).toLocaleDateString();
        const daysOverdue = Math.max(0, Math.floor((new Date().getTime() - new Date(invoice.due_date).getTime()) / (1000 * 60 * 60 * 24)));
        const appUrl = Deno.env.get("APP_URL") || `https://${PROJECT_REF}.supabase.co`;
        const paymentLink = `${appUrl}/pay/${invoice.public_token}`;

        if (!clientEmail) {
          await supabase.from("follow_up_steps").update({ status: 'failed', executed_at: new Date().toISOString(), meta: { error: 'client_email_missing' } }).eq("id", step.id);
          summary.failed++;
          continue;
        }

        // Fetch template from DB
        const { data: template } = await supabase.rpc('get_template_for_invoice', {
          p_org_id: organizationId,
          p_template_type: step.template_type
        }).single();

        let emailContent = null;
        let subject = null;
        let usedAi = false;

        // Logic for using template vs AI
        const isCustomTemplate = template && template.organization_id !== null;
        
        if (isCustomTemplate) {
          // Use custom template directly
          const variables = {
            client_name: clientName,
            invoice_number: invoice.invoice_number,
            amount: `₹${amount}`,
            due_date: dueDate,
            days_overdue: daysOverdue.toString(),
            payment_link: paymentLink,
            business_name: businessName
          };

          const { data: renderedBody } = await supabase.rpc('render_template', {
            p_template_body: template.body_html,
            p_variables: variables
          });

          const { data: renderedSubject } = await supabase.rpc('render_template', {
            p_template_body: template.subject,
            p_variables: variables
          });

          emailContent = renderedBody;
          subject = renderedSubject;
          
          // Log template usage
          await supabase.from('audit_log').insert({
            organization_id: organizationId,
            audit_type: 'template_used',
            entity_id: template.id,
            entity_type: 'email_template',
            meta: { template_id: template.id, template_name: template.name, template_type: template.template_type }
          });
        } else if (GEMINI_API_KEY) {
          // Use AI generation with template as context
          try {
            usedAi = true;
            const baseTemplate = template ? template.body_html : "Professional reminder";
            const systemPrompt = `You are a professional payment recovery assistant for ${businessName}. 
            Generate a ${step.template_type} email for ${clientName} regarding invoice #${invoice.invoice_number} for ₹${amount}, due on ${dueDate} (${daysOverdue} days overdue). 
            Base your style on this template: ${baseTemplate}.
            Keep it under 150 words. Be professional, not aggressive. 
            Return only the email body as HTML, no subject line. 
            Include this link for payment: ${paymentLink}`;
            
            const aiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${GEMINI_API_KEY}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ contents: [{ parts: [{ text: systemPrompt }] }] })
            });
            const aiData = await aiRes.json();
            emailContent = aiData.candidates?.[0]?.content?.parts?.[0]?.text;
            
            // Log AI generation
            await supabase.from('audit_log').insert({
              organization_id: organizationId,
              audit_type: 'ai_template_generated',
              entity_id: invoice.id,
              entity_type: 'invoice',
              meta: { step_type: step.template_type, model: 'gemini-3-flash-preview' }
            });
          } catch (e) {
            console.error("Gemini failed, using fallback:", e);
          }
        }

        // Use fallback if all else fails
        if (!emailContent) {
          const fallback = getEmailTemplate(step.template_type, {
            businessName,
            invoiceNumber: invoice.invoice_number,
            amount: amount.toString(),
            dueDate,
            clientName,
            publicLink: paymentLink
          });
          emailContent = fallback.html;
          subject = fallback.subject;
        }

        if (!subject) {
          subject = `${step.template_type.replace('_', ' ').toUpperCase()}: Invoice #${invoice.invoice_number}`;
        }

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
