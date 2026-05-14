-- RBAC Setup Migration for Paydrip

-- 1. Update memberships table with role
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'membership_role') THEN
        CREATE TYPE membership_role AS ENUM ('owner', 'admin', 'member', 'viewer');
    END IF;
END $$;

ALTER TABLE public.memberships 
  ADD COLUMN IF NOT EXISTS role TEXT 
  CHECK (role IN ('owner', 'admin', 'member', 'viewer'))
  DEFAULT 'member';

-- 2. Helper function to get current user's role in an organization
CREATE OR REPLACE FUNCTION public.get_user_role(p_org_id UUID) 
RETURNS TEXT AS $$
    SELECT role FROM public.memberships 
    WHERE user_id = auth.uid() 
    AND organization_id = p_org_id 
    AND is_active = true
    LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 3. Helper function to check if user has one of the specified roles
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

-- 4. Update RLS Policies
-- First, drop existing broad policies to recreate them with role checks

-- INVOICES
DROP POLICY IF EXISTS "Members can view invoices" ON public.invoices;
DROP POLICY IF EXISTS "Members can insert invoices" ON public.invoices;
DROP POLICY IF EXISTS "Members can update invoices" ON public.invoices;
DROP POLICY IF EXISTS "Members can delete invoices" ON public.invoices;

CREATE POLICY "Invoices View: All Roles" ON public.invoices
    FOR SELECT USING (public.has_role(organization_id, 'owner', 'admin', 'member', 'viewer'));

CREATE POLICY "Invoices Insert: Member+" ON public.invoices
    FOR INSERT WITH CHECK (public.has_role(organization_id, 'owner', 'admin', 'member'));

CREATE POLICY "Invoices Update: Member+" ON public.invoices
    FOR UPDATE USING (public.has_role(organization_id, 'owner', 'admin', 'member'));

CREATE POLICY "Invoices Delete: Admin+" ON public.invoices
    FOR DELETE USING (public.has_role(organization_id, 'owner', 'admin'));


-- CLIENTS
DROP POLICY IF EXISTS "Members can view clients" ON public.clients;
DROP POLICY IF EXISTS "Members can insert clients" ON public.clients;
DROP POLICY IF EXISTS "Members can update clients" ON public.clients;
DROP POLICY IF EXISTS "Members can delete clients" ON public.clients;

CREATE POLICY "Clients View: All Roles" ON public.clients
    FOR SELECT USING (public.has_role(organization_id, 'owner', 'admin', 'member', 'viewer'));

CREATE POLICY "Clients Insert: Member+" ON public.clients
    FOR INSERT WITH CHECK (public.has_role(organization_id, 'owner', 'admin', 'member'));

CREATE POLICY "Clients Update: Member+" ON public.clients
    FOR UPDATE USING (public.has_role(organization_id, 'owner', 'admin', 'member'));

CREATE POLICY "Clients Delete: Admin+" ON public.clients
    FOR DELETE USING (public.has_role(organization_id, 'owner', 'admin'));


-- PAYMENTS
DROP POLICY IF EXISTS "Members can view payments" ON public.payments;
DROP POLICY IF EXISTS "Members can insert payments" ON public.payments;

CREATE POLICY "Payments View: All Roles" ON public.payments
    FOR SELECT USING (public.has_role(organization_id, 'owner', 'admin', 'member', 'viewer'));

CREATE POLICY "Payments Insert: Member+" ON public.payments
    FOR INSERT WITH CHECK (public.has_role(organization_id, 'owner', 'admin', 'member'));


-- FOLLOW UP SEQUENCES
DROP POLICY IF EXISTS "Members can view follow_up_sequences" ON public.follow_up_sequences;
DROP POLICY IF EXISTS "Members can update follow_up_sequences" ON public.follow_up_sequences;

CREATE POLICY "Sequences View: All Roles" ON public.follow_up_sequences
    FOR SELECT USING (public.has_role(organization_id, 'owner', 'admin', 'member', 'viewer'));

CREATE POLICY "Sequences Update: Member+" ON public.follow_up_sequences
    FOR UPDATE USING (public.has_role(organization_id, 'owner', 'admin', 'member'));


-- ORGANIZATIONS
DROP POLICY IF EXISTS "Members can view organization" ON public.organizations;
DROP POLICY IF EXISTS "Owners/Admins can update organization" ON public.organizations;

CREATE POLICY "Org View: All Members" ON public.organizations
    FOR SELECT USING (public.has_role(id, 'owner', 'admin', 'member', 'viewer'));

CREATE POLICY "Org Update: Admin+" ON public.organizations
    FOR UPDATE USING (public.has_role(id, 'owner', 'admin'));

CREATE POLICY "Org Delete: Owner Only" ON public.organizations
    FOR DELETE USING (public.has_role(id, 'owner'));


-- MEMBERSHIPS
DROP POLICY IF EXISTS "Members can view teammates" ON public.memberships;
DROP POLICY IF EXISTS "Admins can invite members" ON public.memberships;
DROP POLICY IF EXISTS "Owners can change roles" ON public.memberships;
DROP POLICY IF EXISTS "Admins can remove members" ON public.memberships;

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

-- Set existing members as 'owner'
UPDATE public.memberships SET role = 'owner' WHERE role IS NULL OR role = 'member';
