import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
      .select("*, invoices(*)")
      .eq("status", "pending")
      .lte("scheduled_at", new Date().toISOString())
      .limit(10);

    if (fetchError) throw fetchError;

    const results = [];

    for (const item of (queueItems || [])) {
      try {
        // 2. Queue Locking - mark as processing to prevent duplicates
        const { error: lockError } = await supabase
          .from("escalation_queue")
          .update({ status: "processing", updated_at: new Date().toISOString() })
          .eq("id", item.id)
          .eq("status", "pending");

        if (lockError) continue; // Skip if already being processed

        // 3. Process Action
        if (item.action_type === "send_reminder") {
          // Log to reminder timeline
          await supabase.from("reminder_timeline").insert([{
            invoice_id: item.invoice_id,
            user_id: item.user_id,
            channel: item.action_data?.channel || "whatsapp",
            tone: item.action_data?.tone || "polite",
            delivery_status: "sent",
            reminder_type: "automated",
            message_content: "Automated recovery nudge deployed by system."
          }]);

          // Update Invoice
          await supabase.from("invoices").update({
            last_reminder_sent_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }).eq("id", item.id);
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
