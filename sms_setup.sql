-- Path: /sms_setup.sql

-- 1A. ADD SMS PREFERENCES TO INVOICES
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS delivery_channel TEXT 
    CHECK (delivery_channel IN ('email', 'sms', 'both'))
    DEFAULT 'email';

-- 1B. ADD SMS PREFERENCES TO ORGANIZATIONS
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS sms_enabled BOOLEAN DEFAULT false;

-- 1C. CREATE SMS LOG TABLE
CREATE TABLE IF NOT EXISTS public.sms_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
  to_phone TEXT NOT NULL,
  message_body TEXT NOT NULL,
  twilio_message_sid TEXT,
  status TEXT CHECK (status IN ('queued','sent','delivered','failed','undelivered')) DEFAULT 'queued',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
DROP POLICY IF EXISTS "Users can view sms logs for their organization" ON public.sms_logs;
CREATE POLICY "Users can view sms logs for their organization"
ON public.sms_logs FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.memberships
    WHERE organization_id = sms_logs.organization_id
    AND user_id = auth.uid()
    AND is_active = true
  )
);

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_sms_org ON public.sms_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_sms_invoice ON public.sms_logs(invoice_id);
