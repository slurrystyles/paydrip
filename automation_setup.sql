-- RECOVERY AUTOMATION INFRASTRUCTURE
-- Path: /automation_setup.sql

-- =====================================================
-- 1. ENABLE REQUIRED EXTENSIONS
-- =====================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;



-- =====================================================
-- 4. AUTOMATED QUEUE POPULATION LOGIC
-- =====================================================

CREATE OR REPLACE FUNCTION public.schedule_next_recovery_action()
RETURNS TRIGGER AS $$
DECLARE
  v_days_overdue INTEGER;
  v_next_rule RECORD;
  v_next_schedule_time TIMESTAMPTZ;
BEGIN

  -- ============================================
  -- EXIT CONDITIONS
  -- ============================================

  IF NEW.status IN ('paid', 'draft') THEN

    UPDATE public.escalation_queue
    SET status = 'cancelled',
        updated_at = now()
    WHERE invoice_id = NEW.id
      AND status = 'pending';

    RETURN NEW;
  END IF;

  IF NEW.is_disputed = true
     OR NEW.automation_paused = true THEN
    RETURN NEW;
  END IF;

  IF NEW.due_date > now() THEN
    RETURN NEW;
  END IF;

  -- ============================================
  -- CALCULATE OVERDUE DAYS
  -- ============================================

  v_days_overdue :=
    GREATEST(
      EXTRACT(DAY FROM (now() - NEW.due_date))::INTEGER,
      0
    );

  -- ============================================
  -- UPDATE INVOICE METRICS
  -- ============================================

  NEW.days_overdue = v_days_overdue;

  -- ============================================
  -- CANCEL EXISTING PENDING QUEUE ITEMS
  -- ============================================

  UPDATE public.escalation_queue
  SET status = 'cancelled',
      updated_at = now()
  WHERE invoice_id = NEW.id
    AND status = 'pending';

  -- ============================================
  -- FIND NEXT ESCALATION RULE
  -- ============================================

  SELECT *
  INTO v_next_rule
  FROM public.escalation_rules
  WHERE user_id = NEW.user_id
    AND days_after_due > v_days_overdue
    AND is_auto_escalate = true
  ORDER BY days_after_due ASC
  LIMIT 1;

  -- ============================================
  -- SCHEDULE NEXT ACTION
  -- ============================================

  IF FOUND THEN

    v_next_schedule_time :=
      NEW.due_date
      + (v_next_rule.days_after_due * interval '1 day');

    INSERT INTO public.escalation_queue (
      invoice_id,
      user_id,
      scheduled_at,
      action_type,
      action_data,
      status,
      created_at,
      updated_at
    )
    VALUES (
      NEW.id,
      NEW.user_id,
      v_next_schedule_time,
      'send_reminder',

      jsonb_build_object(
        'tone', v_next_rule.reminder_tone,
        'target_stage', v_next_rule.target_stage,
        'channel', 'whatsapp',
        'days_overdue', v_days_overdue
      ),

      'pending',
      now(),
      now()
    )

    ON CONFLICT (
      invoice_id,
      scheduled_at,
      action_type
    )
    DO NOTHING;

    NEW.next_action_at = v_next_schedule_time;

  END IF;

  -- ============================================
  -- AUTO RECOVERY STAGE UPDATES
  -- ============================================

  IF v_days_overdue = 0 THEN
    NEW.recovery_stage = 'due_today';

  ELSIF v_days_overdue BETWEEN 1 AND 6 THEN
    NEW.recovery_stage = 'gentle_followup';

  ELSIF v_days_overdue BETWEEN 7 AND 13 THEN
    NEW.recovery_stage = 'firm_followup';

  ELSIF v_days_overdue BETWEEN 14 AND 20 THEN
    NEW.recovery_stage = 'final_notice';

  ELSIF v_days_overdue >= 21 THEN
    NEW.recovery_stage = 'legal_warning';

  END IF;

  RETURN NEW;

END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 5. ATTACH TRIGGERS
-- =====================================================

DROP TRIGGER IF EXISTS tr_schedule_recovery
ON public.invoices;

CREATE TRIGGER tr_schedule_recovery
BEFORE INSERT OR UPDATE OF
  status,
  due_date,
  is_disputed,
  automation_paused
ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.schedule_next_recovery_action();

-- =====================================================
-- 6. RECALCULATE ALL ACTIVE RECOVERY QUEUES
-- =====================================================

CREATE OR REPLACE FUNCTION public.recalculate_all_recovery_queues()
RETURNS void AS $$
BEGIN

  -- cancel all pending jobs first

  UPDATE public.escalation_queue
  SET status = 'cancelled',
      updated_at = now()
  WHERE status = 'pending';

  -- force invoice trigger recalculation

  UPDATE public.invoices
  SET updated_at = now()
  WHERE status != 'paid'
    AND status != 'draft';

END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. HELPFUL INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_escalation_queue_pending_jobs
ON public.escalation_queue(status, scheduled_at)
WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_escalation_queue_invoice_status
ON public.escalation_queue(invoice_id, status);

CREATE INDEX IF NOT EXISTS idx_invoices_recovery_flags
ON public.invoices(
  recovery_stage,
  is_disputed,
  automation_paused
);

-- =====================================================
-- 8. COMMENTS
-- =====================================================

COMMENT ON FUNCTION public.schedule_next_recovery_action IS
'Automatically schedules invoice recovery escalations and reminder workflows.';

