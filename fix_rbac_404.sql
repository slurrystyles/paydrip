-- Consolidated Fix for RBAC Circular Dependencies and 404 Errors
-- This script clears existing policies and sets up a robust foundation for multi-tenancy.

-- 1. Ensure role column exists and has proper types
ALTER TABLE public.memberships 
  ADD COLUMN IF NOT EXISTS role TEXT 
  CHECK (role IN ('owner', 'admin', 'member', 'viewer'))
  DEFAULT 'member';

-- 2. Clean up ALL potential conflicting policies
DROP POLICY IF EXISTS "Memberships View: All Teammates" ON public.memberships;
DROP POLICY IF EXISTS "Users can read own memberships" ON public.memberships;
DROP POLICY IF EXISTS "memberships_select" ON public.memberships;
DROP POLICY IF EXISTS "tenant_isolation_memberships" ON public.memberships;

DROP POLICY IF EXISTS "organizations_select" ON public.organizations;
DROP POLICY IF EXISTS "Org View: All Members" ON public.organizations;
DROP POLICY IF EXISTS "tenant_isolation_organizations" ON public.organizations;

-- 3. The "Self-Discovery" Policy (Breaks the circularity)
-- Users must ALWAYS be able to see their own membership rows to know their role.
CREATE POLICY "discover_own_membership" ON public.memberships
  FOR SELECT USING (user_id = auth.uid());

-- 4. The "Teammate Discovery" Policy
-- Admins/Owners/Members can see other members in the same organization.
CREATE POLICY "view_teammates" ON public.memberships
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.memberships m2
      WHERE m2.organization_id = memberships.organization_id
      AND m2.user_id = auth.uid()
      AND m2.is_active = true
      AND m2.role IN ('owner', 'admin', 'member')
    )
  );

-- 5. Organization Access Policy
-- Users can see organizations they are members of.
CREATE POLICY "view_joined_organizations" ON public.organizations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.memberships
      WHERE organization_id = organizations.id
      AND user_id = auth.uid()
      AND is_active = true
    )
  );

-- 6. Other basic CRUD for memberships (Admin+)
CREATE POLICY "manage_memberships" ON public.memberships
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.memberships m3
      WHERE m3.organization_id = memberships.organization_id
      AND m3.user_id = auth.uid()
      AND m3.is_active = true
      AND m3.role IN ('owner', 'admin')
    )
  );

-- 7. Ensure Your User is Owner (Fallback for recovery)
-- Replace with your actual email if different
UPDATE public.memberships 
SET role = 'owner' 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'slurrystyles@gmail.com');

-- 8. Verify the 'organizations' relation for PostgREST
-- If the 404 persists, it might be due to a missing foreign key.
-- This ensures the FK is named exactly as expected by PostgREST defaults.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'memberships_organization_id_fkey') THEN
        ALTER TABLE public.memberships 
        ADD CONSTRAINT memberships_organization_id_fkey 
        FOREIGN KEY (organization_id) REFERENCES public.organizations(id);
    END IF;
END $$;
