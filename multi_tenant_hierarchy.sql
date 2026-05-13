-- GROUP 5A: MULTI-TENANT CORE ARCHITECTURE
-- Platform: Paydrip
-- Version: 3.0.0 (Multi-Tenant)

-- 1. TENANT HIERARCHY ENUMS
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'organization_type') THEN
    CREATE TYPE organization_type AS ENUM ('standard', 'agency', 'enterprise');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'membership_role') THEN
    CREATE TYPE membership_role AS ENUM ('owner', 'admin', 'manager', 'operator', 'analyst', 'finance', 'support', 'read_only');
  END IF;
END $$;

-- 2. ORGANIZATIONS (The Root Tenant)
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    type organization_type DEFAULT 'standard' NOT NULL,
    branding JSONB DEFAULT '{
        "primary_color": "#4f46e5",
        "logo_url": null,
        "company_name": null,
        "support_email": null
    }'::jsonb,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 3. MEMBERSHIPS (RBAC & User Association)
CREATE TABLE IF NOT EXISTS public.memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role membership_role DEFAULT 'operator' NOT NULL,
    is_active BOOLEAN DEFAULT true,
    invited_by UUID REFERENCES auth.users(id),
    joined_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(organization_id, user_id)
);

-- 4. ORGANIZATION LINKS (Agency/Managed Relationships)
CREATE TABLE IF NOT EXISTS public.organization_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE, -- The Agency
    child_org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE, -- The Client
    link_type TEXT DEFAULT 'managed' NOT NULL,
    permissions JSONB DEFAULT '["read", "write", "recover", "analyze"]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(parent_org_id, child_org_id)
);

-- 5. INVITATIONS
CREATE TABLE IF NOT EXISTS public.invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role membership_role DEFAULT 'operator' NOT NULL,
    token TEXT NOT NULL UNIQUE,
    inviter_id UUID NOT NULL REFERENCES auth.users(id),
    expires_at TIMESTAMPTZ NOT NULL,
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 6. REFACTORING EXISTING TABLES (Adding tenant isolation)
-- We use DO blocks to safely add columns to existing tables
DO $$
BEGIN
    -- Add organization_id to core tables if not exists
    ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
    ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
    ALTER TABLE public.reminder_timeline ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
    ALTER TABLE public.escalation_rules ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
    ALTER TABLE public.client_risk_scores ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
    ALTER TABLE public.escalation_queue ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
    ALTER TABLE public.legal_notices ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
    ALTER TABLE public.invoice_events ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
    
    -- Security schemas refactor
    ALTER TABLE security.usage_counters ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
    ALTER TABLE security.subscriptions ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
    ALTER TABLE security.webhook_endpoints ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
    ALTER TABLE security.dead_letter_queue ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
END $$;

-- 7. TENANT-AWARE RLS FUNCTIONS (CORE ENGINE)

-- This function resolves whether a user has access to an organization (directly or via agency link)
CREATE OR REPLACE FUNCTION public.can_access_org(p_org_id UUID) 
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.memberships m
        WHERE m.user_id = auth.uid() 
        AND m.is_active = true
        AND (
            m.organization_id = p_org_id 
            OR EXISTS (
                SELECT 1 FROM public.organization_links ol
                WHERE ol.child_org_id = p_org_id 
                AND ol.parent_org_id = m.organization_id
            )
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ENHANCED ENTITLEMENT RESOLVER
CREATE OR REPLACE FUNCTION security.resolve_entitlement(
    p_org_id UUID,
    p_metric TEXT
) RETURNS INT AS $$
DECLARE
    v_limit INT;
    v_plan_limits JSONB;
BEGIN
    SELECT p.limits INTO v_plan_limits
    FROM security.subscriptions s
    JOIN security.plans p ON s.plan_id = p.id
    WHERE s.organization_id = p_org_id AND s.status = 'active';

    IF v_plan_limits IS NULL THEN
        -- Default Free Tier Limits
        v_limit := CASE 
            WHEN p_metric = 'ai_generations' THEN 5
            WHEN p_metric = 'invoices_month' THEN 10
            WHEN p_metric = 'automations_active' THEN 2
            ELSE 0
        END;
    ELSE
        v_limit := (v_plan_limits->>p_metric)::int;
    END IF;

    RETURN v_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION security.increment_usage(
    p_org_id UUID,
    p_metric TEXT,
    p_amount INT DEFAULT 1,
    p_user_id UUID DEFAULT auth.uid()
) RETURNS BOOLEAN AS $$
DECLARE
    v_limit INT;
    v_current INT;
    v_period_start TIMESTAMPTZ := date_trunc('month', now());
    v_period_end TIMESTAMPTZ := v_period_start + interval '1 month';
BEGIN
    v_limit := security.resolve_entitlement(p_org_id, p_metric);
    
    INSERT INTO security.usage_counters (organization_id, user_id, metric, count, period_start, period_end)
    VALUES (p_org_id, p_user_id, p_metric, p_amount, v_period_start, v_period_end)
    ON CONFLICT (organization_id, metric, period_start) 
    DO UPDATE SET count = usage_counters.count + p_amount
    RETURNING count INTO v_current;

    IF v_current > v_limit THEN
        -- Log overage attempt
        INSERT INTO security.audit_logs (actor_id, actor_type, action, resource_type, severity, metadata)
        VALUES (p_org_id, 'organization', 'usage_limit_exceeded', 'usage_counter', 'warning', 
                jsonb_build_object('metric', p_metric, 'current', v_current, 'limit', v_limit, 'user_id', p_user_id));
        RETURN FALSE;
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. GLOBAL RLS POLICIES (MULTI-TENANT ENFORCEMENT)

-- Organizations
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view organizations they are members of" 
ON public.organizations FOR SELECT 
USING (can_access_org(id));

-- Memberships
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view memberships in their organizations" 
ON public.memberships FOR SELECT 
USING (can_access_org(organization_id));

-- Refactoring Policies for core recovery engine
-- INVOICES
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own invoices" ON public.invoices;
CREATE POLICY "Tenant isolation for invoices" ON public.invoices
FOR ALL USING (can_access_org(organization_id)) WITH CHECK (can_access_org(organization_id));

-- CLIENTS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own clients" ON public.clients;
CREATE POLICY "Tenant isolation for clients" ON public.clients
FOR ALL USING (can_access_org(organization_id)) WITH CHECK (can_access_org(organization_id));

-- ESCALATION QUEUE
ALTER TABLE public.escalation_queue ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own escalation queue" ON public.escalation_queue;
CREATE POLICY "Tenant isolation for escalation queue" ON public.escalation_queue
FOR ALL USING (can_access_org(organization_id)) WITH CHECK (can_access_org(organization_id));

-- 9. SEEDING & BACKWARDS COMPATIBILITY
-- Create a default organization for every existing user to prevent lock-out
DO $$
DECLARE
    r RECORD;
    v_org_id UUID;
BEGIN
    FOR r IN SELECT id, name FROM public.users LOOP
        -- Create default organization
        INSERT INTO public.organizations (name, slug)
        VALUES (r.name || ' Organization', 'org-' || r.id)
        RETURNING id INTO v_org_id;

        -- Create membership
        INSERT INTO public.memberships (organization_id, user_id, role)
        VALUES (v_org_id, r.id, 'owner');

        -- Migrate existing data
        UPDATE public.clients SET organization_id = v_org_id WHERE user_id = r.id;
        UPDATE public.invoices SET organization_id = v_org_id WHERE user_id = r.id;
        UPDATE public.reminder_timeline SET organization_id = v_org_id WHERE user_id = r.id;
        UPDATE public.escalation_rules SET organization_id = v_org_id WHERE user_id = r.id;
        UPDATE public.client_risk_scores SET organization_id = v_org_id WHERE user_id = r.id;
        UPDATE public.escalation_queue SET organization_id = v_org_id WHERE user_id = r.id;
        UPDATE public.legal_notices SET organization_id = v_org_id WHERE user_id = r.id;
        UPDATE public.invoice_events SET organization_id = v_org_id WHERE user_id = r.id;
        
        -- Security schema migration
        UPDATE security.usage_counters SET organization_id = v_org_id WHERE user_id = r.id;
        UPDATE security.subscriptions SET organization_id = v_org_id WHERE user_id = r.id;
        UPDATE security.webhook_endpoints SET organization_id = v_org_id WHERE user_id = r.id;
    END LOOP;
END $$;

-- 10. NOT NULL CONSTRAINTS (Enforce isolation for new data)
ALTER TABLE public.invoices ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.clients ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.escalation_queue ALTER COLUMN organization_id SET NOT NULL;

-- 11. INDICES for Multi-Tenant performance
CREATE INDEX IF NOT EXISTS idx_invoices_org ON public.invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_memberships_user ON public.memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_org_links_child ON public.organization_links(child_org_id);
