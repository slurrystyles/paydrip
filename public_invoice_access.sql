-- Path: /public_invoice_access.sql

-- 1. RLS for public invoice viewing
DROP POLICY IF EXISTS "Public can view invoice by token" ON public.invoices;
CREATE POLICY "Public can view invoice by token" ON public.invoices
  FOR SELECT USING (public_token IS NOT NULL);

-- 2. Allow public to insert into audit_log (for views/payments)
DROP POLICY IF EXISTS "Public can insert audit logs" ON public.audit_log;
CREATE POLICY "Public can insert audit logs" ON public.audit_log
  FOR INSERT WITH CHECK (true);

-- 3. Allow public to insert into payments (for reporting payment)
DROP POLICY IF EXISTS "Public can insert payments" ON public.payments;
CREATE POLICY "Public can insert payments" ON public.payments
  FOR INSERT WITH CHECK (true);

-- 4. Allow public to update invoice status to 'paid'
DROP POLICY IF EXISTS "Public can update invoice status to paid" ON public.invoices;
CREATE POLICY "Public can update invoice status to paid" ON public.invoices
  FOR UPDATE USING (public_token IS NOT NULL)
  WITH CHECK (status = 'paid');
