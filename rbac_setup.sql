-- 1. Add role column
ALTER TABLE public.memberships 
  ADD COLUMN IF NOT EXISTS role TEXT 
  CHECK (role IN ('owner', 'admin', 'member', 'viewer'))
  DEFAULT 'member';

-- 2. Helper functions
CREATE OR REPLACE FUNCTION public.get_user_role(p_org_id UUID) 
RETURNS TEXT AS $$
  SELECT role FROM public.memberships 
  WHERE user_id = auth.uid() 
  AND organization_id = p_org_id 
  AND is_active = true
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.has_role(p_org_id UUID, VARIADIC p_roles TEXT[]) 
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT role = ANY(p_roles)
    FROM public.memberships 
    WHERE user_id = auth.uid() 
    AND organization_id = p_org_id 
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 3. Drop ALL existing policies (correct names from your DB)
DROP POLICY IF EXISTS "Users can insert own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can manage own clients" ON public.clients;
DROP POLICY IF EXISTS "tenant_isolation_clients" ON public.clients;
DROP POLICY IF EXISTS "Users can access own organization's sequences" ON public.follow_up_sequences;
DROP POLICY IF EXISTS "Users can insert own org sequences" ON public.follow_up_sequences;
DROP POLICY IF EXISTS "Public can update invoice status to paid" ON public.invoices;
DROP POLICY IF EXISTS "Public can update invoice status to payment_reported" ON public.invoices;
DROP POLICY IF EXISTS "Public can view invoice by token" ON public.invoices;
DROP POLICY IF EXISTS "Users can insert own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users can manage own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users can update own invoices" ON public.invoices;
DROP POLICY IF EXISTS "tenant_isolation_invoices" ON public.invoices;
DROP POLICY IF EXISTS "memberships_select" ON public.memberships;
DROP POLICY IF EXISTS "organizations_select" ON public.organizations;
DROP POLICY IF EXISTS "Public can insert payments" ON public.payments;
DROP POLICY IF EXISTS "Public can view payments for invoice" ON public.payments;
DROP POLICY IF EXISTS "Users can manage own payments" ON public.payments;

-- 4. Recreate policies with role checks

-- INVOICES
CREATE POLICY "Invoices View: All Roles" ON public.invoices
  FOR SELECT USING (
    public_token IS NOT NULL OR  -- public access via token
    public.has_role(organization_id, 'owner', 'admin', 'member', 'viewer')
  );

CREATE POLICY "Invoices Insert: Member+" ON public.invoices
  FOR INSERT WITH CHECK (public.has_role(organization_id, 'owner', 'admin', 'member'));

CREATE POLICY "Invoices Update: Member+" ON public.invoices
  FOR UPDATE USING (
    -- allow public payment reporting
    (status = 'sent' AND public_token IS NOT NULL) OR
    public.has_role(organization_id, 'owner', 'admin', 'member')
  )
  WITH CHECK (
    status IN ('payment_reported', 'paid', 'sent', 'draft')
  );

CREATE POLICY "Invoices Delete: Admin+" ON public.invoices
  FOR DELETE USING (public.has_role(organization_id, 'owner', 'admin'));

-- CLIENTS
CREATE POLICY "Clients View: All Roles" ON public.clients
  FOR SELECT USING (public.has_role(organization_id, 'owner', 'admin', 'member', 'viewer'));

CREATE POLICY "Clients Insert: Member+" ON public.clients
  FOR INSERT WITH CHECK (public.has_role(organization_id, 'owner', 'admin', 'member'));

CREATE POLICY "Clients Update: Member+" ON public.clients
  FOR UPDATE USING (public.has_role(organization_id, 'owner', 'admin', 'member'));

CREATE POLICY "Clients Delete: Admin+" ON public.clients
  FOR DELETE USING (public.has_role(organization_id, 'owner', 'admin'));

-- PAYMENTS
CREATE POLICY "Payments View: All Roles" ON public.payments
  FOR SELECT USING (
    public.has_role(organization_id, 'owner', 'admin', 'member', 'viewer') OR
    EXISTS (
      SELECT 1 FROM public.invoices 
      WHERE id = invoice_id 
      AND public_token IS NOT NULL
    )
  );

CREATE POLICY "Payments Insert: Member+ or Public" ON public.payments
  FOR INSERT WITH CHECK (
    public.has_role(organization_id, 'owner', 'admin', 'member') OR
    EXISTS (
      SELECT 1 FROM public.invoices
      WHERE id = invoice_id
      AND status IN ('sent', 'payment_reported')
      AND (public_token_expires_at IS NULL OR public_token_expires_at > now())
    )
  );

-- FOLLOW UP SEQUENCES
CREATE POLICY "Sequences View: All Roles" ON public.follow_up_sequences
  FOR SELECT USING (public.has_role(organization_id, 'owner', 'admin', 'member', 'viewer'));

CREATE POLICY "Sequences Update: Member+" ON public.follow_up_sequences
  FOR UPDATE USING (public.has_role(organization_id, 'owner', 'admin', 'member'));

-- ORGANIZATIONS
CREATE POLICY "Org View: All Members" ON public.organizations
  FOR SELECT USING (public.has_role(id, 'owner', 'admin', 'member', 'viewer'));

CREATE POLICY "Org Update: Admin+" ON public.organizations
  FOR UPDATE USING (public.has_role(id, 'owner', 'admin'));

CREATE POLICY "Org Delete: Owner Only" ON public.organizations
  FOR DELETE USING (public.has_role(id, 'owner'));

-- MEMBERSHIPS
CREATE POLICY "Memberships View: All Teammates" ON public.memberships
  FOR SELECT USING (public.has_role(organization_id, 'owner', 'admin', 'member', 'viewer'));

CREATE POLICY "Memberships Insert: Admin+" ON public.memberships
  FOR INSERT WITH CHECK (public.has_role(organization_id, 'owner', 'admin'));

CREATE POLICY "Memberships Update: Owner Only" ON public.memberships
  FOR UPDATE USING (public.has_role(organization_id, 'owner'));

CREATE POLICY "Memberships Delete: Self or Admin+" ON public.memberships
  FOR DELETE USING (
    user_id = auth.uid() OR 
    public.has_role(organization_id, 'owner', 'admin')
  );

-- 5. Set YOUR account as owner only
UPDATE public.memberships SET role = 'owner' 
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'slurrystyles@gmail.com'
);

CREATE POLICY "Users can read own memberships" ON public.memberships
  FOR SELECT USING (user_id = auth.uid());

