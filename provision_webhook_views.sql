-- 1. Webhook Endpoints (secret_hash excluded)
DROP VIEW IF EXISTS public.webhook_endpoints;
CREATE VIEW public.webhook_endpoints AS 
SELECT 
  id,
  organization_id,
  created_by,
  url,
  events,
  is_active,
  created_at,
  updated_at
FROM security.webhook_endpoints;

ALTER VIEW public.webhook_endpoints OWNER TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.webhook_endpoints TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.webhook_endpoints TO service_role;

-- 2. Webhook Logs (payload, response_body, ip_address excluded)
DROP VIEW IF EXISTS public.webhook_logs;
CREATE VIEW public.webhook_logs AS 
SELECT 
  id,
  endpoint_id,
  organization_id,
  event_type,
  event_id,
  response_status,
  duration_ms,
  attempt_count,
  signature_verified,
  created_at
FROM security.webhook_logs;

ALTER VIEW public.webhook_logs OWNER TO postgres;
GRANT SELECT ON public.webhook_logs TO authenticated;
GRANT SELECT ON public.webhook_logs TO service_role;