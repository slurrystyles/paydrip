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

    // 1. Fetch pending queue items that are due
    const { data: queueItems, error: fetchError } = await supabase
      .from("escalation_queue")
      .select("*, invoices(*, client_id(name, email), businesses(name))")
      .eq("status", "pending")
      .lte("scheduled_at", new Date().toISOString())
      .limit(10);

    if (fetchError) throw fetchError;

    const results = [];

    for (const item of (queueItems || [])) {
      try {
        // 2. Queue Locking - mark as processing
        const { error: lockError } = await supabase
          .from("escalation_queue")
          .update({ status: "processing", updated_at: new Date().toISOString() })
          .eq("id", item.id)
          .eq("status", "pending");

        if (lockError) continue;

        const invoice = item.invoices;
        const client = invoice?.client_id;
        const business = invoice?.businesses;

        // 3. Process Action
        if (item.action_type === "send_reminder") {
          const tone = item.action_data?.tone || "polite";
          let aiMessage = null;

          // A. AI Generation Step (Optional branch)
          if (GEMINI_API_KEY) {
            try {
              const prompt = `Generate a ${tone} reminder for ${client?.name} for invoice #${invoice.invoice_number} of amount ₹${invoice.amount}. Business: ${business?.name}. Keep it short. Output JSON: {"message": "..."}`;
              const aiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
              });
              const aiData = await aiRes.json();
              const text = aiData.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
              const cleanText = text.replace(/```json|```/g, "").trim();
              aiMessage = JSON.parse(cleanText).message;
            } catch (e) {
              console.error("AI Generation failed in worker:", e);
            }
          }

          // B. Delivery Step
          const deliveryChannel = invoice.delivery_channel || 'email';
          const channels = deliveryChannel === 'both' ? ['email', 'sms'] : [deliveryChannel];

          for (const channel of channels) {
            if (channel === 'email' && client?.email) {
              const templateType = tone === 'polite' ? 'reminder_polite' : tone === 'firm' ? 'reminder_firm' : 'reminder_final';
              const publicLink = `https://${PROJECT_REF}.supabase.co/pay/${invoice.public_token}`;
              
              const template = getEmailTemplate(templateType, {
                businessName: business?.name || "Paydrip Merchant",
                invoiceNumber: invoice.invoice_number,
                amount: invoice.amount.toString(),
                dueDate: new Date(invoice.due_date).toLocaleDateString(),
                publicLink,
                clientName: client.name || "Client",
                customMessage: aiMessage
              });

              await fetch(`https://${PROJECT_REF}.supabase.co/functions/v1/send-email`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${SERVICE_ROLE_KEY}`
                },
                body: JSON.stringify({
                  to: client.email,
                  subject: template.subject,
                  html: template.html,
                  invoice_id: invoice.id,
                  type: templateType,
                  organization_id: invoice.organization_id
                })
              }).catch(e => console.error("Email trigger failed:", e));
            }

            if (channel === 'sms' && invoice.snapshot_json?.phone) {
              const publicLink = `https://${PROJECT_REF}.supabase.co/pay/${invoice.public_token}`;
              let smsBody = `Reminder: Invoice #${invoice.invoice_number} for ₹${invoice.amount} is due. Link: ${publicLink}`;
              
              if (aiMessage) {
                smsBody = `${aiMessage} Link: ${publicLink}`;
              }

              await fetch(`https://${PROJECT_REF}.supabase.co/functions/v1/send-sms`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${SERVICE_ROLE_KEY}`
                },
                body: JSON.stringify({
                  to: invoice.snapshot_json.phone,
                  body: smsBody,
                  invoice_id: invoice.id,
                  organization_id: invoice.organization_id
                })
              }).catch(e => console.error("SMS trigger failed:", e));
            }
          }

          // C. Log to timeline
          await supabase.from("reminder_timeline").insert([{
            invoice_id: item.invoice_id,
            user_id: item.user_id,
            channel: deliveryChannel === 'both' ? 'sms' : (deliveryChannel as any), // Log primary channel or just one if both
            tone: tone,
            delivery_status: "sent",
            reminder_type: "automated",
            message_content: aiMessage || "Automated reminder sent."
          }]);

          // Update Invoice
          await supabase.from("invoices").update({
            last_reminder_sent_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }).eq("id", item.invoice_id);
        }

        if (item.action_type === "change_stage") {
          await supabase.from("invoices").update({
            recovery_stage: item.action_data?.target_stage,
            escalation_level: item.action_data?.escalation_level || 1,
            updated_at: new Date().toISOString()
          }).eq("id", item.invoice_id);
        }

        // 4. Log Event
        await supabase.from("invoice_events").insert([{
          invoice_id: item.invoice_id,
          user_id: item.user_id,
          event_type: "system_note",
          metadata: { 
            action: item.action_type, 
            queue_item_id: item.id, 
            status: "success" 
          }
        }]);

        // 5. Mark as processed
        await supabase
          .from("escalation_queue")
          .update({ 
            status: "processed", 
            processed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq("id", item.id);

        // 6. Usage Metering: Increment automation count
        await supabase.rpc('security.increment_usage', {
          p_user_id: item.user_id,
          p_metric: 'automations_processed',
          p_amount: 1
        });

        results.push({ id: item.id, status: "success" });

      } catch (itemError) {
        console.error(`Error processing item ${item.id}:`, itemError);
        
        // 7. Handle Retries & Dead Letter Queue
        const newAttemptCount = (item.attempt_count || 0) + 1;
        const isPoisonJob = itemError instanceof Error && itemError.message.includes('poison');
        
        if (newAttemptCount >= 3 || isPoisonJob) {
          // Move to Dead Letter Queue
          await supabase.from("dead_letter_queue").insert([{
            original_queue_id: item.id,
            user_id: item.user_id,
            action_type: item.action_type,
            payload: item.action_data,
            last_error: itemError instanceof Error ? itemError.message : String(itemError),
            failure_reason: isPoisonJob ? 'poison_job' : 'max_retries'
          }]);

          await supabase.from("escalation_queue").update({ 
            status: "failed",
            updated_at: new Date().toISOString()
          }).eq("id", item.id);
        } else {
          await supabase
            .from("escalation_queue")
            .update({ 
              status: "pending",
              attempt_count: newAttemptCount,
              last_error: itemError instanceof Error ? itemError.message : String(itemError),
              updated_at: new Date().toISOString()
            })
            .eq("id", item.id);
        }

        results.push({ id: item.id, status: "error", error: itemError });
      }
    }

    return new Response(JSON.stringify({ processed: results.length, details: results }), {
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
