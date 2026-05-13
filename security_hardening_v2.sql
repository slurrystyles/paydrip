-- GROUP 4B — CORRECTED COMMERCIAL + RUNTIME HARDENING
-- FINAL MULTI-TENANT COMPATIBLE VERSION

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================================================
-- BILLING PLANS
-- =========================================================

CREATE TABLE IF NOT EXISTS security.plans (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

```
name TEXT NOT NULL UNIQUE,

slug TEXT NOT NULL UNIQUE,

price_monthly INT NOT NULL DEFAULT 0,

limits JSONB NOT NULL DEFAULT jsonb_build_object(
    'ai_generations', 10,
    'invoices_month', 50,
    'automations_active', 5,
    'team_seats', 1,
    'retention_days', 30
),

is_active BOOLEAN NOT NULL DEFAULT true,

created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
```

);

-- =========================================================
-- SUBSCRIPTIONS
-- =========================================================

CREATE TABLE IF NOT EXISTS security.subscriptions (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

```
organization_id UUID NOT NULL
    REFERENCES public.organizations(id)
    ON DELETE CASCADE,

plan_id UUID NOT NULL
    REFERENCES security.plans(id),

status TEXT NOT NULL CHECK (
    status IN (
        'active',
        'past_due',
        'canceled',
        'incomplete',
        'trialing'
    )
),

current_period_start TIMESTAMPTZ NOT NULL,
current_period_end TIMESTAMPTZ NOT NULL,

cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,

metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
```

);

CREATE UNIQUE INDEX IF NOT EXISTS idx_subscription_active_org
ON security.subscriptions(organization_id)
WHERE status IN ('active', 'trialing');

-- =========================================================
-- USAGE COUNTERS
-- =========================================================

CREATE TABLE IF NOT EXISTS security.usage_counters (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

```
organization_id UUID NOT NULL
    REFERENCES public.organizations(id)
    ON DELETE CASCADE,

user_id UUID
    REFERENCES auth.users(id)
    ON DELETE SET NULL,

metric TEXT NOT NULL,

count INT NOT NULL DEFAULT 0 CHECK (count >= 0),

period_start TIMESTAMPTZ NOT NULL,
period_end TIMESTAMPTZ NOT NULL,

created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

UNIQUE (
    organization_id,
    metric,
    period_start
)
```

);

-- =========================================================
-- WEBHOOK ENDPOINTS
-- =========================================================

CREATE TABLE IF NOT EXISTS security.webhook_endpoints (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

```
organization_id UUID NOT NULL
    REFERENCES public.organizations(id)
    ON DELETE CASCADE,

created_by UUID
    REFERENCES auth.users(id),

url TEXT NOT NULL
    CHECK (url ~ '^https://'),

secret_hash TEXT NOT NULL,

events TEXT[] NOT NULL DEFAULT ARRAY['*'],

is_active BOOLEAN NOT NULL DEFAULT true,

created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
```

);

-- =========================================================
-- WEBHOOK LOGS
-- =========================================================

CREATE TABLE IF NOT EXISTS security.webhook_logs (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

```
endpoint_id UUID
    REFERENCES security.webhook_endpoints(id)
    ON DELETE CASCADE,

organization_id UUID NOT NULL
    REFERENCES public.organizations(id)
    ON DELETE CASCADE,

event_type TEXT NOT NULL,

event_id TEXT,

payload JSONB NOT NULL,

response_status INT,

response_body TEXT,

duration_ms INT,

attempt_count INT NOT NULL DEFAULT 1,

ip_address INET,

signature_verified BOOLEAN NOT NULL DEFAULT false,

created_at TIMESTAMPTZ NOT NULL DEFAULT now()
```

);

CREATE UNIQUE INDEX IF NOT EXISTS idx_webhook_event_unique
ON security.webhook_logs(endpoint_id, event_id)
WHERE event_id IS NOT NULL;

-- =========================================================
-- DEAD LETTER QUEUE
-- =========================================================

CREATE TABLE IF NOT EXISTS security.dead_letter_queue (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

```
organization_id UUID NOT NULL
    REFERENCES public.organizations(id)
    ON DELETE CASCADE,

original_queue_id UUID,

user_id UUID
    REFERENCES auth.users(id),

action_type TEXT NOT NULL,

payload JSONB NOT NULL,

last_error TEXT,

failure_reason TEXT CHECK (
    failure_reason IN (
        'poison_job',
        'max_retries',
        'quota_exceeded',
        'invalid_payload',
        'system_error'
    )
),

retry_count INT NOT NULL DEFAULT 0 CHECK (retry_count >= 0),

quarantined_at TIMESTAMPTZ NOT NULL DEFAULT now(),

resolved_at TIMESTAMPTZ,

resolution_note TEXT
```

);

-- =========================================================
-- REQUEST FINGERPRINTS
-- =========================================================

CREATE TABLE IF NOT EXISTS security.request_fingerprints (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

```
organization_id UUID
    REFERENCES public.organizations(id)
    ON DELETE CASCADE,

user_id UUID
    REFERENCES auth.users(id)
    ON DELETE SET NULL,

fingerprint_hash TEXT NOT NULL,

ip_hash TEXT NOT NULL,

user_agent TEXT,

last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),

trust_score FLOAT NOT NULL DEFAULT 1.0,

metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

UNIQUE(user_id, fingerprint_hash)
```

);

-- =========================================================
-- UPDATED_AT TRIGGER FUNCTION
-- =========================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$$;

-- =========================================================
-- ENTITLEMENT RESOLVER
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
v_plan_limits JSONB;
BEGIN

```
SELECT p.limits
INTO v_plan_limits
FROM security.subscriptions s
JOIN security.plans p
    ON p.id = s.plan_id
WHERE
    s.organization_id = p_org_id
    AND s.status IN ('active', 'trialing')
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
```

END;
$$;

-- =========================================================
-- USAGE INCREMENT
-- =========================================================

CREATE OR REPLACE FUNCTION security.increment_usage(
p_org_id UUID,
p_metric TEXT,
p_amount INT DEFAULT 1,
p_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, security
AS $$
DECLARE
v_limit INT;
v_current INT;
v_period_start TIMESTAMPTZ;
v_period_end TIMESTAMPTZ;
BEGIN

```
v_period_start := date_trunc('month', now());
v_period_end := v_period_start + interval '1 month';

v_limit := security.resolve_entitlement(
    p_org_id,
    p_metric
);

INSERT INTO security.usage_counters (
    organization_id,
    user_id,
    metric,
    count,
    period_start,
    period_end
)
VALUES (
    p_org_id,
    p_user_id,
    p_metric,
    p_amount,
    v_period_start,
    v_period_end
)
ON CONFLICT (
    organization_id,
    metric,
    period_start
)
DO UPDATE SET
    count = security.usage_counters.count + p_amount
RETURNING count
INTO v_current;

RETURN v_current <= v_limit;
```

END;
$$;

-- =========================================================
-- WEBHOOK SIGNATURE VERIFY
-- =========================================================

CREATE OR REPLACE FUNCTION security.verify_webhook_signature(
p_payload TEXT,
p_signature TEXT,
p_secret TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = security
AS $$
DECLARE
v_expected TEXT;
BEGIN

```
v_expected := encode(
    hmac(
        p_payload,
        p_secret,
        'sha256'
    ),
    'hex'
);

RETURN v_expected = p_signature;
```

END;
$$;

-- =========================================================
-- REQUEST FINGERPRINTING
-- =========================================================

CREATE OR REPLACE FUNCTION security.fingerprint_request(
p_org_id UUID,
p_user_id UUID,
p_ip TEXT,
p_ua TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = security
AS $$
DECLARE
v_hash TEXT;
BEGIN

```
v_hash := encode(
    digest(
        coalesce(p_ip, '') || coalesce(p_ua, ''),
        'sha256'
    ),
    'hex'
);

INSERT INTO security.request_fingerprints (
    organization_id,
    user_id,
    fingerprint_hash,
    ip_hash,
    user_agent
)
VALUES (
    p_org_id,
    p_user_id,
    v_hash,
    encode(digest(coalesce(p_ip, ''), 'sha256'), 'hex'),
    p_ua
)
ON CONFLICT (
    user_id,
    fingerprint_hash
)
DO UPDATE SET
    last_seen_at = now();

RETURN v_hash;
```

END;
$$;

-- =========================================================
-- ENABLE RLS
-- =========================================================

ALTER TABLE security.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE security.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE security.usage_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE security.webhook_endpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE security.webhook_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE security.dead_letter_queue ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- DROP EXISTING POLICIES
-- =========================================================

DROP POLICY IF EXISTS plans_public_read
ON security.plans;

DROP POLICY IF EXISTS subscriptions_tenant_isolation
ON security.subscriptions;

DROP POLICY IF EXISTS usage_tenant_isolation
ON security.usage_counters;

DROP POLICY IF EXISTS webhooks_tenant_isolation
ON security.webhook_endpoints;

DROP POLICY IF EXISTS webhook_logs_tenant_isolation
ON security.webhook_logs;

DROP POLICY IF EXISTS dlq_tenant_isolation
ON security.dead_letter_queue;

-- =========================================================
-- CREATE POLICIES
-- =========================================================

CREATE POLICY plans_public_read
ON security.plans
FOR SELECT
TO authenticated
USING (is_active = true);

CREATE POLICY subscriptions_tenant_isolation
ON security.subscriptions
FOR SELECT
USING (
public.can_access_org(organization_id)
);

CREATE POLICY usage_tenant_isolation
ON security.usage_counters
FOR SELECT
USING (
public.can_access_org(organization_id)
);

CREATE POLICY webhooks_tenant_isolation
ON security.webhook_endpoints
FOR ALL
USING (
public.can_access_org(organization_id)
)
WITH CHECK (
public.can_access_org(organization_id)
);

CREATE POLICY webhook_logs_tenant_isolation
ON security.webhook_logs
FOR SELECT
USING (
public.can_access_org(organization_id)
);

CREATE POLICY dlq_tenant_isolation
ON security.dead_letter_queue
FOR SELECT
USING (
public.can_access_org(organization_id)
);

-- =========================================================
-- UPDATED_AT TRIGGERS
-- =========================================================

DROP TRIGGER IF EXISTS tr_plans_updated_at
ON security.plans;

CREATE TRIGGER tr_plans_updated_at
BEFORE UPDATE
ON security.plans
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS tr_subscriptions_updated_at
ON security.subscriptions;

CREATE TRIGGER tr_subscriptions_updated_at
BEFORE UPDATE
ON security.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS tr_webhooks_updated_at
ON security.webhook_endpoints;

CREATE TRIGGER tr_webhooks_updated_at
BEFORE UPDATE
ON security.webhook_endpoints
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- INDEXES
-- =========================================================

CREATE INDEX IF NOT EXISTS idx_subscriptions_org
ON security.subscriptions(organization_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_status
ON security.subscriptions(status);

CREATE INDEX IF NOT EXISTS idx_usage_org_metric
ON security.usage_counters(
organization_id,
metric,
period_start
);

CREATE INDEX IF NOT EXISTS idx_usage_period
ON security.usage_counters(
period_start,
period_end
);

CREATE INDEX IF NOT EXISTS idx_webhooks_org
ON security.webhook_endpoints(organization_id);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_org
ON security.webhook_logs(organization_id);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_created
ON security.webhook_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_dlq_org
ON security.dead_letter_queue(organization_id);

CREATE INDEX IF NOT EXISTS idx_dlq_quarantined
ON security.dead_letter_queue(quarantined_at DESC);

CREATE INDEX IF NOT EXISTS idx_fingerprint_user
ON security.request_fingerprints(user_id);

-- =========================================================
-- SEED PLANS
-- =========================================================

INSERT INTO security.plans (
name,
slug,
price_monthly,
limits
)
VALUES
(
'Free',
'free',
0,
'{"ai_generations":5,"invoices_month":10,"automations_active":2,"team_seats":1,"retention_days":7}'
),
(
'Pro',
'pro',
2900,
'{"ai_generations":100,"invoices_month":500,"automations_active":50,"team_seats":3,"retention_days":90}'
),
(
'Enterprise',
'enterprise',
9900,
'{"ai_generations":9999,"invoices_month":9999,"automations_active":999,"team_seats":20,"retention_days":365}'
)
ON CONFLICT (slug)
DO NOTHING;
