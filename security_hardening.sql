-- ENTERPRISE SECURITY & ABUSE PROTECTION ARCHITECTURE
-- Platform: Paydrip Recovery Agent
-- Hardened Production Version

-- =====================================================
-- EXTENSIONS
-- =====================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =====================================================
-- SECURITY SCHEMA
-- =====================================================

CREATE SCHEMA IF NOT EXISTS security;

-- =====================================================
-- RATE LIMITING
-- =====================================================

CREATE TABLE IF NOT EXISTS security.rate_limit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    ip_address INET NOT NULL,
    action TEXT NOT NULL,
    request_count INT DEFAULT 1,
    window_start TIMESTAMPTZ DEFAULT now(),
    last_request_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),

    CONSTRAINT uq_rate_limit_window
    UNIQUE (user_id, ip_address, action)
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_lookup
ON security.rate_limit_logs (
    user_id,
    ip_address,
    action,
    expires_at
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_clean
ON security.rate_limit_logs (expires_at);

-- =====================================================
-- ABUSE & SPAM
-- =====================================================

CREATE TABLE IF NOT EXISTS security.abuse_flags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    ip_address INET,
    severity TEXT CHECK (
        severity IN ('low','medium','high','critical')
    ),
    reason TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS security.spam_signals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
    signal_type TEXT NOT NULL,
    score FLOAT DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- WORKER SECURITY
-- =====================================================

CREATE TABLE IF NOT EXISTS security.worker_execution_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    worker_name TEXT NOT NULL,
    execution_id UUID NOT NULL,
    status TEXT NOT NULL,
    duration_ms INT,
    batch_size INT,
    error_message TEXT,
    ip_address INET,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS security.worker_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    worker_name TEXT NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    is_revoked BOOLEAN DEFAULT false,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS security.queue_health_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    queue_name TEXT NOT NULL,
    pending_count INT DEFAULT 0,
    failure_rate FLOAT DEFAULT 0,
    avg_processing_time INT DEFAULT 0,
    last_snapshot_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- AUDIT LOGS
-- =====================================================

CREATE TABLE IF NOT EXISTS security.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id UUID,
    actor_type TEXT CHECK (
        actor_type IN ('user','system','worker','anonymous')
    ),
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id UUID,
    severity TEXT DEFAULT 'notice',
    ip_address INET,
    user_agent TEXT,
    payload_snapshot JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_resource
ON security.audit_logs(resource_type, resource_id);

CREATE INDEX IF NOT EXISTS idx_audit_time
ON security.audit_logs(created_at DESC);

-- =====================================================
-- SESSION SECURITY
-- =====================================================

CREATE TABLE IF NOT EXISTS security.active_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    session_id UUID NOT NULL,
    ip_address INET,
    user_agent TEXT,
    last_activity_at TIMESTAMPTZ DEFAULT now(),
    is_suspicious BOOLEAN DEFAULT false,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_active_sessions_user
ON security.active_sessions(user_id)
WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS security.revoked_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token_hash TEXT NOT NULL UNIQUE,
    revoked_by UUID,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- PUBLIC ACCESS SECURITY
-- =====================================================

CREATE TABLE IF NOT EXISTS security.public_access_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
    public_token TEXT NOT NULL,
    ip_address INET NOT NULL,
    user_agent TEXT,
    status TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_public_access_ip
ON security.public_access_logs(ip_address, created_at);

-- =====================================================
-- ESCALATION QUEUE HARDENING
-- =====================================================

ALTER TABLE public.escalation_queue
ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS locked_by UUID;

-- =====================================================
-- RATE LIMIT FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION security.check_rate_limit(
    p_user_id UUID,
    p_ip INET,
    p_action TEXT,
    p_limit INT,
    p_window_seconds INT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, security
AS $$
DECLARE
    v_count INT;
BEGIN

    IF EXISTS (
        SELECT 1
        FROM security.abuse_flags
        WHERE (
            user_id = p_user_id
            OR ip_address = p_ip
        )
        AND is_active = true
        AND (
            expires_at IS NULL
            OR expires_at > now()
        )
    ) THEN
        RETURN FALSE;
    END IF;

    INSERT INTO security.rate_limit_logs (
        user_id,
        ip_address,
        action,
        request_count,
        window_start,
        expires_at
    )
    VALUES (
        p_user_id,
        p_ip,
        p_action,
        1,
        now(),
        now() + (p_window_seconds || ' seconds')::interval
    )

    ON CONFLICT (user_id, ip_address, action)

    DO UPDATE SET
        request_count = CASE
            WHEN security.rate_limit_logs.window_start <
                 now() - (p_window_seconds || ' seconds')::interval
            THEN 1
            ELSE security.rate_limit_logs.request_count + 1
        END,

        window_start = CASE
            WHEN security.rate_limit_logs.window_start <
                 now() - (p_window_seconds || ' seconds')::interval
            THEN now()
            ELSE security.rate_limit_logs.window_start
        END,

        last_request_at = now()

    RETURNING request_count
    INTO v_count;

    RETURN v_count <= p_limit;

END;
$$;

-- =====================================================
-- WORKER VALIDATION
-- =====================================================

CREATE OR REPLACE FUNCTION security.validate_worker_invocation(
    p_worker_name TEXT,
    p_token TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, security
AS $$
BEGIN

    RETURN EXISTS (
        SELECT 1
        FROM security.worker_tokens
        WHERE worker_name = p_worker_name
        AND token_hash = crypt(p_token, token_hash)
        AND NOT is_revoked
        AND (
            expires_at IS NULL
            OR expires_at > now()
        )
    );

END;
$$;

-- =====================================================
-- SPAM SCORE
-- =====================================================

CREATE OR REPLACE FUNCTION security.calculate_spam_score(
    p_user_id UUID,
    p_invoice_id UUID
)
RETURNS FLOAT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, security
AS $$
DECLARE
    v_reminder_count INT;
    v_recent_signals INT;
BEGIN

    SELECT count(*)
    INTO v_reminder_count
    FROM public.reminder_timeline
    WHERE invoice_id = p_invoice_id
    AND sent_at > now() - interval '24 hours';

    SELECT count(*)
    INTO v_recent_signals
    FROM security.spam_signals
    WHERE invoice_id = p_invoice_id
    AND created_at > now() - interval '7 days';

    RETURN
        (v_reminder_count * 0.4)
        + (v_recent_signals * 0.2);

END;
$$;

-- =====================================================
-- SIGNED TOKEN VALIDATION
-- =====================================================

CREATE OR REPLACE FUNCTION security.verify_invoice_token(
    p_invoice_id UUID,
    p_token TEXT,
    p_secret TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, security
AS $$
BEGIN

    RETURN p_token = encode(
        hmac(
            p_invoice_id::text,
            p_secret,
            'sha256'
        ),
        'hex'
    );

END;
$$;

-- =====================================================
-- CLEANUP
-- =====================================================

CREATE OR REPLACE FUNCTION security.cleanup_expired_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, security
AS $$
BEGIN

    DELETE FROM security.rate_limit_logs
    WHERE expires_at < now();

    DELETE FROM security.audit_logs
    WHERE created_at < now() - interval '90 days';

    DELETE FROM security.public_access_logs
    WHERE created_at < now() - interval '30 days';

END;
$$;

-- =====================================================
-- AUDIT TRIGGER
-- =====================================================

CREATE OR REPLACE FUNCTION security.log_invoice_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, security
AS $$
BEGIN

    IF OLD.status IS DISTINCT FROM NEW.status THEN

        INSERT INTO security.audit_logs (
            actor_id,
            actor_type,
            action,
            resource_type,
            resource_id,
            severity,
            payload_snapshot
        )
        VALUES (
            COALESCE(auth.uid(), NEW.user_id),
            'user',
            'status_update',
            'invoice',
            NEW.id,
            'notice',

            jsonb_build_object(
                'old_status', OLD.status,
                'new_status', NEW.status
            )
        );

    END IF;

    RETURN NEW;

END;
$$;

DROP TRIGGER IF EXISTS tr_audit_invoice_status
ON public.invoices;

CREATE TRIGGER tr_audit_invoice_status
AFTER UPDATE OF status
ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION security.log_invoice_status_change();

-- =====================================================
-- RLS
-- =====================================================

ALTER TABLE security.rate_limit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE security.abuse_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE security.spam_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE security.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE security.worker_execution_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE security.worker_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE security.queue_health_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE security.active_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE security.revoked_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE security.public_access_logs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- SERVICE ROLE POLICIES
-- =====================================================

CREATE POLICY service_role_audit_logs
ON security.audit_logs
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY service_role_rate_limits
ON security.rate_limit_logs
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY service_role_abuse
ON security.abuse_flags
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY service_role_sessions
ON security.active_sessions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY users_view_own_audit
ON security.audit_logs
FOR SELECT
TO authenticated
USING (actor_id = auth.uid());

CREATE POLICY users_view_own_sessions
ON security.active_sessions
FOR SELECT
TO authenticated
USING (user_id = auth.uid());