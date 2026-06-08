-- SQL Script to dynamically synchronize organization subscriptions based on user profile plans.
-- Apply this under your Supabase Dashboard -> SQL Editor to ensure Row Level enforce rules are always perfectly aligned with users who have purchased Pro or Enterprise plans.

-- 1. Helper function to sync a single organization to a plan slug
CREATE OR REPLACE FUNCTION security.sync_org_sub(p_org_id UUID, p_plan_slug TEXT)
RETURNS VOID AS $$
DECLARE
    v_plan_id UUID;
BEGIN
    SELECT id INTO v_plan_id FROM security.plans WHERE slug = COALESCE(p_plan_slug, 'free');
    
    IF v_plan_id IS NOT NULL THEN
        IF EXISTS (SELECT 1 FROM security.subscriptions WHERE organization_id = p_org_id) THEN
            UPDATE security.subscriptions SET
                plan_id = v_plan_id,
                status = 'active',
                updated_at = now()
            WHERE organization_id = p_org_id;
        ELSE
            INSERT INTO security.subscriptions (
                organization_id, plan_id, status, current_period_start, current_period_end
            ) VALUES (
                p_org_id, 
                v_plan_id, 
                'active', 
                now(), 
                now() + interval '100 years'
            );
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Create the main trigger synchronization function
CREATE OR REPLACE FUNCTION security.sync_organization_subscription_to_owner()
RETURNS TRIGGER AS $$
DECLARE
    v_owner_user_id UUID;
    v_user_plan TEXT;
    v_org_id UUID;
BEGIN
    -- Case A: Invoked by update on public.users (User altered their plan)
    IF TG_TABLE_NAME = 'users' THEN
        FOR v_org_id IN 
            SELECT organization_id FROM public.memberships 
            WHERE user_id = NEW.id AND role = 'owner' AND is_active = true
        LOOP
            PERFORM security.sync_org_sub(v_org_id, NEW.plan);
        END LOOP;
        RETURN NEW;
    END IF;

    -- Case B: Invoked by memberships insert/update (Membership setup changed)
    IF TG_TABLE_NAME = 'memberships' THEN
        IF NEW.role = 'owner' AND NEW.is_active = true THEN
            v_org_id := NEW.organization_id;
            v_owner_user_id := NEW.user_id;
        ELSE
            -- Find the current owner of this organization
            SELECT user_id, organization_id INTO v_owner_user_id, v_org_id
            FROM public.memberships
            WHERE organization_id = NEW.organization_id
            AND role = 'owner'
            AND is_active = true
            LIMIT 1;
        END IF;

        IF v_owner_user_id IS NOT NULL AND v_org_id IS NOT NULL THEN
            SELECT plan INTO v_user_plan FROM public.users WHERE id = v_owner_user_id;
            PERFORM security.sync_org_sub(v_org_id, v_user_plan);
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. Bind trigers for real-time synchronization
DROP TRIGGER IF EXISTS tr_sync_org_sub_users ON public.users;
CREATE TRIGGER tr_sync_org_sub_users
  AFTER UPDATE OF plan ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION security.sync_organization_subscription_to_owner();

DROP TRIGGER IF EXISTS tr_sync_org_sub_memberships ON public.memberships;
CREATE TRIGGER tr_sync_org_sub_memberships
  AFTER INSERT OR UPDATE OF role, is_active ON public.memberships
  FOR EACH ROW
  EXECUTE FUNCTION security.sync_organization_subscription_to_owner();

-- 4. Retroactively sync all existing organization subscriptions based on their current owners
DO $$
DECLARE
    v_membership RECORD;
    v_user_plan TEXT;
BEGIN
    FOR v_membership IN 
        SELECT organization_id, user_id 
        FROM public.memberships 
        WHERE role = 'owner' AND is_active = true
    LOOP
        SELECT plan INTO v_user_plan 
        FROM public.users 
        WHERE id = v_membership.user_id;
        
        IF v_user_plan IS NOT NULL THEN
            PERFORM security.sync_org_sub(v_membership.organization_id, v_user_plan);
        END IF;
    END LOOP;
END;
$$;
