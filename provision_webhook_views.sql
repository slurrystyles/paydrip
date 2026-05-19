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

-- 2. Webhook Logs
DROP VIEW IF EXISTS public.webhook_logs;
CREATE VIEW public.webhook_logs AS 
SELECT * FROM security.webhook_logs;

ALTER VIEW public.webhook_logs OWNER TO postgres;
GRANT SELECT ON public.webhook_logs TO authenticated;
GRANT SELECT ON public.webhook_logs TO service_role;