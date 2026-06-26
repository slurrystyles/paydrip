-- SQL Script to fix Row-Level Security (RLS) policies for launching workspaces/organizations.
-- Apply this script in your Supabase Dashboard -> SQL Editor to resolve the RLS error on creation.

-- 1. Ensure RLS is active on key tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;

-- 2. Clean up any existing insert policies to avoid duplication
DROP POLICY IF EXISTS "allow_insert_organizations" ON public.organizations;
DROP POLICY IF EXISTS "allow_insert_initial_membership" ON public.memberships;

-- 3. Create INSERT policy on 'organizations'
-- This allows any authenticated user to create a new organization/workspace.
CREATE POLICY "allow_insert_organizations" ON public.organizations
  FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

-- 4. Create INSERT policy on 'memberships'
-- This allows:
--   A) An authenticated user to assign themselves as the initial 'owner' of their newly created organization (when no other memberships for that org exist yet)
--   B) An existing Workspace Admin/Owner to add subsequent teammates
CREATE POLICY "allow_insert_initial_membership" ON public.memberships
  FOR INSERT 
  TO authenticated 
  WITH CHECK (
    -- Case A: Newly created organization setup (adding yourself as the initial member/owner)
    (
      user_id = auth.uid() 
      AND NOT EXISTS (
        SELECT 1 FROM public.memberships m 
        WHERE m.organization_id = memberships.organization_id
      )
    )
    OR
    -- Case B: Existing Admin/Owner adding a new membership
    EXISTS (
      SELECT 1 FROM public.memberships m2 
      WHERE m2.organization_id = memberships.organization_id 
      AND m2.user_id = auth.uid() 
      AND m2.role IN ('owner', 'admin') 
      AND m2.is_active = true
    )
  );
