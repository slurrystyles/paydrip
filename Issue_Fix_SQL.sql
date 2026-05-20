-- Step 1: Drop dependent policies
DROP POLICY IF EXISTS "Members can create templates" ON public.email_templates;
DROP POLICY IF EXISTS "Members can update templates" ON public.email_templates;
DROP POLICY IF EXISTS "Admins can delete templates" ON public.email_templates;

-- Step 2: Convert role column from enum to text
ALTER TABLE public.memberships 
  ALTER COLUMN role TYPE TEXT;

ALTER TABLE public.invitations
  ALTER COLUMN role TYPE TEXT;

-- Step 3: Drop the enum
DROP TYPE IF EXISTS membership_role;

-- Step 4: Recreate policies
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