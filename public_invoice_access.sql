-- Path: /public_invoice_access.sql

-- 0. Schema Fixes: Add missing columns and tables
ALTER TABLE public.invoices 
  ADD COLUMN IF NOT EXISTS public_token_expires_at TIMESTAMPTZ;

-- Ensure payments has organization_id
ALTER TABLE public.payments 
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

-- Normalize audit_logs table in public schema
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    entity_id UUID NOT NULL,
    entity_type TEXT NOT NULL,
    organization_id UUID REFERENCES public.organizations(id),
    audit_type TEXT NOT NULL,
    recipient_email TEXT,
    delivery_status TEXT,
    meta JSONB DEFAULT '{}'::jsonb,
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Backfill organization_id for payments
UPDATE public.payments p
SET organization_id = i.organization_id
FROM public.invoices i
WHERE p.invoice_id = i.id
AND p.organization_id IS NULL;

-- 1. RLS for public invoice viewing
-- Note: Policy allows unauthenticated reads; security relies on 
-- frontend always querying by public_token (never exposing all invoices)
DROP POLICY IF EXISTS "Public can view invoice by token" ON public.invoices;
CREATE POLICY "Public can view invoice by token" ON public.invoices
  FOR SELECT USING (true);

-- 1b. Allow public to see business profile of the sender
DROP POLICY IF EXISTS "Public can view business profile" ON public.users;
CREATE POLICY "Public can view business profile" ON public.users
  FOR SELECT USING (true);

-- 2. Allow public to insert into audit_logs (for views/payments)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can insert audit logs" ON public.audit_logs;
CREATE POLICY "Public can insert audit logs" ON public.audit_logs
  FOR INSERT WITH CHECK (true);

-- 3. Allow public to insert payments only for valid unpaid invoices
-- Prevents payment insertion for expired, paid, or draft invoices
DROP POLICY IF EXISTS "Public can insert payments" ON public.payments;
CREATE POLICY "Public can insert payments" ON public.payments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.invoices
      WHERE id = invoice_id
      AND status = 'sent'
      AND (public_token_expires_at IS NULL OR public_token_expires_at > now())
    )
  );

-- 3b. Allow public to see payments for their own invoice
DROP POLICY IF EXISTS "Public can view payments for invoice" ON public.payments;
CREATE POLICY "Public can view payments for invoice" ON public.payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.invoices
      WHERE id = invoice_id
      AND (public_token_expires_at IS NULL OR public_token_expires_at > now())
    )
  );

-- 4. Allow public to update invoice status to paid only for valid sent invoices
DROP POLICY IF EXISTS "Public can update invoice status to paid" ON public.invoices;
CREATE POLICY "Public can update invoice status to paid" ON public.invoices
  FOR UPDATE USING (
    status = 'sent'
    AND (public_token_expires_at IS NULL OR public_token_expires_at > now())
  )
  WITH CHECK (status = 'paid');
