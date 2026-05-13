-- =========================================================
-- RECOVERY AUTOMATION INFRASTRUCTURE (CORRECTED)
-- Multi-Tenant + Hardened Version
-- =========================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- =========================================================
-- REMOVE OLD CRON JOB IF EXISTS
-- =========================================================

DO $$
DECLARE
v_job_id BIGINT;
BEGIN
SELECT jobid
INTO v_job_id
FROM cron.job
WHERE jobname = 'process-recovery-queue-every-minute';

```
IF v_job_id IS NOT NULL THEN
    PERFORM cron.unschedule(v_job_id);
END IF;
```

END $$;

-- =========================================================
-- EDGE FUNCTION TRIGGER
-- =========================================================

CREATE OR REPLACE FUNCTION public.trigger_recovery_queue_processing()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
v_project_ref TEXT;
v_service_role_key TEXT;
BEGIN

```
-- safer config lookup
SELECT decrypted_secret
INTO v_project_ref
FROM vault.decrypted_secrets
WHERE name = 'PROJECT_REF'
LIMIT 1;

SELECT decrypted_secret
INTO v_service_role_key
FROM vault.decrypted_secrets
WHERE name = 'SERVICE_ROLE_KEY'
LIMIT 1;

IF v_project_ref IS NULL OR v_service_role_key IS NULL THEN
    RAISE EXCEPTION 'Missing required secrets';
END IF;

PERFORM net.http_post(
    url := format(
        'https://%s.supabase.co/functions/v1/process-recovery-queue',
        v_project_ref
    ),

    headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_service_role_key
    ),

    body := jsonb_build_object(
        'source', 'pg_cron',
        'triggered_at', now()
    )
);
```

END;
$$;

-- =========================================================
-- CRON SCHEDULE
-- =========================================================

SELECT cron.schedule(
'process-recovery-queue-every-minute',
'* * * * *',
$$SELECT public.trigger_recovery_queue_processing();$$
);

-- =========================================================
-- RECOVERY SCHEDULER
-- =========================================================

CREATE OR REPLACE FUNCTION public.schedule_next_recovery_action()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
v_days_overdue INTEGER;
v_next_rule RECORD;
BEGIN

```
-- prevent null org leakage
IF NEW.organization_id IS NULL THEN
    RETURN NEW;
END IF;

-- cancel pending actions if invoice closed
IF NEW.status IN ('paid', 'draft', 'cancelled') THEN

    UPDATE public.escalation_queue
    SET
        status = 'cancelled',
        updated_at = now()
    WHERE
        invoice_id = NEW.id
        AND status = 'pending';

    RETURN NEW;
END IF;

-- prevent invalid due dates
IF NEW.due_date IS NULL THEN
    RETURN NEW;
END IF;

v_days_overdue := GREATEST(
    EXTRACT(
        DAY FROM (now() - NEW.due_date)
    )::INTEGER,
    0
);

-- org-aware escalation resolution
SELECT *
INTO v_next_rule
FROM public.escalation_rules
WHERE
    organization_id = NEW.organization_id
    AND is_auto_escalate = true
    AND days_after_due > v_days_overdue
ORDER BY days_after_due ASC
LIMIT 1;

IF FOUND THEN

    INSERT INTO public.escalation_queue (
        organization_id,
        invoice_id,
        user_id,
        scheduled_at,
        action_type,
        action_data,
        status,
        created_at
    )
    VALUES (
        NEW.organization_id,
        NEW.id,
        NEW.user_id,

        NEW.due_date +
        (v_next_rule.days_after_due * interval '1 day'),

        'send_reminder',

        jsonb_build_object(
            'tone', v_next_rule.reminder_tone,
            'target_stage', v_next_rule.target_stage,
            'channel', 'whatsapp'
        ),

        'pending',
        now()
    )

    ON CONFLICT (
        invoice_id,
        scheduled_at,
        action_type
    )
    DO NOTHING;

END IF;

RETURN NEW;
```

END;
$$;

-- =========================================================
-- RECREATE TRIGGER SAFELY
-- =========================================================

DROP TRIGGER IF EXISTS tr_schedule_recovery
ON public.invoices;

CREATE TRIGGER tr_schedule_recovery
AFTER INSERT OR UPDATE OF status, due_date
ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.schedule_next_recovery_action();

-- =========================================================
-- MANUAL RECALC
-- =========================================================

CREATE OR REPLACE FUNCTION public.recalculate_all_recovery_queues()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN

```
UPDATE public.invoices
SET updated_at = now()
WHERE
    status = 'overdue'
    AND organization_id IS NOT NULL;
```

END;
$$;
