-- ═══════════════════════════════════════════
-- STEP 1: DROP ALL ROLE-DEPENDENT POLICIES
-- ═══════════════════════════════════════════

DROP POLICY IF EXISTS "Clients Delete: Admin+" ON public.clients;
DROP POLICY IF EXISTS "Clients Update: Member+" ON public.clients;
DROP POLICY IF EXISTS "Clients Insert: Member+" ON public.clients;
DROP POLICY IF EXISTS "Members can create templates" ON public.email_templates;
DROP POLICY IF EXISTS "Admins can delete templates" ON public.email_templates;
DROP POLICY IF EXISTS "Members can update templates" ON public.email_templates;
DROP POLICY IF EXISTS "Sequences Update: Member+" ON public.follow_up_sequences;
DROP POLICY IF EXISTS "Sequences View: All Roles" ON public.follow_up_sequences;
DROP POLICY IF EXISTS "Invoices Update: Member+" ON public.invoices;
DROP POLICY IF EXISTS "Invoices Insert: Member+" ON public.invoices;
DROP POLICY IF EXISTS "Invoices Delete: Admin+" ON public.invoices;
DROP POLICY IF EXISTS "Memberships Delete: Self or Admin+" ON public.memberships;
DROP POLICY IF EXISTS "Memberships Update: Owner Only" ON public.memberships;
DROP POLICY IF EXISTS "Memberships Insert: Admin+" ON public.memberships;
DROP POLICY IF EXISTS "Org Update: Admin+" ON public.organizations;
DROP POLICY IF EXISTS "Org Delete: Owner Only" ON public.organizations;
DROP POLICY IF EXISTS "Payments Insert: Member+ or Public" ON public.payments;

-- ═══════════════════════════════════════════
-- STEP 2: ALTER COLUMN TYPE
-- ═══════════════════════════════════════════

ALTER TABLE public.memberships 
  ALTER COLUMN role DROP DEFAULT;

ALTER TABLE public.invitations 
  ALTER COLUMN role DROP DEFAULT;

ALTER TABLE public.memberships 
  ALTER COLUMN role TYPE TEXT;

ALTER TABLE public.invitations 
  ALTER COLUMN role TYPE TEXT;

ALTER TABLE public.memberships 
  ALTER COLUMN role SET DEFAULT 'member';

ALTER TABLE public.invitations 
  ALTER COLUMN role SET DEFAULT 'member';

DROP TYPE IF EXISTS membership_role;
-- ═══════════════════════════════════════════
-- STEP 3: RECREATE ALL POLICIES
-- ═══════════════════════════════════════════

-- CLIENTS
CREATE POLICY "Clients Insert: Member+" ON public.clients
  FOR INSERT WITH CHECK (
    public.has_role(organization_id, 'owner', 'admin', 'member')
  );

CREATE POLICY "Clients Update: Member+" ON public.clients
  FOR UPDATE USING (
    public.has_role(organization_id, 'owner', 'admin', 'member')
  );

CREATE POLICY "Clients Delete: Admin+" ON public.clients
  FOR DELETE USING (
    public.has_role(organization_id, 'owner', 'admin')
  );

-- EMAIL TEMPLATES
CREATE POLICY "Members can create templates"
ON public.email_templates FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.memberships
    WHERE organization_id = email_templates.organization_id
    AND user_id = auth.uid()
    AND is_active = true
    AND role IN ('owner', 'admin', 'member')
  )
);

CREATE POLICY "Members can update templates"
ON public.email_templates FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.memberships
    WHERE organization_id = email_templates.organization_id
    AND user_id = auth.uid()
    AND is_active = true
    AND role IN ('owner', 'admin', 'member')
  )
);

CREATE POLICY "Admins can delete templates"
ON public.email_templates FOR DELETE TO authenticated
USING (
  organization_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.memberships
    WHERE organization_id = email_templates.organization_id
    AND user_id = auth.uid()
    AND is_active = true
    AND role IN ('owner', 'admin')
  )
);

-- FOLLOW UP SEQUENCES
CREATE POLICY "Sequences View: All Roles" ON public.follow_up_sequences
  FOR SELECT USING (
    public.has_role(organization_id, 'owner', 'admin', 'member', 'viewer')
  );

CREATE POLICY "Sequences Update: Member+" ON public.follow_up_sequences
  FOR UPDATE USING (
    public.has_role(organization_id, 'owner', 'admin', 'member')
  );

-- INVOICES
CREATE POLICY "Invoices Insert: Member+" ON public.invoices
  FOR INSERT WITH CHECK (
    public.has_role(organization_id, 'owner', 'admin', 'member')
  );

CREATE POLICY "Invoices Update: Member+" ON public.invoices
  FOR UPDATE USING (
    (status = 'sent' AND public_token IS NOT NULL) OR
    public.has_role(organization_id, 'owner', 'admin', 'member')
  )
  WITH CHECK (
    status IN ('payment_reported', 'paid', 'sent', 'draft')
  );

CREATE POLICY "Invoices Delete: Admin+" ON public.invoices
  FOR DELETE USING (
    public.has_role(organization_id, 'owner', 'admin')
  );

-- MEMBERSHIPS
CREATE POLICY "Memberships Insert: Admin+" ON public.memberships
  FOR INSERT WITH CHECK (
    public.has_role(organization_id, 'owner', 'admin')
  );

CREATE POLICY "Memberships Update: Owner Only" ON public.memberships
  FOR UPDATE USING (
    public.has_role(organization_id, 'owner')
  );

CREATE POLICY "Memberships Delete: Self or Admin+" ON public.memberships
  FOR DELETE USING (
    user_id = auth.uid() OR
    public.has_role(organization_id, 'owner', 'admin')
  );

-- ORGANIZATIONS
CREATE POLICY "Org Update: Admin+" ON public.organizations
  FOR UPDATE USING (
    public.has_role(id, 'owner', 'admin')
  );

CREATE POLICY "Org Delete: Owner Only" ON public.organizations
  FOR DELETE USING (
    public.has_role(id, 'owner')
  );

-- PAYMENTS
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