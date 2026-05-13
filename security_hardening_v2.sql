-- GROUP 4B: COMMERCIAL + RUNTIME HARDENING
-- Platform: Paydrip
-- Version: 2.1.0 (Enterprise)

-- 1. BILLING & PLAN ARCHITECTURE
CREATE TABLE IF NOT EXISTS security.plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    price_monthly INT DEFAULT 0,
    limits JSONB NOT NULL DEFAULT '{
        "ai_generations": 10,
        "invoices_month": 50,
        "automations_active": 5,
        "team_seats": 1,
        "retention_days": 30
    }'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS security.subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) UNIQUE,
    plan_id UUID NOT NULL REFERENCES security.plans(id),
    status TEXT NOT NULL CHECK (status IN ('active', 'past_due', 'canceled', 'incomplete', 'trialing')),
    current_period_start TIMESTAMPTZ NOT NULL,
    current_period_end TIMESTAMPTZ NOT NULL,
    cancel_at_period_end BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS security.usage_counters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    metric TEXT NOT NULL, -- ai_generations, invoices_processed, etc.
    count INT DEFAULT 0,
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    UNIQUE(user_id, metric, period_start)
);

-- 2. WEBHOOK HARDENING
CREATE TABLE IF NOT EXISTS security.webhook_endpoints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    url TEXT NOT NULL,
    secret TEXT NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
    events TEXT[] DEFAULT '{*}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS security.webhook_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    endpoint_id UUID REFERENCES security.webhook_endpoints(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    response_status INT,
    response_body TEXT,
    duration_ms INT,
    attempt_count INT DEFAULT 1,
    ip_address INET,
    signature_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. DEAD LETTER QUEUE (DLQ)
CREATE TABLE IF NOT EXISTS security.dead_letter_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    original_queue_id UUID, -- Optional link to escalation_queue
    user_id UUID REFERENCES auth.users(id),
    action_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    last_error TEXT,
    failure_reason TEXT CHECK (failure_reason IN ('poison_job', 'max_retries', 'quota_exceeded', 'invalid_payload', 'system_error')),
    quarantined_at TIMESTAMPTZ DEFAULT now(),
    resolved_at TIMESTAMPTZ,
    resolution_note TEXT
);

-- 4. REQUEST FINGERPRINTING & BEHAVIOR
CREATE TABLE IF NOT EXISTS security.request_fingerprints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    fingerprint_hash TEXT NOT NULL, -- SHA256(IP + UA + AcceptLang)
    ip_hash TEXT NOT NULL,
    user_agent TEXT,
    last_seen_at TIMESTAMPTZ DEFAULT now(),
    trust_score FLOAT DEFAULT 1.0,
    metadata JSONB DEFAULT '{}'::jsonb,
    UNIQUE(user_id, fingerprint_hash)
);

-- 5. ENFORCEMENT & ENTITLEMENT RESOLVER

CREATE OR REPLACE FUNCTION security.resolve_entitlement(
    p_user_id UUID,
    p_metric TEXT
) RETURNS INT AS $$
DECLARE
    v_limit INT;
    v_plan_limits JSONB;
BEGIN
    SELECT p.limits INTO v_plan_limits
    FROM security.subscriptions s
    JOIN security.plans p ON s.plan_id = p.id
    WHERE s.user_id = p_user_id AND s.status = 'active';

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
    p_user_id UUID,
    p_metric TEXT,
    p_amount INT DEFAULT 1
) RETURNS BOOLEAN AS $$
DECLARE
    v_limit INT;
    v_current INT;
    v_period_start TIMESTAMPTZ := date_trunc('month', now());
    v_period_end TIMESTAMPTZ := v_period_start + interval '1 month';
BEGIN
    v_limit := security.resolve_entitlement(p_user_id, p_metric);
    
    INSERT INTO security.usage_counters (user_id, metric, count, period_start, period_end)
    VALUES (p_user_id, p_metric, p_amount, v_period_start, v_period_end)
    ON CONFLICT (user_id, metric, period_start) 
    DO UPDATE SET count = usage_counters.count + p_amount
    RETURNING count INTO v_current;

    IF v_current > v_limit THEN
        -- Log overage attempt
        INSERT INTO security.audit_logs (actor_id, actor_type, action, resource_type, severity, metadata)
        VALUES (p_user_id, 'user', 'usage_limit_exceeded', 'usage_counter', 'warning', 
                jsonb_build_object('metric', p_metric, 'current', v_current, 'limit', v_limit));
        RETURN FALSE;
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. WEBHOOK IDEMPOTENCY & HMAC
CREATE OR REPLACE FUNCTION security.verify_webhook_signature(
    p_payload TEXT,
    p_signature TEXT,
    p_secret TEXT
) RETURNS BOOLEAN AS $$
BEGIN
    -- Standard HMAC verification
    RETURN p_signature = encode(hmac(p_payload, p_secret, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. AUDIT LOG ENHANCEMENT
CREATE OR REPLACE FUNCTION security.fingerprint_request(
    p_user_id UUID,
    p_ip TEXT,
    p_ua TEXT
) RETURNS TEXT AS $$
DECLARE
    v_hash TEXT;
BEGIN
    v_hash := encode(digest(p_ip || p_ua, 'sha256'), 'hex');
    
    INSERT INTO security.request_fingerprints (user_id, fingerprint_hash, ip_hash, user_agent)
    VALUES (p_user_id, v_hash, encode(digest(p_ip, 'sha256'), 'hex'), p_ua)
    ON CONFLICT (user_id, fingerprint_hash) DO UPDATE
    SET last_seen_at = now();

    RETURN v_hash;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. RLS ENFORCEMENT
ALTER TABLE security.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE security.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE security.usage_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE security.webhook_endpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE security.webhook_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE security.dead_letter_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manage plans" ON security.plans FOR ALL TO service_role USING (true);
CREATE POLICY "Users view public plans" ON security.plans FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users see own subscription" ON security.subscriptions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users see own usage" ON security.usage_counters FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users manage own webhooks" ON security.webhook_endpoints FOR ALL TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users view own webhook logs" ON security.webhook_logs FOR SELECT TO authenticated 
    USING (EXISTS (SELECT 1 FROM security.webhook_endpoints WHERE id = webhook_logs.endpoint_id AND user_id = auth.uid()));

-- 9. INDICES
CREATE INDEX idx_usage_user_metric ON security.usage_counters (user_id, metric, period_start);
CREATE INDEX idx_dlq_reason ON security.dead_letter_queue (failure_reason, quarantined_at);
CREATE INDEX idx_webhook_status ON security.webhook_logs (response_status, created_at);

-- 10. INITIAL SEED (Example Plans)
INSERT INTO security.plans (name, slug, price_monthly, limits) VALUES 
('Free', 'free', 0, '{"ai_generations": 5, "invoices_month": 10, "automations_active": 2, "team_seats": 1, "retention_days": 7}'),
('Pro', 'pro', 2900, '{"ai_generations": 100, "invoices_month": 500, "automations_active": 50, "team_seats": 3, "retention_days": 90}'),
('Enterprise', 'enterprise', 9900, '{"ai_generations": 9999, "invoices_month": 9999, "automations_active": 999, "team_seats": 20, "retention_days": 365}');
