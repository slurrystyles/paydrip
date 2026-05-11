-- PAYMENT RECOVERY MANAGEMENT SYSTEM SETUP
-- Path: /recovery_setup.sql

-- 1. Enum for Recovery Stages
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'recovery_stage') THEN
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
END $$;

-- 2. Extend Invoices Table with Recovery Columns
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS recovery_stage recovery_stage DEFAULT 'pending' NOT NULL,
ADD COLUMN IF NOT EXISTS escalation_level INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS next_action_at TIMESTAMP WITH TIME ZONE;

-- 3. Reminder Timeline (Detailed Version)
CREATE TABLE IF NOT EXISTS public.reminder_timeline (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID REFERENCES public.invoices ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  channel TEXT DEFAULT 'whatsapp' NOT NULL, -- whatsapp, email, sms
  tone TEXT DEFAULT 'polite' NOT NULL, -- polite, firm, final, legal
  delivery_status TEXT DEFAULT 'sent' NOT NULL, -- pending, sent, failed
  reminder_type TEXT DEFAULT 'manual' NOT NULL, -- automated, manual
  message_content TEXT,
  user_edits JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Escalation Rules
CREATE TABLE IF NOT EXISTS public.escalation_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users NOT NULL,
  days_after_due INTEGER NOT NULL,
  target_stage recovery_stage NOT NULL,
  is_auto_escalate BOOLEAN DEFAULT false NOT NULL,
  reminder_tone TEXT DEFAULT 'polite',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, days_after_due)
);

-- 5. Client Risk Scores
CREATE TABLE IF NOT EXISTS public.client_risk_scores (
  client_id UUID REFERENCES public.clients ON DELETE CASCADE PRIMARY KEY,
  user_id UUID REFERENCES public.users NOT NULL,
  score NUMERIC DEFAULT 0 NOT NULL, -- 0 to 100
  risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high')) DEFAULT 'low' NOT NULL,
  metrics JSONB DEFAULT '{}'::jsonb,
  last_calculated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Escalation Queue
CREATE TABLE IF NOT EXISTS public.escalation_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID REFERENCES public.invoices ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users NOT NULL,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  action_type TEXT NOT NULL, -- send_reminder, change_stage
  action_data JSONB DEFAULT '{}'::jsonb,
  status TEXT CHECK (status IN ('pending', 'processed', 'cancelled', 'failed')) DEFAULT 'pending' NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Legal Notices
CREATE TABLE IF NOT EXISTS public.legal_notices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID REFERENCES public.invoices ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users NOT NULL,
  notice_type TEXT DEFAULT 'first_warning' NOT NULL,
  dispatched_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  tracking_number TEXT,
  content TEXT,
  status TEXT DEFAULT 'draft' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ENABLE RLS
ALTER TABLE public.reminder_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escalation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_risk_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escalation_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_notices ENABLE ROW LEVEL SECURITY;

-- POLICIES

-- Reminder Timeline
CREATE POLICY "Users can manage own reminder timeline" ON public.reminder_timeline
  FOR ALL USING (auth.uid() = user_id);

-- Escalation Rules
CREATE POLICY "Users can manage own escalation rules" ON public.escalation_rules
  FOR ALL USING (auth.uid() = user_id);

-- Risk Scores
CREATE POLICY "Users can view own client risk scores" ON public.client_risk_scores
  FOR SELECT USING (auth.uid() = user_id);

-- Escalation Queue
CREATE POLICY "Users can manage own escalation queue" ON public.escalation_queue
  FOR ALL USING (auth.uid() = user_id);

-- Legal Notices
CREATE POLICY "Users can manage own legal notices" ON public.legal_notices
  FOR ALL USING (auth.uid() = user_id);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_reminder_timeline_invoice ON public.reminder_timeline(invoice_id);
CREATE INDEX IF NOT EXISTS idx_escalation_queue_scheduled ON public.escalation_queue(scheduled_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_invoices_recovery_stage ON public.invoices(recovery_stage);
CREATE INDEX IF NOT EXISTS idx_risk_scores_user ON public.client_risk_scores(user_id);

-- SEED DATA: Default Escalation Rules for new users
-- This can be handled in application logic or via trigger
