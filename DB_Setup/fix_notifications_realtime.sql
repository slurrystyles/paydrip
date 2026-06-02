-- Path: /fix_notifications_realtime.sql

-- 1. Enable Realtime for notifications table
-- This is critical for the frontend to receive updates via supabase.channel()
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- 2. Fix trigger to be more resilient and ensure preferences are read correctly
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
        
        -- Default to true if prefs are missing
        IF v_prefs IS NULL THEN
            v_prefs := '{"email_delivery": true, "payments": true, "invoice_viewed": true}'::jsonb;
        END IF;

        -- CHECK PREFERENCES (Type Casting to Boolean correctly)
        -- 1. Email Delivery Alerts
        IF NEW.audit_type IN ('email_sent', 'email_failed', 'email_cap_reached') THEN
            IF COALESCE((v_prefs->>'email_delivery')::boolean, true) IS FALSE THEN CONTINUE; END IF;
        END IF;

        -- 2. Payment Notifications
        IF NEW.audit_type IN ('payment_reported', 'payment_confirmed', 'payment_rejected', 'invoice_paid') THEN
            IF COALESCE((v_prefs->>'payments')::boolean, true) IS FALSE THEN CONTINUE; END IF;
        END IF;

        -- 3. Invoice Viewed Alerts
        IF NEW.audit_type = 'invoice_viewed' THEN
            IF COALESCE((v_prefs->>'invoice_viewed')::boolean, true) IS FALSE THEN CONTINUE; END IF;
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
