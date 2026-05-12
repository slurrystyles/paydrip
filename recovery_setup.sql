-- =====================================================
-- PAYMENT RECOVERY MANAGEMENT SYSTEM
-- PRODUCTION GRADE SCHEMA
-- Path: /recovery_setup.sql
-- =====================================================

-- =====================================================
-- 0. UPDATED_AT TRIGGER FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 1. ENUM DEFINITIONS
-- =====================================================

DO $$ 
BEGIN

  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'recovery_stage'
  ) THEN
    CREATE TYPE recovery_stage AS ENUM (
      'pending',
      'due_today',
      'gentle_followup',
      'firm_followup',
      'final_notice',
      'legal_warning',
      'recovered',
      'failed'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'reminder_channel'
  ) THEN
    CREATE TYPE reminder_channel AS ENUM (
      'whatsapp',
      'email',
      'sms'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'reminder_tone'
  ) THEN
    CREATE TYPE reminder_tone AS ENUM (
      'polite',
      'firm',
      'final',
      'legal'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'delivery_status'
  ) THEN
    CREATE TYPE delivery_status AS ENUM (
      'pending',
      'sent',
      'delivered',
      'failed'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'queue_status'
  ) THEN
    CREATE TYPE queue_status AS ENUM (
      'pending',
      'processing',
      'processed',
      'cancelled',
      'failed'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'legal_notice_status'
  ) THEN
    CREATE TYPE legal_notice_status AS ENUM (
      'draft',
      'dispatched',
      'delivered',
      'cancelled'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'risk_level'
  ) THEN
    CREATE TYPE risk_level AS ENUM (
      'minimal',
      'low',
      'medium',
      'high',
      'critical'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'event_type'
  ) THEN
    CREATE TYPE event_type AS ENUM (
      'creation',
      'status_change',
      'reminder',
      'payment',
      'recovery_escalation',
      'legal_action',
      'risk_change',
      'system_note'
    );
  END IF;

END $$;

-- =====================================================
-- 2. EXTEND INVOICES TABLE
-- =====================================================

ALTER TABLE public.invoices

ADD COLUMN IF NOT EXISTS recovery_stage recovery_stage
DEFAULT 'pending' NOT NULL,

ADD COLUMN IF NOT EXISTS escalation_level INTEGER
DEFAULT 0 NOT NULL,

ADD COLUMN IF NOT EXISTS next_action_at TIMESTAMPTZ,

ADD COLUMN IF NOT EXISTS days_overdue INTEGER
DEFAULT 0,

ADD COLUMN IF NOT EXISTS last_reminder_sent_at TIMESTAMPTZ,

ADD COLUMN IF NOT EXISTS last_payment_at TIMESTAMPTZ,

ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ
DEFAULT now(),

-- operational safety

ADD COLUMN IF NOT EXISTS is_disputed BOOLEAN
DEFAULT false NOT NULL,

ADD COLUMN IF NOT EXISTS automation_paused BOOLEAN
DEFAULT false NOT NULL,

-- intelligence layer

ADD COLUMN IF NOT EXISTS recovery_probability NUMERIC
DEFAULT 0,

ADD COLUMN IF NOT EXISTS risk_confidence NUMERIC
DEFAULT 0,

ADD COLUMN IF NOT EXISTS ghosting_score NUMERIC
DEFAULT 0,

ADD COLUMN IF NOT EXISTS last_response_at TIMESTAMPTZ,

ADD COLUMN IF NOT EXISTS next_best_action TEXT,

ADD COLUMN IF NOT EXISTS best_contact_window TEXT;

-- =====================================================
-- 3. INVOICE CONSTRAINTS
-- =====================================================

ALTER TABLE public.invoices
ADD CONSTRAINT invoices_recovery_probability_check
CHECK (
  recovery_probability >= 0
  AND recovery_probability <= 100
);

ALTER TABLE public.invoices
ADD CONSTRAINT invoices_risk_confidence_check
CHECK (
  risk_confidence >= 0
  AND risk_confidence <= 100
);

ALTER TABLE public.invoices
ADD CONSTRAINT invoices_ghosting_score_check
CHECK (
  ghosting_score >= 0
  AND ghosting_score <= 100
);

-- =====================================================
-- 4. INVOICE UPDATED_AT TRIGGER
-- =====================================================

DROP TRIGGER IF EXISTS tr_invoices_updated_at
ON public.invoices;

CREATE TRIGGER tr_invoices_updated_at
BEFORE UPDATE
ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================
-- 5. REMINDER TIMELINE
-- =====================================================

DROP TABLE IF EXISTS public.reminder_timeline;

CREATE TABLE public.reminder_timeline (

  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  invoice_id UUID
  REFERENCES public.invoices ON DELETE CASCADE
  NOT NULL,

  user_id UUID
  REFERENCES public.users
  NOT NULL,

  sent_at TIMESTAMPTZ
  DEFAULT now() NOT NULL,

  channel reminder_channel
  DEFAULT 'whatsapp' NOT NULL,

  tone reminder_tone
  DEFAULT 'polite' NOT NULL,

  delivery_status delivery_status
  DEFAULT 'pending' NOT NULL,

  reminder_type TEXT
  DEFAULT 'manual' NOT NULL,

  message_content TEXT,

  user_edits JSONB
  DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ
  DEFAULT now() NOT NULL,

  updated_at TIMESTAMPTZ
  DEFAULT now() NOT NULL
);

CREATE TRIGGER tr_reminder_timeline_updated_at
BEFORE UPDATE
ON public.reminder_timeline
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================
-- 6. ESCALATION RULES
-- =====================================================

DROP TABLE IF EXISTS public.escalation_rules;

CREATE TABLE public.escalation_rules (

  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  user_id UUID
  REFERENCES public.users
  NOT NULL,

  days_after_due INTEGER
  NOT NULL,

  target_stage recovery_stage
  NOT NULL,

  is_auto_escalate BOOLEAN
  DEFAULT false NOT NULL,

  reminder_tone reminder_tone
  DEFAULT 'polite' NOT NULL,

  created_at TIMESTAMPTZ
  DEFAULT now() NOT NULL,

  updated_at TIMESTAMPTZ
  DEFAULT now() NOT NULL,

  UNIQUE(user_id, days_after_due)
);

CREATE TRIGGER tr_escalation_rules_updated_at
BEFORE UPDATE
ON public.escalation_rules
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================
-- 7. CLIENT RISK SCORES
-- =====================================================

DROP TABLE IF EXISTS public.client_risk_scores;

CREATE TABLE public.client_risk_scores (

  client_id UUID
  REFERENCES public.clients ON DELETE CASCADE
  PRIMARY KEY,

  user_id UUID
  REFERENCES public.users
  NOT NULL,

  score NUMERIC
  DEFAULT 0 NOT NULL,

  risk_level risk_level
  DEFAULT 'minimal' NOT NULL,

  metrics JSONB
  DEFAULT '{}'::jsonb,

  last_calculated_at TIMESTAMPTZ
  DEFAULT now() NOT NULL,

  updated_at TIMESTAMPTZ
  DEFAULT now() NOT NULL,

  CONSTRAINT client_risk_score_check
  CHECK (
    score >= 0
    AND score <= 100
  )
);

CREATE TRIGGER tr_client_risk_scores_updated_at
BEFORE UPDATE
ON public.client_risk_scores
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================
-- 8. ESCALATION QUEUE
-- =====================================================

DROP TABLE IF EXISTS public.escalation_queue;

CREATE TABLE public.escalation_queue (

  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  invoice_id UUID
  REFERENCES public.invoices ON DELETE CASCADE
  NOT NULL,

  user_id UUID
  REFERENCES public.users
  NOT NULL,

  scheduled_at TIMESTAMPTZ
  NOT NULL,

  action_type TEXT
  NOT NULL,

  action_data JSONB
  DEFAULT '{}'::jsonb,

  status queue_status
  DEFAULT 'pending' NOT NULL,

  attempt_count INTEGER
  DEFAULT 0 NOT NULL,

  last_error TEXT,

  processed_at TIMESTAMPTZ,

  locked_at TIMESTAMPTZ,

  locked_by TEXT,

  created_at TIMESTAMPTZ
  DEFAULT now() NOT NULL,

  updated_at TIMESTAMPTZ
  DEFAULT now() NOT NULL,

  UNIQUE(invoice_id, scheduled_at, action_type),

  CONSTRAINT escalation_queue_attempts_check
  CHECK (attempt_count >= 0)
);

CREATE TRIGGER tr_escalation_queue_updated_at
BEFORE UPDATE
ON public.escalation_queue
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================
-- 9. LEGAL NOTICES
-- =====================================================

DROP TABLE IF EXISTS public.legal_notices;

CREATE TABLE public.legal_notices (

  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  invoice_id UUID
  REFERENCES public.invoices ON DELETE CASCADE
  NOT NULL,

  user_id UUID
  REFERENCES public.users
  NOT NULL,

  notice_type TEXT
  DEFAULT 'first_warning' NOT NULL,

  dispatched_at TIMESTAMPTZ,

  tracking_number TEXT,

  content_snapshot JSONB
  DEFAULT '{}'::jsonb,

  status legal_notice_status
  DEFAULT 'draft' NOT NULL,

  created_at TIMESTAMPTZ
  DEFAULT now() NOT NULL,

  updated_at TIMESTAMPTZ
  DEFAULT now() NOT NULL
);

CREATE TRIGGER tr_legal_notices_updated_at
BEFORE UPDATE
ON public.legal_notices
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================
-- 10. INVOICE EVENTS
-- =====================================================

DROP TABLE IF EXISTS public.invoice_events;

CREATE TABLE public.invoice_events (

  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  invoice_id UUID
  REFERENCES public.invoices ON DELETE CASCADE
  NOT NULL,

  user_id UUID
  REFERENCES public.users
  NOT NULL,

  event_type event_type
  NOT NULL,

  metadata JSONB
  DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ
  DEFAULT now() NOT NULL
);

-- =====================================================
-- 11. AUTOMATION LOGS
-- =====================================================

DROP TABLE IF EXISTS public.automation_logs;

CREATE TABLE public.automation_logs (

  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  invoice_id UUID
  REFERENCES public.invoices ON DELETE CASCADE,

  queue_id UUID
  REFERENCES public.escalation_queue ON DELETE SET NULL,

  user_id UUID
  REFERENCES public.users,

  log_level TEXT NOT NULL,

  message TEXT NOT NULL,

  metadata JSONB
  DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ
  DEFAULT now() NOT NULL
);

-- =====================================================
-- 12. ENABLE RLS
-- =====================================================

ALTER TABLE public.reminder_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escalation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_risk_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escalation_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 13. RLS POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Users can manage own reminder timeline"
ON public.reminder_timeline;

CREATE POLICY "Users can manage own reminder timeline"
ON public.reminder_timeline
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own escalation rules"
ON public.escalation_rules;

CREATE POLICY "Users can manage own escalation rules"
ON public.escalation_rules
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own client risk scores"
ON public.client_risk_scores;

CREATE POLICY "Users can manage own client risk scores"
ON public.client_risk_scores
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own escalation queue"
ON public.escalation_queue;

CREATE POLICY "Users can manage own escalation queue"
ON public.escalation_queue
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own legal notices"
ON public.legal_notices;

CREATE POLICY "Users can manage own legal notices"
ON public.legal_notices
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own invoice events"
ON public.invoice_events;

CREATE POLICY "Users can view own invoice events"
ON public.invoice_events
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own automation logs"
ON public.automation_logs;

CREATE POLICY "Users can view own automation logs"
ON public.automation_logs
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 14. INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_reminder_timeline_invoice_created
ON public.reminder_timeline(invoice_id, created_at);

CREATE INDEX IF NOT EXISTS idx_reminder_timeline_user_status
ON public.reminder_timeline(user_id, delivery_status);

CREATE INDEX IF NOT EXISTS idx_escalation_queue_user_scheduled
ON public.escalation_queue(user_id, scheduled_at)
WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_escalation_queue_invoice
ON public.escalation_queue(invoice_id);

CREATE INDEX IF NOT EXISTS idx_escalation_queue_locked
ON public.escalation_queue(status, locked_at);

CREATE INDEX IF NOT EXISTS idx_invoice_events_invoice_created
ON public.invoice_events(invoice_id, created_at);

CREATE INDEX IF NOT EXISTS idx_invoice_events_type
ON public.invoice_events(event_type);

CREATE INDEX IF NOT EXISTS idx_automation_logs_invoice
ON public.automation_logs(invoice_id);

CREATE INDEX IF NOT EXISTS idx_automation_logs_queue
ON public.automation_logs(queue_id);

CREATE INDEX IF NOT EXISTS idx_invoices_recovery_analytics
ON public.invoices(user_id, recovery_stage, status);

CREATE INDEX IF NOT EXISTS idx_risk_scores_user_level
ON public.client_risk_scores(user_id, risk_level);

-- =====================================================
-- 15. REALTIME OPTIMIZATION
-- =====================================================

ALTER TABLE public.invoices REPLICA IDENTITY FULL;
ALTER TABLE public.escalation_queue REPLICA IDENTITY FULL;
ALTER TABLE public.reminder_timeline REPLICA IDENTITY FULL;