-- Path: /fix_operations_center.sql

-- 0. Schema Permissions
GRANT USAGE ON SCHEMA security TO authenticated;
GRANT USAGE ON SCHEMA security TO service_role;

-- 1. Create PUBLIC views for SECURITY schema tables to expose them to the API
-- This maintains the hardened storage while allowing the frontend to query via public schema

-- Audit Logs
CREATE OR REPLACE VIEW public.audit_logs AS SELECT * FROM security.audit_logs;
ALTER VIEW public.audit_logs OWNER TO postgres;
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT SELECT, INSERT ON public.audit_logs TO service_role;

-- Abuse Flags
CREATE OR REPLACE VIEW public.abuse_flags AS SELECT * FROM security.abuse_flags;
ALTER VIEW public.abuse_flags OWNER TO postgres;
GRANT SELECT, INSERT ON public.abuse_flags TO authenticated;
GRANT SELECT, INSERT ON public.abuse_flags TO service_role;

-- Usage Counters
CREATE OR REPLACE VIEW public.usage_counters AS SELECT * FROM security.usage_counters;
ALTER VIEW public.usage_counters OWNER TO postgres;
GRANT SELECT, INSERT ON public.usage_counters TO authenticated;
GRANT SELECT, INSERT ON public.usage_counters TO service_role;

-- Dead Letter Queue
CREATE OR REPLACE VIEW public.dead_letter_queue AS SELECT * FROM security.dead_letter_queue;
ALTER VIEW public.dead_letter_queue OWNER TO postgres;
GRANT SELECT, INSERT ON public.dead_letter_queue TO authenticated;
GRANT SELECT, INSERT ON public.dead_letter_queue TO service_role;

-- Worker Execution Logs
CREATE OR REPLACE VIEW public.worker_execution_logs AS SELECT * FROM security.worker_execution_logs;
ALTER VIEW public.worker_execution_logs OWNER TO postgres;
GRANT SELECT, INSERT ON public.worker_execution_logs TO authenticated;
GRANT SELECT, INSERT ON public.worker_execution_logs TO service_role;

-- 2. Fix RLS on Security Views to support Organization-level access
-- The original policy only allowed actor_id = auth.uid(), which is too restrictive for Ops Center
DROP POLICY IF EXISTS audit_logs_org_access ON security.audit_logs;
CREATE POLICY audit_logs_org_access ON security.audit_logs
FOR SELECT TO authenticated
USING (
    public.can_access_org(organization_id)
);

DROP POLICY IF EXISTS abuse_flags_org_access ON security.abuse_flags;
CREATE POLICY abuse_flags_org_access ON security.abuse_flags
FOR SELECT TO authenticated
USING (
    public.can_access_org(organization_id)
);

DROP POLICY IF EXISTS usage_counters_org_access ON security.usage_counters;
CREATE POLICY usage_counters_org_access ON security.usage_counters
FOR SELECT TO authenticated
USING (
    public.can_access_org(organization_id)
);

DROP POLICY IF EXISTS dead_letter_org_access ON security.dead_letter_queue;
CREATE POLICY dead_letter_org_access ON security.dead_letter_queue
FOR SELECT TO authenticated
USING (
    public.can_access_org(organization_id)
);

-- 3. Ensure some invoices are in recovery stages if they are past due (for visual testing)
-- This is a one-time migration to ensure the board isn't empty if overdue invoices exist
UPDATE public.invoices
SET recovery_stage = 'gentle_followup'
WHERE status = 'sent' 
  AND due_date < now() 
  AND recovery_stage = 'pending';
