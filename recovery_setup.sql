-- PAYMENT RECOVERY MANAGEMENT SYSTEM - PRODUCTION GRADE SCHEMA
-- Path: /recovery_setup.sql

-- 0. Universal Updated At Trigger Function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. ENUM DEFINITIONS
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'recovery_stage') THEN
    CREATE TYPE recovery_stage AS ENUM ('pending', 'due_today', 'gentle_followup', 'firm_followup', 'final_notice', 'legal_warning', 'recovered', 'failed');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reminder_channel') THEN
    CREATE TYPE reminder_channel AS ENUM ('whatsapp', 'email', 'sms');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reminder_tone') THEN
    CREATE TYPE reminder_tone AS ENUM ('polite', 'firm', 'final', 'legal');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'delivery_status') THEN
    CREATE TYPE delivery_status AS ENUM ('pending', 'sent', 'delivered', 'failed');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'queue_status') THEN
    CREATE TYPE queue_status AS ENUM ('pending', 'processing', 'processed', 'cancelled', 'failed');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'legal_notice_status') THEN
    CREATE TYPE legal_notice_status AS ENUM ('draft', 'dispatched', 'delivered', 'cancelled');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'risk_level') THEN
    CREATE TYPE risk_level AS ENUM ('minimal', 'low', 'medium', 'high', 'critical');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'event_type') THEN
    CREATE TYPE event_type AS ENUM ('creation', 'status_change', 'reminder', 'payment', 'recovery_escalation', 'legal_action', 'risk_change', 'system_note');
  END IF;
END $$;

-- 2. EXTEND INVOICES TABLE
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS recovery_stage recovery_stage DEFAULT 'pending' NOT NULL,
ADD COLUMN IF NOT EXISTS escalation_level INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS next_action_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS days_overdue INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_reminder_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_payment_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS is_disputed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS automation_paused BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Trigger for invoices
DROP TRIGGER IF EXISTS tr_invoices_updated_at ON public.invoices;
CREATE TRIGGER tr_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 3. REMINDER TIMELINE
DROP TABLE IF EXISTS public.reminder_timeline;
CREATE TABLE public.reminder_timeline (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID REFERENCES public.invoices ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  channel reminder_channel DEFAULT 'whatsapp' NOT NULL,
  tone reminder_tone DEFAULT 'polite' NOT NULL,
  delivery_status delivery_status DEFAULT 'pending' NOT NULL,
  reminder_type TEXT DEFAULT 'manual' NOT NULL, -- manual, automated
  message_content TEXT,
  user_edits JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

CREATE TRIGGER tr_reminder_timeline_updated_at BEFORE UPDATE ON public.reminder_timeline FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 4. ESCALATION RULES
DROP TABLE IF EXISTS public.escalation_rules;
CREATE TABLE public.escalation_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users NOT NULL,
  days_after_due INTEGER NOT NULL,
  target_stage recovery_stage NOT NULL,
  is_auto_escalate BOOLEAN DEFAULT false NOT NULL,
  reminder_tone reminder_tone DEFAULT 'polite' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(user_id, days_after_due)
);

CREATE TRIGGER tr_escalation_rules_updated_at BEFORE UPDATE ON public.escalation_rules FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 5. CLIENT RISK SCORES
DROP TABLE IF EXISTS public.client_risk_scores;
CREATE TABLE public.client_risk_scores (
  client_id UUID REFERENCES public.clients ON DELETE CASCADE PRIMARY KEY,
  user_id UUID REFERENCES public.users NOT NULL,
  score NUMERIC DEFAULT 0 NOT NULL,
  risk_level risk_level DEFAULT 'minimal' NOT NULL,
  metrics JSONB DEFAULT '{}'::jsonb,
  last_calculated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

CREATE TRIGGER tr_client_risk_scores_updated_at BEFORE UPDATE ON public.client_risk_scores FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 6. ESCALATION QUEUE
DROP TABLE IF EXISTS public.escalation_queue;
CREATE TABLE public.escalation_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID REFERENCES public.invoices ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users NOT NULL,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  action_type TEXT NOT NULL, -- send_reminder, change_stage, legal_warning
  action_data JSONB DEFAULT '{}'::jsonb,
  status queue_status DEFAULT 'pending' NOT NULL,
  attempt_count INTEGER DEFAULT 0 NOT NULL,
  last_error TEXT,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(invoice_id, scheduled_at, action_type)
);

CREATE TRIGGER tr_escalation_queue_updated_at BEFORE UPDATE ON public.escalation_queue FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 7. LEGAL NOTICES
DROP TABLE IF EXISTS public.legal_notices;
CREATE TABLE public.legal_notices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID REFERENCES public.invoices ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users NOT NULL,
  notice_type TEXT DEFAULT 'first_warning' NOT NULL,
  dispatched_at TIMESTAMP WITH TIME ZONE,
  tracking_number TEXT,
  content_snapshot JSONB DEFAULT '{}'::jsonb,
  status legal_notice_status DEFAULT 'draft' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

CREATE TRIGGER tr_legal_notices_updated_at BEFORE UPDATE ON public.legal_notices FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 8. INVOICE EVENTS (System Trail)
DROP TABLE IF EXISTS public.invoice_events;
CREATE TABLE public.invoice_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID REFERENCES public.invoices ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users NOT NULL,
  event_type event_type NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- RLS POLICIES (WITH CHECK CLAUSES)

ALTER TABLE public.reminder_timeline ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own reminder timeline" ON public.reminder_timeline;
CREATE POLICY "Users can manage own reminder timeline" ON public.reminder_timeline
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.escalation_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own escalation rules" ON public.escalation_rules;
CREATE POLICY "Users can manage own escalation rules" ON public.escalation_rules
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.client_risk_scores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own client risk scores" ON public.client_risk_scores;
CREATE POLICY "Users can manage own client risk scores" ON public.client_risk_scores
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.escalation_queue ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own escalation queue" ON public.escalation_queue;
CREATE POLICY "Users can manage own escalation queue" ON public.escalation_queue
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.legal_notices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own legal notices" ON public.legal_notices;
CREATE POLICY "Users can manage own legal notices" ON public.legal_notices
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.invoice_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own invoice events" ON public.invoice_events;
CREATE POLICY "Users can view own invoice events" ON public.invoice_events
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- OPTIMIZED INDEXES
CREATE INDEX IF NOT EXISTS idx_reminder_timeline_invoice_created ON public.reminder_timeline(invoice_id, created_at);
CREATE INDEX IF NOT EXISTS idx_reminder_timeline_user_status ON public.reminder_timeline(user_id, delivery_status);

CREATE INDEX IF NOT EXISTS idx_escalation_queue_user_scheduled ON public.escalation_queue(user_id, scheduled_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_escalation_queue_invoice ON public.escalation_queue(invoice_id);

CREATE INDEX IF NOT EXISTS idx_invoice_events_invoice_created ON public.invoice_events(invoice_id, created_at);
CREATE INDEX IF NOT EXISTS idx_invoice_events_type ON public.invoice_events(event_type);

CREATE INDEX IF NOT EXISTS idx_invoices_recovery_analytics ON public.invoices(user_id, recovery_stage, status);
CREATE INDEX IF NOT EXISTS idx_risk_scores_user_level ON public.client_risk_scores(user_id, risk_level);
