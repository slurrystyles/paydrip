-- GROUP 5A — CORRECTED MULTI-TENANT FOUNDATION
-- Production-Safe Revision

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================================
-- ENUMS
-- =========================================================

DO $$
BEGIN
IF NOT EXISTS (
SELECT 1 FROM pg_type WHERE typname = 'organization_type'
) THEN
CREATE TYPE organization_type AS ENUM (
'standard',
'agency',
'enterprise'
);
END IF;


IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'membership_role'
) THEN
    CREATE TYPE membership_role AS ENUM (
        'owner',
        'admin',
        'manager',
        'operator',
        'analyst',
        'finance',
        'support',
        'read_only'
    );
END IF;


END $$;

-- =========================================================
-- ORGANIZATIONS
-- =========================================================

CREATE TABLE IF NOT EXISTS public.organizations (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),


name TEXT NOT NULL,

slug TEXT NOT NULL UNIQUE
    CHECK (slug ~ '^[a-z0-9-]+$'),

type organization_type NOT NULL DEFAULT 'standard',

branding JSONB NOT NULL DEFAULT jsonb_build_object(
    'primary_color', '#4f46e5',
    'logo_url', null,
    'company_name', null,
    'support_email', null
),

is_active BOOLEAN NOT NULL DEFAULT true,

metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT now()


);

-- =========================================================
-- MEMBERSHIPS
-- =========================================================

CREATE TABLE IF NOT EXISTS public.memberships (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),


organization_id UUID NOT NULL
    REFERENCES public.organizations(id)
    ON DELETE CASCADE,

user_id UUID NOT NULL
    REFERENCES auth.users(id)
    ON DELETE CASCADE,

role membership_role NOT NULL DEFAULT 'operator',

is_active BOOLEAN NOT NULL DEFAULT true,

invited_by UUID
    REFERENCES auth.users(id),

joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),

created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

UNIQUE (organization_id, user_id)


);

-- =========================================================
-- ORGANIZATION LINKS
-- =========================================================

CREATE TABLE IF NOT EXISTS public.organization_links (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),


parent_org_id UUID NOT NULL
    REFERENCES public.organizations(id)
    ON DELETE CASCADE,

child_org_id UUID NOT NULL
    REFERENCES public.organizations(id)
    ON DELETE CASCADE,

link_type TEXT NOT NULL DEFAULT 'managed',

permissions JSONB NOT NULL DEFAULT
    '["read","write","recover","analyze"]'::jsonb,

created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

UNIQUE(parent_org_id, child_org_id),

CHECK (parent_org_id <> child_org_id)


);

-- =========================================================
-- INVITATIONS
-- =========================================================

CREATE TABLE IF NOT EXISTS public.invitations (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),


organization_id UUID NOT NULL
    REFERENCES public.organizations(id)
    ON DELETE CASCADE,

email TEXT NOT NULL,

role membership_role NOT NULL DEFAULT 'operator',

token_hash TEXT NOT NULL UNIQUE,

inviter_id UUID NOT NULL
    REFERENCES auth.users(id),

expires_at TIMESTAMPTZ NOT NULL,

accepted_at TIMESTAMPTZ,

created_at TIMESTAMPTZ NOT NULL DEFAULT now()


);

-- =========================================================
-- TENANT COLUMN MIGRATIONS
-- =========================================================

DO $$
BEGIN
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS organization_id UUID
REFERENCES public.organizations(id);


ALTER TABLE public.invoices
    ADD COLUMN IF NOT EXISTS organization_id UUID
    REFERENCES public.organizations(id);

ALTER TABLE public.reminder_timeline
    ADD COLUMN IF NOT EXISTS organization_id UUID
    REFERENCES public.organizations(id);

ALTER TABLE public.escalation_rules
    ADD COLUMN IF NOT EXISTS organization_id UUID
    REFERENCES public.organizations(id);

ALTER TABLE public.client_risk_scores
    ADD COLUMN IF NOT EXISTS organization_id UUID
    REFERENCES public.organizations(id);

ALTER TABLE public.escalation_queue
    ADD COLUMN IF NOT EXISTS organization_id UUID
    REFERENCES public.organizations(id);

ALTER TABLE public.legal_notices
    ADD COLUMN IF NOT EXISTS organization_id UUID
    REFERENCES public.organizations(id);

ALTER TABLE public.invoice_events
    ADD COLUMN IF NOT EXISTS organization_id UUID
    REFERENCES public.organizations(id);

ALTER TABLE security.usage_counters
    ADD COLUMN IF NOT EXISTS organization_id UUID
    REFERENCES public.organizations(id);

ALTER TABLE security.subscriptions
    ADD COLUMN IF NOT EXISTS organization_id UUID
    REFERENCES public.organizations(id);

ALTER TABLE security.webhook_endpoints
    ADD COLUMN IF NOT EXISTS organization_id UUID
    REFERENCES public.organizations(id);

ALTER TABLE security.dead_letter_queue
    ADD COLUMN IF NOT EXISTS organization_id UUID
    REFERENCES public.organizations(id);


END $$;

-- =========================================================
-- ACCESS FUNCTION
-- =========================================================

CREATE OR REPLACE FUNCTION public.can_access_org(
p_org_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
SELECT EXISTS (
SELECT 1
FROM public.memberships m
JOIN public.organizations o
ON o.id = m.organization_id
WHERE
m.user_id = auth.uid()
AND m.is_active = true
AND o.is_active = true
AND (
m.organization_id = p_org_id


            OR EXISTS (
                SELECT 1
                FROM public.organization_links ol
                WHERE
                    ol.child_org_id = p_org_id
                    AND ol.parent_org_id = m.organization_id
            )
        )
);


$$;

-- =========================================================
-- ENTITLEMENTS
-- =========================================================

CREATE OR REPLACE FUNCTION security.resolve_entitlement(
p_org_id UUID,
p_metric TEXT
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, security
AS $$
DECLARE
v_limit INT;
v_plan_limits JSONB;
BEGIN


SELECT p.limits
INTO v_plan_limits
FROM security.subscriptions s
JOIN security.plans p
    ON p.id = s.plan_id
WHERE
    s.organization_id = p_org_id
    AND s.status = 'active'
ORDER BY s.created_at DESC
LIMIT 1;

IF v_plan_limits IS NULL THEN
    RETURN CASE
        WHEN p_metric = 'ai_generations' THEN 5
        WHEN p_metric = 'invoices_month' THEN 10
        WHEN p_metric = 'automations_active' THEN 2
        ELSE 0
    END;
END IF;

RETURN COALESCE(
    (v_plan_limits ->> p_metric)::INT,
    0
);


END;
$$;

-- =========================================================
-- USAGE COUNTERS
-- =========================================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_usage_counter_unique
ON security.usage_counters (
organization_id,
metric,
period_start
);

-- =========================================================
-- RLS
-- =========================================================

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS organizations_select ON public.organizations;

CREATE POLICY organizations_select
ON public.organizations
FOR SELECT
USING (
public.can_access_org(id)
);

DROP POLICY IF EXISTS memberships_select ON public.memberships;

CREATE POLICY memberships_select
ON public.memberships
FOR SELECT
USING (
public.can_access_org(organization_id)
);

-- =========================================================
-- CORE TABLE RLS
-- =========================================================

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escalation_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_invoices
ON public.invoices;

CREATE POLICY tenant_isolation_invoices
ON public.invoices
FOR ALL
USING (
public.can_access_org(organization_id)
)
WITH CHECK (
public.can_access_org(organization_id)
);

DROP POLICY IF EXISTS tenant_isolation_clients
ON public.clients;

CREATE POLICY tenant_isolation_clients
ON public.clients
FOR ALL
USING (
public.can_access_org(organization_id)
)
WITH CHECK (
public.can_access_org(organization_id)
);

DROP POLICY IF EXISTS tenant_isolation_queue
ON public.escalation_queue;

CREATE POLICY tenant_isolation_queue
ON public.escalation_queue
FOR ALL
USING (
public.can_access_org(organization_id)
)
WITH CHECK (
public.can_access_org(organization_id)
);

-- =========================================================
-- SAFE BACKFILL
-- =========================================================

DO $$
DECLARE
r RECORD;
v_org_id UUID;
BEGIN


FOR r IN
    SELECT u.id, COALESCE(u.name, 'Workspace') AS name
    FROM public.users u
LOOP

    SELECT m.organization_id
    INTO v_org_id
    FROM public.memberships m
    WHERE
        m.user_id = r.id
    LIMIT 1;

    IF v_org_id IS NULL THEN

        INSERT INTO public.organizations (
            name,
            slug
        )
        VALUES (
            r.name || ' Workspace',
            'org-' || substr(replace(r.id::text, '-', ''), 1, 12)
        )
        RETURNING id INTO v_org_id;

        INSERT INTO public.memberships (
            organization_id,
            user_id,
            role
        )
        VALUES (
            v_org_id,
            r.id,
            'owner'
        );

    END IF;

    UPDATE public.clients
    SET organization_id = v_org_id
    WHERE
        user_id = r.id
        AND organization_id IS NULL;

    UPDATE public.invoices
    SET organization_id = v_org_id
    WHERE
        user_id = r.id
        AND organization_id IS NULL;

END LOOP;


END $$;

-- =========================================================
-- INDEXES
-- =========================================================

CREATE INDEX IF NOT EXISTS idx_memberships_user
ON public.memberships(user_id);

CREATE INDEX IF NOT EXISTS idx_memberships_org
ON public.memberships(organization_id);

CREATE INDEX IF NOT EXISTS idx_org_links_parent
ON public.organization_links(parent_org_id);

CREATE INDEX IF NOT EXISTS idx_org_links_child
ON public.organization_links(child_org_id);

CREATE INDEX IF NOT EXISTS idx_invoices_org
ON public.invoices(organization_id);

CREATE INDEX IF NOT EXISTS idx_clients_org
ON public.clients(organization_id);

CREATE INDEX IF NOT EXISTS idx_queue_org
ON public.escalation_queue(organization_id);

-- =========================================================
-- SAFE NOT NULL ENFORCEMENT
-- =========================================================

DO $$
BEGIN


IF EXISTS (
    SELECT 1
    FROM public.invoices
    WHERE organization_id IS NULL
) THEN
    RAISE EXCEPTION
        'organization_id backfill incomplete for invoices';
END IF;

IF EXISTS (
    SELECT 1
    FROM public.clients
    WHERE organization_id IS NULL
) THEN
    RAISE EXCEPTION
        'organization_id backfill incomplete for clients';
END IF;


END $$;

ALTER TABLE public.invoices
ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE public.clients
ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE public.escalation_queue
ALTER COLUMN organization_id SET NOT NULL;
