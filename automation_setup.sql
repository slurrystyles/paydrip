-- RECOVERY AUTOMATION INFRASTRUCTURE
-- Path: /automation_setup.sql

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS net;

-- 2. Procedure to Trigger Edge Function
-- This uses Supabase's 'net' extension to call the edge function via HTTP
CREATE OR REPLACE FUNCTION public.trigger_recovery_queue_processing()
RETURNS void AS $$
BEGIN
  PERFORM
    net.http_post(
      url := 'https://' || (SELECT value FROM auth.secrets WHERE name = 'PROJECT_REF') || '.supabase.co/functions/v1/process-recovery-queue',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT value FROM auth.secrets WHERE name = 'SERVICE_ROLE_KEY')
      ),
      body := '{}'::jsonb
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Schedule Cron Job
-- Runs every minute to process the recovery queue
SELECT cron.schedule(
  'process-recovery-queue-every-minute',
  '* * * * *',
  'SELECT public.trigger_recovery_queue_processing()'
);

-- 4. Automated Queue Population Logic
-- Automatically schedules the next action when an invoice is created or status changes
CREATE OR REPLACE FUNCTION public.schedule_next_recovery_action()
RETURNS TRIGGER AS $$
DECLARE
  v_days_overdue INTEGER;
  v_next_rule RECORD;
BEGIN
  -- Only process for unpaid invoices
  IF NEW.status = 'paid' OR NEW.status = 'draft' THEN
    -- Clear pending queue items if paid
    UPDATE public.escalation_queue 
    SET status = 'cancelled' 
    WHERE invoice_id = NEW.id AND status = 'pending';
    RETURN NEW;
  END IF;

  v_days_overdue := EXTRACT(DAY FROM (now() - NEW.due_date))::INTEGER;
  
  -- Find the best matching escalation rule for the current duration
  SELECT * INTO v_next_rule
  FROM public.escalation_rules
  WHERE user_id = NEW.user_id 
    AND days_after_due > v_days_overdue
    AND is_auto_escalate = true
  ORDER BY days_after_due ASC
  LIMIT 1;

  IF FOUND THEN
    -- Schedule the next action
    INSERT INTO public.escalation_queue (
      invoice_id,
      user_id,
      scheduled_at,
      action_type,
      action_data
    ) VALUES (
      NEW.id,
      NEW.user_id,
      NEW.due_date + (v_next_rule.days_after_due * interval '1 day'),
      'send_reminder',
      jsonb_build_object(
        'tone', v_next_rule.reminder_tone,
        'target_stage', v_next_rule.target_stage,
        'channel', 'whatsapp'
      )
    )
    ON CONFLICT (invoice_id, scheduled_at, action_type) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Attach Triggers
DROP TRIGGER IF EXISTS tr_schedule_recovery ON public.invoices;
CREATE TRIGGER tr_schedule_recovery
  AFTER INSERT OR UPDATE OF status, due_date ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.schedule_next_recovery_action();

-- 6. Helper to manually trigger recalc for all active invoices
CREATE OR REPLACE FUNCTION public.recalculate_all_recovery_queues()
RETURNS void AS $$
BEGIN
  UPDATE public.invoices 
  SET updated_at = now() 
  WHERE status = 'overdue';
END;
$$ LANGUAGE plpgsql;
