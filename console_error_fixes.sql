DROP POLICY IF EXISTS "Org View: All Members" ON public.organizations;
CREATE POLICY "Org View: All Members" ON public.organizations
FOR SELECT USING (
id = ANY(public.get_user_org_ids())
);
-- Fix invoices policy (remove has_role circular dependency)
DROP POLICY IF EXISTS "Invoices View: All Roles" ON public.invoices;
CREATE POLICY "Invoices View: All Roles" ON public.invoices
FOR SELECT USING (
public_token IS NOT NULL OR
organization_id = ANY(public.get_user_org_ids())
);
-- Fix clients policy
DROP POLICY IF EXISTS "Clients View: All Roles" ON public.clients;
CREATE POLICY "Clients View: All Roles" ON public.clients
FOR SELECT USING (
organization_id = ANY(public.get_user_org_ids())
);
DROP POLICY IF EXISTS "Payments View: All Roles" ON public.payments;
CREATE POLICY "Payments View: All Roles" ON public.payments
FOR SELECT USING (
organization_id = ANY(public.get_user_org_ids()) OR
EXISTS (
SELECT 1 FROM public.invoices
WHERE id = invoice_id
AND public_token IS NOT NULL
)
);
NOTIFY pgrst, 'reload schema';