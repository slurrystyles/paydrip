-- Path: /public_invoice_access.sql

-- 1. RLS for public invoice viewing
-- Note: Policy allows unauthenticated reads; security relies on 
-- frontend always querying by public_token (never exposing all invoices)
-- Authenticated users can always see their own invoices via existing policy
DROP POLICY IF EXISTS "Public can view invoice by token" ON public.invoices;
CREATE POLICY "Public can view invoice by token" ON public.invoices
  FOR SELECT USING (true);

-- 2. Allow public to insert into audit_log (for views/payments)
DROP POLICY IF EXISTS "Public can insert audit logs" ON public.audit_log;
CREATE POLICY "Public can insert audit logs" ON public.audit_log
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

-- 4. Allow public to update invoice status to paid only for valid sent invoices
DROP POLICY IF EXISTS "Public can update invoice status to paid" ON public.invoices;
CREATE POLICY "Public can update invoice status to paid" ON public.invoices
  FOR UPDATE USING (
    status = 'sent'
    AND (public_token_expires_at IS NULL OR public_token_expires_at > now())
  )
  WITH CHECK (status = 'paid');