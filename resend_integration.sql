-- Add specific tracking for email delivery in audit_log and invoices
ALTER TABLE public.audit_log ADD COLUMN IF NOT EXISTS recipient_email TEXT;
ALTER TABLE public.audit_log ADD COLUMN IF NOT EXISTS delivery_status TEXT;

-- Index for fast daily cap checking
CREATE INDEX IF NOT EXISTS idx_audit_log_email_cap ON public.audit_log (created_at) WHERE audit_type = 'email_sent';

-- Function to check daily email cap
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
