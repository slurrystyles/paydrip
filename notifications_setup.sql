-- NOTIFICATION CENTER SETUP
-- Path: /notifications_setup.sql

-- 1. Create Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,  -- maps to audit_type
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    entity_id UUID,   -- invoice_id or client_id
    entity_type TEXT, -- 'invoice', 'client'
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Add notification_preferences to users
ALTER TABLE public.users 
  ADD COLUMN IF NOT EXISTS notification_preferences JSONB 
  DEFAULT '{"email_delivery": true, "payments": true, "invoice_viewed": true}'::jsonb;

-- 2. Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can only see notifications for their own user_id" ON public.notifications;
CREATE POLICY "Users can only see notifications for their own user_id" ON public.notifications
    FOR ALL USING (
        user_id = auth.uid() 
        AND organization_id IN (
            SELECT organization_id FROM public.memberships WHERE user_id = auth.uid() AND is_active = true
        )
    )
    WITH CHECK (
        user_id = auth.uid() 
        AND organization_id IN (
            SELECT organization_id FROM public.memberships WHERE user_id = auth.uid() AND is_active = true
        )
    );

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_organization ON public.notifications(organization_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- 4. Create Notification Function
CREATE OR REPLACE FUNCTION public.create_notification(
  p_organization_id UUID,
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_body TEXT,
  p_entity_id UUID,
  p_entity_type TEXT
) RETURNS void AS $$
BEGIN
    INSERT INTO public.notifications (
        organization_id,
        user_id,
        type,
        title,
        body,
        entity_id,
        entity_type
    ) VALUES (
        p_organization_id,
        p_user_id,
        p_type,
        p_title,
        p_body,
        p_entity_id,
        p_entity_type
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Trigger on audit_log
-- First, ensure audit_log has the expected columns as per "Current State"
ALTER TABLE public.audit_log ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

CREATE OR REPLACE FUNCTION public.on_audit_log_insert_notification()
RETURNS TRIGGER AS $$
DECLARE
    v_title TEXT;
    v_body TEXT;
    v_invoice_num TEXT;
    v_member RECORD;
    v_prefs JSONB;
BEGIN
    -- Mapping titles and bodies based on audit_type
    CASE NEW.audit_type
        WHEN 'email_sent' THEN
            v_title := 'Reminder Sent';
            v_body := 'A follow-up email was sent to ' || COALESCE(NEW.recipient_email, 'client');
        WHEN 'email_failed' THEN
            v_title := 'Email Failed';
            v_body := 'Failed to send email to ' || COALESCE(NEW.recipient_email, 'client');
        WHEN 'email_cap_reached' THEN
            v_title := 'Email Limit Reached';
            v_body := 'Your daily email limit has been reached. Future reminders for today are paused.';
        WHEN 'invoice_sent' THEN
            v_title := 'Invoice Shared';
            SELECT invoice_number INTO v_invoice_num FROM public.invoices WHERE id = NEW.entity_id;
            v_body := 'Invoice #' || COALESCE(v_invoice_num, 'Unknown') || ' has been shared with the client.';
        WHEN 'invoice_viewed' THEN
            v_title := 'Invoice Viewed';
            SELECT invoice_number INTO v_invoice_num FROM public.invoices WHERE id = NEW.entity_id;
            v_body := 'Customer just viewed invoice #' || COALESCE(v_invoice_num, 'Unknown');
        WHEN 'payment_reported' THEN
            v_title := 'Payment Reported';
            SELECT invoice_number INTO v_invoice_num FROM public.invoices WHERE id = NEW.entity_id;
            v_body := 'A new payment was reported for invoice #' || COALESCE(v_invoice_num, 'Unknown') || '. Check for verification.';
        WHEN 'payment_confirmed' THEN
            v_title := 'Payment Verified';
            SELECT invoice_number INTO v_invoice_num FROM public.invoices WHERE id = NEW.entity_id;
            v_body := 'Payment for invoice #' || COALESCE(v_invoice_num, 'Unknown') || ' has been confirmed.';
        WHEN 'payment_rejected' THEN
            v_title := 'Payment Rejected';
            SELECT invoice_number INTO v_invoice_num FROM public.invoices WHERE id = NEW.entity_id;
            v_body := 'Reported payment for invoice #' || COALESCE(v_invoice_num, 'Unknown') || ' was rejected.';
        WHEN 'invoice_paid' THEN
            v_title := 'Payment Received';
            SELECT invoice_number INTO v_invoice_num FROM public.invoices WHERE id = NEW.entity_id;
            v_body := 'Invoice #' || COALESCE(v_invoice_num, 'Unknown') || ' is now fully paid.';
        ELSE
            RETURN NEW;
    END CASE;

    -- Notify all active members of the organization
    FOR v_member IN (
        SELECT user_id 
        FROM public.memberships 
        WHERE organization_id = NEW.organization_id 
        AND is_active = true
    ) LOOP
        -- Fetch user preferences
        SELECT notification_preferences INTO v_prefs FROM public.users WHERE id = v_member.user_id;
        
        -- CHECK PREFERENCES
        -- Default to true if prefs are missing (should not happen due to default)
        IF v_prefs IS NULL THEN
            v_prefs := '{"email_delivery": true, "payments": true, "invoice_viewed": true}'::jsonb;
        END IF;

        -- 1. Email Delivery Alerts
        IF NEW.audit_type IN ('email_sent', 'email_failed', 'email_cap_reached') THEN
            IF (v_prefs->>'email_delivery')::boolean IS FALSE THEN CONTINUE; END IF;
        END IF;

        -- 2. Payment Notifications
        IF NEW.audit_type IN ('payment_reported', 'payment_confirmed', 'payment_rejected', 'invoice_paid') THEN
            IF (v_prefs->>'payments')::boolean IS FALSE THEN CONTINUE; END IF;
        END IF;

        -- 3. Invoice Viewed Alerts
        IF NEW.audit_type = 'invoice_viewed' THEN
            IF (v_prefs->>'invoice_viewed')::boolean IS FALSE THEN CONTINUE; END IF;
        END IF;
        
        PERFORM public.create_notification(
            NEW.organization_id,
            v_member.user_id,
            NEW.audit_type,
            v_title,
            v_body,
            NEW.entity_id,
            NEW.entity_type
        );
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_audit_log_notification ON public.audit_log;
CREATE TRIGGER tr_audit_log_notification
    AFTER INSERT ON public.audit_log
    FOR EACH ROW
    EXECUTE FUNCTION public.on_audit_log_insert_notification();
