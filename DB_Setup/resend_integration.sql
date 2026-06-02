-- 1. Create audit_log in public if it doesn't exist
CREATE TABLE IF NOT EXISTS public.audit_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    entity_id UUID NOT NULL, -- Generic ID (invoices, clients, etc.)
    entity_type TEXT NOT NULL, -- 'invoice', 'client', etc.
    organization_id UUID REFERENCES public.organizations(id),
    audit_type TEXT NOT NULL,
    recipient_email TEXT,
    delivery_status TEXT,
    meta JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Add columns if table existed but columns were missing
ALTER TABLE public.audit_log ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE public.audit_log ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE public.audit_log ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

-- 3. RLS for audit_log
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view logs for their organization" ON public.audit_log;
CREATE POLICY "Users can view logs for their organization" ON public.audit_log
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
        )
    );

-- 4. Index for fast daily cap checking
CREATE INDEX IF NOT EXISTS idx_audit_log_email_cap ON public.audit_log (created_at) WHERE audit_type = 'email_sent';

-- 5. Function to check daily email cap
CREATE OR REPLACE FUNCTION public.check_daily_email_cap()
RETURNS BOOLEAN AS $$
DECLARE
    email_count INTEGER;
BEGIN
    SELECT count(*) INTO email_count
    FROM public.audit_log
    WHERE audit_type = 'email_sent'
    AND created_at >= CURRENT_DATE;
    
    RETURN email_count < 90;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
