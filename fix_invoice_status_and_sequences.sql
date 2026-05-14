-- Path: /fix_invoice_status_and_sequences.sql

-- 1. Fix Invoice Status Constraint
-- First, identify and drop the old constraint
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'public.invoices'::regclass 
        AND confkey IS NULL 
        AND conname LIKE '%status%'
    ) LOOP
        EXECUTE 'ALTER TABLE public.invoices DROP CONSTRAINT ' || quote_ident(r.conname);
    END LOOP;
END $$;

-- Add new hardened status constraint
ALTER TABLE public.invoices 
  ADD CONSTRAINT invoices_status_check 
  CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'payment_reported', 'cancelled'));

-- 2. Ensure follow_up_sequences and follow_up_steps are properly configured
-- Add missing grants just in case
GRANT ALL ON TABLE public.follow_up_sequences TO authenticated;
GRANT ALL ON TABLE public.follow_up_steps TO authenticated;
GRANT ALL ON TABLE public.follow_up_sequences TO service_role;
GRANT ALL ON TABLE public.follow_up_steps TO service_role;

-- 3. Fix RLS for follow_up_sequences to be more robust
DROP POLICY IF EXISTS "Users can access own organization's sequences" ON public.follow_up_sequences;
CREATE POLICY "Users can access own organization's sequences" ON public.follow_up_sequences
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM public.memberships WHERE user_id = auth.uid() AND is_active = true
    )
  );

DROP POLICY IF EXISTS "Users can insert own org sequences" ON public.follow_up_sequences;
CREATE POLICY "Users can insert own org sequences" ON public.follow_up_sequences
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.memberships WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- 4. Fix RLS for follow_up_steps
DROP POLICY IF EXISTS "Users can access own organization's steps" ON public.follow_up_steps;
CREATE POLICY "Users can access own organization's steps" ON public.follow_up_steps
  FOR ALL USING (
    sequence_id IN (
      SELECT id FROM public.follow_up_sequences WHERE organization_id IN (
        SELECT organization_id FROM public.memberships WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

DROP POLICY IF EXISTS "Users can insert own org steps" ON public.follow_up_steps;
CREATE POLICY "Users can insert own org steps" ON public.follow_up_steps
  FOR INSERT WITH CHECK (
    sequence_id IN (
      SELECT id FROM public.follow_up_sequences WHERE organization_id IN (
        SELECT organization_id FROM public.memberships WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

-- 5. Ensure follow_up_sequences has a status constraint if not present
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conrelid = 'public.follow_up_sequences'::regclass 
        AND conname = 'follow_up_sequences_status_check'
    ) THEN
        ALTER TABLE public.follow_up_sequences 
        ADD CONSTRAINT follow_up_sequences_status_check 
        CHECK (status IN ('active', 'paused', 'completed', 'cancelled'));
    END IF;
END $$;
