-- Path: /template_management.sql (FIXED)

-- 0. Fix enum if needed
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'membership_role') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'membership_role' AND e.enumlabel = 'member') THEN
            ALTER TYPE membership_role ADD VALUE 'member';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'membership_role' AND e.enumlabel = 'viewer') THEN
            ALTER TYPE membership_role ADD VALUE 'viewer';
        END IF;
    END IF;
END $$;

-- 1. Create email_templates table
CREATE TABLE IF NOT EXISTS public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  template_type TEXT CHECK (template_type IN (
    'reminder_polite', 'reminder_firm', 'reminder_final', 
    'invoice_created', 'invoice_paid', 'custom'
  )) NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT,
  variables JSONB DEFAULT '["client_name","invoice_number","amount","due_date","days_overdue","payment_link","business_name"]'::jsonb,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  ai_generated BOOLEAN DEFAULT false,
  ai_prompt TEXT,
  performance_data JSONB DEFAULT '{
    "times_used": 0,
    "payments_triggered": 0,
    "response_rate": 0
  }'::jsonb,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Unique constraint for ON CONFLICT to work
ALTER TABLE public.email_templates
  DROP CONSTRAINT IF EXISTS unique_default_template;
ALTER TABLE public.email_templates
  ADD CONSTRAINT unique_default_template
  UNIQUE (template_type, is_default)
  DEFERRABLE INITIALLY DEFERRED;

-- 3. Enable RLS
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
DROP POLICY IF EXISTS "Users can view templates in their organization" ON public.email_templates;
CREATE POLICY "Users can view templates in their organization"
ON public.email_templates FOR SELECT TO authenticated
USING (
  organization_id IS NULL OR
  EXISTS (
    SELECT 1 FROM public.memberships
    WHERE organization_id = email_templates.organization_id
    AND user_id = auth.uid()
    AND is_active = true
  )
);

DROP POLICY IF EXISTS "Members can create templates" ON public.email_templates;
CREATE POLICY "Members can create templates"
ON public.email_templates FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.memberships
    WHERE organization_id = email_templates.organization_id  -- FIX: was ambiguous
    AND user_id = auth.uid()
    AND is_active = true
    AND role IN ('owner', 'admin', 'member')
  )
);

DROP POLICY IF EXISTS "Members can update templates" ON public.email_templates;
CREATE POLICY "Members can update templates"
ON public.email_templates FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.memberships
    WHERE organization_id = email_templates.organization_id
    AND user_id = auth.uid()
    AND is_active = true
    AND role IN ('owner', 'admin', 'member')
  )
);

DROP POLICY IF EXISTS "Admins can delete templates" ON public.email_templates;
CREATE POLICY "Admins can delete templates"
ON public.email_templates FOR DELETE TO authenticated
USING (
  -- Cannot delete system defaults
  organization_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.memberships
    WHERE organization_id = email_templates.organization_id
    AND user_id = auth.uid()
    AND is_active = true
    AND role IN ('owner', 'admin')  -- FIX: added owner
  )
);

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_templates_org ON public.email_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_templates_type ON public.email_templates(template_type);
CREATE INDEX IF NOT EXISTS idx_templates_default ON public.email_templates(is_default) WHERE is_default = true;

-- 6. Updated At Trigger
DROP TRIGGER IF EXISTS set_updated_at ON public.email_templates;
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.email_templates
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 7. Seed System Default Templates
INSERT INTO public.email_templates (
  name, template_type, subject, body_html, 
  description, is_default, organization_id
)
VALUES 
(
  'Friendly Reminder', 
  'reminder_polite', 
  'Friendly reminder: Invoice #{{invoice_number}} due soon',
  '<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; line-height: 1.6;"><div style="padding: 40px 20px; background: #f8fafc; border-radius: 24px;"><h1 style="font-size: 24px; font-weight: 800; color: #0f172a; margin-bottom: 8px;">Friendly Reminder</h1><p style="font-size: 16px; margin-bottom: 24px;">Hi {{client_name}},</p><div style="background: white; padding: 24px; border-radius: 16px; border: 1px solid #e2e8f0; margin-bottom: 24px;"><p style="margin: 0; font-size: 15px;">This is a friendly reminder that invoice <strong>#{{invoice_number}}</strong> for <strong>₹{{amount}}</strong> is due on {{due_date}}.</p></div><a href="{{payment_link}}" style="display: inline-block; background: #6366f1; color: white; padding: 14px 28px; border-radius: 12px; font-weight: 700; text-decoration: none; font-size: 14px;">Settlement Link</a></div><div style="padding: 20px; text-align: center;"><p style="font-size: 12px; color: #64748b;">&copy; {{business_name}}</p><p style="font-size: 10px; color: #94a3b8;">Securely processed via Paydrip</p></div></div>',
  'Professional polite reminder for invoices due soon.',
  true, NULL
),
(
  'Firm Overdue Notice', 
  'reminder_firm', 
  'Action required: Invoice #{{invoice_number}} is overdue',
  '<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; line-height: 1.6;"><div style="padding: 40px 20px; background: #fff7ed; border-radius: 24px;"><h1 style="font-size: 24px; font-weight: 800; color: #9a3412; margin-bottom: 8px;">Action Required</h1><p style="font-size: 16px; margin-bottom: 24px;">Hi {{client_name}},</p><div style="background: white; padding: 24px; border-radius: 16px; border: 1px solid #ffedd5; margin-bottom: 24px;"><p style="margin: 0; font-size: 15px;">Invoice <strong>#{{invoice_number}}</strong> is now overdue. Please settle the outstanding balance of <strong>₹{{amount}}</strong> to avoid any disruption.</p></div><a href="{{payment_link}}" style="display: inline-block; background: #6366f1; color: white; padding: 14px 28px; border-radius: 12px; font-weight: 700; text-decoration: none; font-size: 14px;">Pay Now</a></div><div style="padding: 20px; text-align: center;"><p style="font-size: 12px; color: #64748b;">&copy; {{business_name}}</p><p style="font-size: 10px; color: #94a3b8;">Securely processed via Paydrip</p></div></div>',
  'Firm overdue notice for invoices past their due date.',
  true, NULL
),
(
  'Final Notice', 
  'reminder_final', 
  'Final notice: Invoice #{{invoice_number}} - Immediate action required',
  '<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; line-height: 1.6;"><div style="padding: 40px 20px; background: #fef2f2; border-radius: 24px;"><h1 style="font-size: 24px; font-weight: 800; color: #991b1b; margin-bottom: 8px;">Final Notice</h1><p style="font-size: 16px; margin-bottom: 24px;">Hi {{client_name}},</p><div style="background: white; padding: 24px; border-radius: 16px; border: 1px solid #fee2e2; margin-bottom: 24px;"><p style="margin: 0; font-size: 15px;">This is the final notice regarding your outstanding balance of <strong>₹{{amount}}</strong> for invoice #{{invoice_number}}. Failure to settle this today may result in legal escalation.</p></div><a href="{{payment_link}}" style="display: inline-block; background: #6366f1; color: white; padding: 14px 28px; border-radius: 12px; font-weight: 700; text-decoration: none; font-size: 14px;">Immediate Settlement</a></div><div style="padding: 20px; text-align: center;"><p style="font-size: 12px; color: #64748b;">&copy; {{business_name}}</p><p style="font-size: 10px; color: #94a3b8;">Securely processed via Paydrip</p></div></div>',
  'Last warning before further action is taken.',
  true, NULL
),
(
  'Invoice Delivery', 
  'invoice_created', 
  'Invoice #{{invoice_number}} from {{business_name}}',
  '<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; line-height: 1.6;"><div style="padding: 40px 20px; background: #f8fafc; border-radius: 24px;"><h1 style="font-size: 24px; font-weight: 800; color: #0f172a; margin-bottom: 8px;">Invoice Ready</h1><p style="font-size: 16px; margin-bottom: 24px;">Hi {{client_name}},</p><div style="background: white; padding: 24px; border-radius: 16px; border: 1px solid #e2e8f0; margin-bottom: 24px;"><p style="margin: 0; font-size: 15px;">Your invoice for <strong>₹{{amount}}</strong> from {{business_name}} has been generated and is ready for payment.</p></div><a href="{{payment_link}}" style="display: inline-block; background: #6366f1; color: white; padding: 14px 28px; border-radius: 12px; font-weight: 700; text-decoration: none; font-size: 14px;">View & Pay Invoice</a></div><div style="padding: 20px; text-align: center;"><p style="font-size: 12px; color: #64748b;">&copy; {{business_name}}</p><p style="font-size: 10px; color: #94a3b8;">Securely processed via Paydrip</p></div></div>',
  'Standard invoice delivery email.',
  true, NULL
),
(
  'Payment Confirmation', 
  'invoice_paid', 
  'Payment received - Invoice #{{invoice_number}}',
  '<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; line-height: 1.6;"><div style="padding: 40px 20px; background: #f0fdf4; border-radius: 24px;"><h1 style="font-size: 24px; font-weight: 800; color: #166534; margin-bottom: 8px;">Payment Successful</h1><p style="font-size: 16px; margin-bottom: 24px;">Hi {{client_name}},</p><div style="background: white; padding: 24px; border-radius: 16px; border: 1px solid #dcfce7; margin-bottom: 24px;"><p style="margin: 0; font-size: 15px;">Thank you for your payment of <strong>₹{{amount}}</strong> for invoice <strong>#{{invoice_number}}</strong>. Your account has been updated.</p></div><a href="{{payment_link}}" style="display: inline-block; background: #6366f1; color: white; padding: 14px 28px; border-radius: 12px; font-weight: 700; text-decoration: none; font-size: 14px;">View Receipt</a></div><div style="padding: 20px; text-align: center;"><p style="font-size: 12px; color: #64748b;">&copy; {{business_name}}</p><p style="font-size: 10px; color: #94a3b8;">Securely processed via Paydrip</p></div></div>',
  'Thank you confirmation for payments received.',
  true, NULL
)
ON CONFLICT ON CONSTRAINT unique_default_template DO NOTHING;

-- 8. Function: get_template_for_invoice
CREATE OR REPLACE FUNCTION public.get_template_for_invoice(
  p_org_id UUID,
  p_template_type TEXT
) RETURNS SETOF public.email_templates AS $$
BEGIN
  -- FIX: RETURN if not a member (auth.uid() is null for service role — skip check)
  IF auth.uid() IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.memberships
    WHERE organization_id = p_org_id
    AND user_id = auth.uid()
    AND is_active = true
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  (
    SELECT * FROM public.email_templates
    WHERE organization_id = p_org_id
    AND template_type = p_template_type
    AND is_active = true
    AND is_default = false
    ORDER BY created_at DESC
    LIMIT 1
  )
  UNION ALL
  (
    SELECT * FROM public.email_templates
    WHERE organization_id IS NULL
    AND template_type = p_template_type
    AND is_default = true
    LIMIT 1
  )
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Function: render_template
CREATE OR REPLACE FUNCTION public.render_template(
  p_template_body TEXT,
  p_variables JSONB
) RETURNS TEXT AS $$
DECLARE
  v_rendered TEXT := p_template_body;
BEGIN
  v_rendered := replace(v_rendered, '{{client_name}}', COALESCE(p_variables->>'client_name', ''));
  v_rendered := replace(v_rendered, '{{invoice_number}}', COALESCE(p_variables->>'invoice_number', ''));
  v_rendered := replace(v_rendered, '{{amount}}', COALESCE(p_variables->>'amount', ''));
  v_rendered := replace(v_rendered, '{{due_date}}', COALESCE(p_variables->>'due_date', ''));
  v_rendered := replace(v_rendered, '{{days_overdue}}', COALESCE(p_variables->>'days_overdue', ''));
  v_rendered := replace(v_rendered, '{{payment_link}}', COALESCE(p_variables->>'payment_link', ''));
  v_rendered := replace(v_rendered, '{{business_name}}', COALESCE(p_variables->>'business_name', ''));
  RETURN v_rendered;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;