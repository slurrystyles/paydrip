-- Path: /usage_limits.sql (FIXED)

-- 1. DATABASE SCHEMA UPDATES
ALTER TABLE security.plans
  ADD COLUMN IF NOT EXISTS price_monthly_usd NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_yearly_usd NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '[]'::jsonb;

-- Update plans with USD pricing and features
UPDATE security.plans SET
  price_monthly_usd = 0,
  price_yearly_usd = 0,
  limits = limits || '{"invoices_month": 10}'::jsonb,
  features = '["5 clients","10 invoices/month","Manual reminders","Email delivery","Basic dashboard"]'::jsonb
WHERE slug = 'free';

UPDATE security.plans SET
  price_monthly_usd = 12,
  price_yearly_usd = 99,
  features = '["Unlimited clients","Unlimited invoices","Automated sequences","AI messages","Custom branding","Analytics","Notification center","WhatsApp prompt"]'::jsonb
WHERE slug = 'pro';

UPDATE security.plans SET
  price_monthly_usd = 39,
  price_yearly_usd = 299,
  features = '["Everything in Pro","White-label","Webhooks","RBAC","SMS delivery","Custom domain","SSO","Dedicated support"]'::jsonb
WHERE slug = 'enterprise';

ALTER TABLE security.subscriptions
  ADD COLUMN IF NOT EXISTS plan_interval TEXT 
    CHECK (plan_interval IN ('monthly', 'yearly')) DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'usd',
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP WITH TIME ZONE;

-- Seed free subscription for all existing organizations
INSERT INTO security.subscriptions (
  organization_id, plan_id, status, 
  current_period_start, current_period_end
)
SELECT 
  o.id,
  (SELECT id FROM security.plans WHERE slug = 'free'),
  'active',
  now(),
  now() + interval '100 years'
FROM public.organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM security.subscriptions s 
  WHERE s.organization_id = o.id
);

-- 2. HELPER FUNCTIONS

CREATE OR REPLACE FUNCTION public.get_org_plan_limits(p_org_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_limits JSONB;
BEGIN
    SELECT p.limits INTO v_limits
    FROM security.subscriptions s
    JOIN security.plans p ON s.plan_id = p.id
    WHERE s.organization_id = p_org_id
    AND s.status = 'active'
    LIMIT 1;

    IF v_limits IS NULL THEN
        SELECT limits INTO v_limits FROM security.plans WHERE slug = 'free';
    END IF;

    RETURN v_limits;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.check_usage_limit(
  p_org_id UUID, 
  p_limit_key TEXT
) RETURNS JSONB AS $$
DECLARE
    v_limits JSONB;
    v_limit_val INTEGER;
    v_current_usage INTEGER := 0;
    v_plan_slug TEXT;
    v_allowed BOOLEAN := true;
BEGIN
    SELECT p.limits, p.slug INTO v_limits, v_plan_slug
    FROM security.subscriptions s
    JOIN security.plans p ON s.plan_id = p.id
    WHERE s.organization_id = p_org_id
    AND s.status = 'active'
    LIMIT 1;

    IF v_limits IS NULL THEN
        SELECT limits, slug INTO v_limits, v_plan_slug 
        FROM security.plans WHERE slug = 'free';
    END IF;

    v_limit_val := (v_limits->>p_limit_key)::INTEGER;

    -- If limit is -1 or 9999 treat as unlimited
    IF v_limit_val = -1 OR v_limit_val >= 9999 THEN
        RETURN jsonb_build_object(
            'allowed', true,
            'current', 0,
            'limit', -1,
            'plan', v_plan_slug
        );
    END IF;

    CASE p_limit_key
        WHEN 'invoices_month' THEN
            SELECT COUNT(*)::INTEGER INTO v_current_usage
            FROM public.invoices
            WHERE organization_id = p_org_id
            AND created_at >= date_trunc('month', now());
            
        WHEN 'team_seats' THEN
            SELECT COUNT(*)::INTEGER INTO v_current_usage
            FROM public.memberships
            WHERE organization_id = p_org_id
            AND is_active = true;
            
        WHEN 'ai_generations' THEN
            SELECT COUNT(*)::INTEGER INTO v_current_usage
            FROM public.audit_log
            WHERE organization_id = p_org_id
            AND audit_type = 'ai_template_generated'
            AND created_at >= date_trunc('month', now());

        WHEN 'automations_active' THEN
            SELECT COUNT(*)::INTEGER INTO v_current_usage
            FROM public.follow_up_sequences
            WHERE organization_id = p_org_id
            AND status = 'active';  -- FIX: was is_active = true
            
        ELSE
            v_current_usage := 0;
    END CASE;

    IF v_current_usage >= v_limit_val THEN
        v_allowed := false;
    END IF;

    RETURN jsonb_build_object(
        'allowed', v_allowed,
        'current', v_current_usage,
        'limit', v_limit_val,
        'plan', v_plan_slug
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. ENFORCEMENT TRIGGERS

-- FIX: Drop existing triggers first
DROP TRIGGER IF EXISTS tr_enforce_invoice_limit ON public.invoices;
DROP TRIGGER IF EXISTS tr_enforce_team_seats_limit ON public.memberships;
DROP TRIGGER IF EXISTS tr_enforce_automations_limit ON public.follow_up_sequences;

-- Invoice limit trigger
CREATE OR REPLACE FUNCTION public.enforce_invoice_limit()
RETURNS TRIGGER AS $$
DECLARE
    v_check JSONB;
BEGIN
    -- Safe fallback: if check fails, allow the action
    BEGIN
        v_check := public.check_usage_limit(NEW.organization_id, 'invoices_month');
        IF NOT (v_check->>'allowed')::BOOLEAN THEN
            RAISE EXCEPTION 'Invoice limit reached for your plan. Upgrade to Pro for unlimited invoices.';
        END IF;
    EXCEPTION WHEN OTHERS THEN
        -- Log warning but don't block
        RAISE WARNING 'Invoice limit check failed: %', SQLERRM;
    END;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_enforce_invoice_limit
BEFORE INSERT ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.enforce_invoice_limit();

-- Team seats limit trigger
CREATE OR REPLACE FUNCTION public.enforce_team_seats_limit()
RETURNS TRIGGER AS $$
DECLARE
    v_check JSONB;
BEGIN
    -- FIX: Always allow first member (org creator)
    IF NOT EXISTS (
        SELECT 1 FROM public.memberships 
        WHERE organization_id = NEW.organization_id
    ) THEN
        RETURN NEW;
    END IF;

    -- Safe fallback: if check fails, allow the action
    BEGIN
        v_check := public.check_usage_limit(NEW.organization_id, 'team_seats');
        IF NOT (v_check->>'allowed')::BOOLEAN THEN
            RAISE EXCEPTION 'Team seat limit reached for your plan. Upgrade to Pro for more seats.';
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Team seats limit check failed: %', SQLERRM;
    END;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_enforce_team_seats_limit
BEFORE INSERT ON public.memberships
FOR EACH ROW EXECUTE FUNCTION public.enforce_team_seats_limit();

-- Automations limit trigger
CREATE OR REPLACE FUNCTION public.enforce_automations_limit()
RETURNS TRIGGER AS $$
DECLARE
    v_check JSONB;
BEGIN
    -- Safe fallback: if check fails, allow the action
    BEGIN
        v_check := public.check_usage_limit(NEW.organization_id, 'automations_active');
        IF NOT (v_check->>'allowed')::BOOLEAN THEN
            RAISE EXCEPTION 'Active automation limit reached for your plan. Upgrade to Pro to enable more sequences.';
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Automations limit check failed: %', SQLERRM;
    END;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_enforce_automations_limit
BEFORE INSERT ON public.follow_up_sequences
FOR EACH ROW EXECUTE FUNCTION public.enforce_automations_limit();