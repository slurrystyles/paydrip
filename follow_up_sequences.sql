-- FOLLOW-UP SEQUENCES INFRASTRUCTURE
-- Path: /follow_up_sequences.sql

-- 1. Create Tables
CREATE TABLE IF NOT EXISTS public.follow_up_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('active', 'paused', 'completed', 'cancelled')) DEFAULT 'active',
  current_step INTEGER DEFAULT 0,
  next_run_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.follow_up_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id UUID REFERENCES public.follow_up_sequences(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  type TEXT CHECK (type IN ('email', 'whatsapp_prompt', 'internal_flag')) NOT NULL,
  template_type TEXT CHECK (template_type IN ('reminder_polite', 'reminder_firm', 'reminder_final')) NOT NULL,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  executed_at TIMESTAMP WITH TIME ZONE,
  status TEXT CHECK (status IN ('pending', 'sent', 'failed', 'skipped')) DEFAULT 'pending',
  meta JSONB DEFAULT '{}'
);

-- 2. Enable RLS
ALTER TABLE public.follow_up_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follow_up_steps ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies (using memberships table)
CREATE POLICY "Users can access own organization's sequences" ON public.follow_up_sequences
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM public.memberships WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can access own organization's steps" ON public.follow_up_steps
  FOR ALL USING (
    sequence_id IN (
      SELECT id FROM public.follow_up_sequences WHERE organization_id IN (
        SELECT organization_id FROM public.memberships WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_follow_up_seq_invoice ON public.follow_up_sequences(invoice_id);
CREATE INDEX IF NOT EXISTS idx_follow_up_seq_org ON public.follow_up_sequences(organization_id);
CREATE INDEX IF NOT EXISTS idx_follow_up_seq_next_run ON public.follow_up_sequences(next_run_at) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_follow_up_steps_seq ON public.follow_up_steps(sequence_id);
CREATE INDEX IF NOT EXISTS idx_follow_up_steps_scheduled ON public.follow_up_steps(scheduled_at) WHERE status = 'pending';

-- 5. Helper Functions
CREATE OR REPLACE FUNCTION public.create_follow_up_sequence(p_invoice_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invoice RECORD;
  v_sequence_id UUID;
  v_now TIMESTAMP WITH TIME ZONE := now();
BEGIN
  -- Fetch invoice details
  SELECT id, organization_id, due_date, status, snapshot_json 
  INTO v_invoice 
  FROM public.invoices 
  WHERE id = p_invoice_id;

  IF NOT FOUND THEN RETURN; END IF;
  
  -- If invoice already paid, don't create sequence
  IF v_invoice.status = 'paid' THEN RETURN; END IF;

  -- Create Main Sequence
  INSERT INTO public.follow_up_sequences (
    organization_id,
    invoice_id,
    status,
    next_run_at
  ) VALUES (
    v_invoice.organization_id,
    v_invoice.id,
    'active',
    NULL -- Will be updated after steps are added
  ) RETURNING id INTO v_sequence_id;

  -- Create Steps
  -- Step 1: reminder_polite : due_date - 3 days
  IF v_invoice.due_date - interval '3 days' > v_now THEN
    INSERT INTO public.follow_up_steps (sequence_id, step_number, type, template_type, scheduled_at)
    VALUES (v_sequence_id, 1, 'email', 'reminder_polite', v_invoice.due_date - interval '3 days');
  END IF;

  -- Step 2: reminder_polite : due_date + 1 day
  INSERT INTO public.follow_up_steps (sequence_id, step_number, type, template_type, scheduled_at)
  VALUES (v_sequence_id, 2, 'email', 'reminder_polite', v_invoice.due_date + interval '1 day');

  -- Step 3: reminder_firm : due_date + 5 days
  INSERT INTO public.follow_up_steps (sequence_id, step_number, type, template_type, scheduled_at)
  VALUES (v_sequence_id, 3, 'email', 'reminder_firm', v_invoice.due_date + interval '5 days');

  -- Step 4: reminder_firm : due_date + 10 days
  INSERT INTO public.follow_up_steps (sequence_id, step_number, type, template_type, scheduled_at)
  VALUES (v_sequence_id, 4, 'email', 'reminder_firm', v_invoice.due_date + interval '10 days');

  -- Step 5: reminder_final : due_date + 20 days
  INSERT INTO public.follow_up_steps (sequence_id, step_number, type, template_type, scheduled_at)
  VALUES (v_sequence_id, 5, 'email', 'reminder_final', v_invoice.due_date + interval '20 days');

  -- Update next_run_at to the first pending step
  UPDATE public.follow_up_sequences
  SET next_run_at = (
    SELECT scheduled_at 
    FROM public.follow_up_steps 
    WHERE sequence_id = v_sequence_id AND status = 'pending' 
    ORDER BY scheduled_at ASC LIMIT 1
  )
  WHERE id = v_sequence_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_follow_up_sequence(p_invoice_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Cancel the sequence
  UPDATE public.follow_up_sequences
  SET status = 'cancelled',
      updated_at = now()
  WHERE invoice_id = p_invoice_id AND status IN ('active', 'paused');

  -- Mark pending steps as skipped
  UPDATE public.follow_up_steps
  SET status = 'skipped',
      meta = meta || jsonb_build_object('reason', 'cancelled_by_invoice_status')
  WHERE sequence_id IN (
    SELECT id FROM public.follow_up_sequences WHERE invoice_id = p_invoice_id
  ) AND status = 'pending';
END;
$$;

-- 6. Triggers
CREATE OR REPLACE FUNCTION public.tr_handle_invoice_follow_up()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Status changed to 'sent'
  IF (TG_OP = 'UPDATE' AND OLD.status != 'sent' AND NEW.status = 'sent') OR (TG_OP = 'INSERT' AND NEW.status = 'sent') THEN
    PERFORM public.create_follow_up_sequence(NEW.id);
  END IF;

  -- Status changed to 'paid'
  IF (TG_OP = 'UPDATE' AND OLD.status != 'paid' AND NEW.status = 'paid') THEN
    PERFORM public.cancel_follow_up_sequence(NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_invoice_follow_up_sequences ON public.invoices;
CREATE TRIGGER tr_invoice_follow_up_sequences
  AFTER INSERT OR UPDATE OF status ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.tr_handle_invoice_follow_up();

-- 7. Cron Job Schedule
-- Schedule process-follow-ups to run every day at 9:00 AM IST (3:30 AM UTC)
SELECT cron.schedule(
  'process-follow-ups',
  '30 3 * * *',
  $$ SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/process-follow-ups',
    headers := '{"Authorization": "Bearer ' || current_setting('app.service_role_key') || '"}',
    body := '{}'
  ) $$
);
