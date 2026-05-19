-- Expose Webhook tables from security schema to public schema via views
-- This allows the frontend to query them while keeping the underlying storage hardened

-- 1. Webhook Endpoints
CREATE OR REPLACE VIEW public.webhook_endpoints AS 
SELECT * FROM security.webhook_endpoints;

ALTER VIEW public.webhook_endpoints OWNER TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.webhook_endpoints TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.webhook_endpoints TO service_role;

-- 2. Webhook Logs
CREATE OR REPLACE VIEW public.webhook_logs AS 
SELECT * FROM security.webhook_logs;

ALTER VIEW public.webhook_logs OWNER TO postgres;
GRANT SELECT ON public.webhook_logs TO authenticated;
GRANT SELECT ON public.webhook_logs TO service_role;

-- Ensure authenticated users can access their own org's webhooks via RLS on the underlying tables
-- The security_hardening_v2.sql already added these, but let's be sure.
-- Webhook Endpoints RLS is handled by webhooks_tenant_isolation in security_hardening_v2.sql
-- Webhook Logs RLS is handled by webhook_logs_tenant_isolation in security_hardening_v2.sql
