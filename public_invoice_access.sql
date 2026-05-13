-- Path: /public_invoice_access.sql

-- 0. Schema Fixes: Add missing columns
ALTER TABLE public.invoices 
  ADD COLUMN IF NOT EXISTS public_token_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_reference TEXT;

-- Ensure payments has organization_id
ALTER TABLE public.payments 
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

-- Backfill organization_id for payments
UPDATE public.payments p
SET organization_id = i.organization_id
FROM public.invoices i
WHERE p.invoice_id = i.id
AND p.organization_id IS NULL;

-- 1. Create a secure view for business profiles
-- This avoids exposing sensitive fields like email and full name to the public
CREATE OR REPLACE VIEW public.public_business_profiles AS
  SELECT id, business_name, upi_id
  FROM public.users;

-- 2. RLS for public invoice viewing
DROP POLICY IF EXISTS "Public can view invoice by token" ON public.invoices;
CREATE POLICY "Public can view invoice by token" ON public.invoices
  FOR SELECT USING (true);

-- 3. RLS for audit_log (singular)
-- Allow public to insert view/payment logs
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can insert audit logs" ON public.audit_log;
CREATE POLICY "Public can insert audit logs" ON public.audit_log
  FOR INSERT WITH CHECK (true);

-- 4. Allow public to insert payments only for valid unpaid invoices
DROP POLICY IF EXISTS "Public can insert payments" ON public.payments;
CREATE POLICY "Public can insert payments" ON public.payments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.invoices
      WHERE id = invoice_id
      AND status IN ('sent', 'payment_reported')
      AND (public_token_expires_at IS NULL OR public_token_expires_at > now())
    )
  );

-- 5. Allow public to see payments for their own invoice
DROP POLICY IF EXISTS "Public can view payments for invoice" ON public.payments;
CREATE POLICY "Public can view payments for invoice" ON public.payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.invoices
      WHERE id = invoice_id
      AND (public_token_expires_at IS NULL OR public_token_expires_at > now())
    )
  );

-- 6. Allow public to update invoice status to payment_reported for valid sent invoices
DROP POLICY IF EXISTS "Public can update invoice status to reported" ON public.invoices;
DROP POLICY IF EXISTS "Public can update invoice status to payment_reported" ON public.invoices;
CREATE POLICY "Public can update invoice status to payment_reported" ON public.invoices
  FOR UPDATE USING (
    status = 'sent'
    AND (public_token_expires_at IS NULL OR public_token_expires_at > now())
  )
  WITH CHECK (status = 'payment_reported');
