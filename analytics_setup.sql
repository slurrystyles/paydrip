-- Path: /analytics_setup.sql

-- 1. Revenue Analytics Function
CREATE OR REPLACE FUNCTION public.get_revenue_analytics(p_org_id UUID, p_days INTEGER DEFAULT 30)
RETURNS JSONB AS $$
DECLARE
    v_total_invoiced NUMERIC := 0;
    v_total_collected NUMERIC := 0;
    v_invoices_created INTEGER := 0;
    v_invoices_paid INTEGER := 0;
    v_invoices_overdue INTEGER := 0;
    v_invoices_draft INTEGER := 0;
    v_invoices_sent INTEGER := 0;
    v_avg_invoice_amount NUMERIC := 0;
    v_avg_days_to_pay NUMERIC := 0;
BEGIN
    -- Invoices created in period
    SELECT 
        COALESCE(SUM(amount), 0),
        COUNT(*),
        COUNT(*) FILTER (WHERE status = 'paid'),
        COUNT(*) FILTER (WHERE status = 'draft'),
        COUNT(*) FILTER (WHERE status = 'sent'),
        COALESCE(AVG(amount), 0)
    INTO 
        v_total_invoiced,
        v_invoices_created,
        v_invoices_paid,
        v_invoices_draft,
        v_invoices_sent,
        v_avg_invoice_amount
    FROM public.invoices
    WHERE organization_id = p_org_id
    AND created_at >= now() - (p_days || ' days')::interval;

    -- Collected amount in period (based on when payment happened)
    SELECT COALESCE(SUM(amount), 0)
    INTO v_total_collected
    FROM public.payments
    WHERE organization_id = p_org_id
    AND paid_at >= now() - (p_days || ' days')::interval;

    -- Overdue invoices (total, not just in period, but filtered by org)
    SELECT COUNT(*)
    INTO v_invoices_overdue
    FROM public.invoices
    WHERE organization_id = p_org_id
    AND status != 'paid'
    AND due_date < now();

    -- Average days to pay
    SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (p.paid_at - i.created_at)) / 86400), 0)
    INTO v_avg_days_to_pay
    FROM public.payments p
    JOIN public.invoices i ON p.invoice_id = i.id
    WHERE p.organization_id = p_org_id
    AND p.paid_at >= now() - (p_days || ' days')::interval;

    RETURN jsonb_build_object(
        'total_invoiced', v_total_invoiced,
        'total_collected', v_total_collected,
        'total_outstanding', v_total_invoiced - v_total_collected,
        'collection_rate', CASE WHEN v_total_invoiced = 0 THEN 0 ELSE (v_total_collected / v_total_invoiced * 100) END,
        'avg_invoice_amount', v_avg_invoice_amount,
        'avg_days_to_pay', v_avg_days_to_pay,
        'invoices_created', v_invoices_created,
        'invoices_paid', v_invoices_paid,
        'invoices_overdue', v_invoices_overdue,
        'invoices_draft', v_invoices_draft,
        'invoices_sent', v_invoices_sent
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'total_invoiced', 0, 'total_collected', 0, 'total_outstanding', 0,
        'collection_rate', 0, 'avg_invoice_amount', 0, 'avg_days_to_pay', 0,
        'invoices_created', 0, 'invoices_paid', 0, 'invoices_overdue', 0,
        'invoices_draft', 0, 'invoices_sent', 0
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Revenue Trend Function
CREATE OR REPLACE FUNCTION public.get_revenue_trend(p_org_id UUID, p_days INTEGER DEFAULT 30)
RETURNS TABLE(period_date DATE, invoiced NUMERIC, collected NUMERIC) AS $$
BEGIN
    RETURN QUERY
    WITH date_series AS (
        SELECT generate_series(
            current_date - (p_days - 1 || ' days')::interval,
            current_date,
            '1 day'::interval
        )::date AS d
    ),
    invoice_data AS (
        SELECT date_trunc('day', created_at)::date AS d, SUM(amount) AS amt
        FROM public.invoices
        WHERE organization_id = p_org_id
        AND created_at >= current_date - (p_days - 1 || ' days')::interval
        GROUP BY 1
    ),
    payment_data AS (
        SELECT date_trunc('day', paid_at)::date AS d, SUM(amount) AS amt
        FROM public.payments
        WHERE organization_id = p_org_id
        AND paid_at >= current_date - (p_days - 1 || ' days')::interval
        GROUP BY 1
    )
    SELECT 
        ds.d as period_date,
        COALESCE(i.amt, 0) as invoiced,
        COALESCE(p.amt, 0) as collected
    FROM date_series ds
    LEFT JOIN invoice_data i ON ds.d = i.d
    LEFT JOIN payment_data p ON ds.d = p.d
    ORDER BY ds.d ASC;
EXCEPTION WHEN OTHERS THEN
    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Recovery Analytics Function
CREATE OR REPLACE FUNCTION public.get_recovery_analytics(p_org_id UUID, p_days INTEGER DEFAULT 30)
RETURNS JSONB AS $$
DECLARE
    v_sequences_created INTEGER := 0;
    v_sequences_completed INTEGER := 0;
    v_sequences_cancelled INTEGER := 0;
    v_sequences_active INTEGER := 0;
    v_emails_sent INTEGER := 0;
    v_emails_failed INTEGER := 0;
    v_recovery_rate NUMERIC := 0;
    v_avg_steps_to_recovery NUMERIC := 0;
    v_best_template TEXT;
    v_total_reminders_sent INTEGER := 0;
BEGIN
    -- Sequence stats
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE status = 'completed'),
        COUNT(*) FILTER (WHERE status = 'cancelled'),
        COUNT(*) FILTER (WHERE status = 'active')
    INTO 
        v_sequences_created,
        v_sequences_completed,
        v_sequences_cancelled,
        v_sequences_active
    FROM public.follow_up_sequences
    WHERE organization_id = p_org_id
    AND created_at >= now() - (p_days || ' days')::interval;

    -- Email stats from audit_log
    SELECT 
        COUNT(*) FILTER (WHERE audit_type = 'email_sent'),
        COUNT(*) FILTER (WHERE audit_type = 'email_failed')
    INTO
        v_emails_sent,
        v_emails_failed
    FROM public.audit_log
    WHERE organization_id = p_org_id
    AND created_at >= now() - (p_days || ' days')::interval;

    -- Reminder stats from follow_up_steps
    SELECT COUNT(*)
    INTO v_total_reminders_sent
    FROM public.follow_up_steps s
    JOIN public.follow_up_sequences seq ON s.sequence_id = seq.id
    WHERE seq.organization_id = p_org_id
    AND s.status = 'sent'
    AND s.executed_at >= now() - (p_days || ' days')::interval;

    -- Recovery Rate: % of invoices sent in period that are now paid
    SELECT CASE WHEN COUNT(*) = 0 THEN 0 ELSE (COUNT(*) FILTER (WHERE status = 'paid')::numeric / COUNT(*) * 100) END
    INTO v_recovery_rate
    FROM public.invoices
    WHERE organization_id = p_org_id
    AND status IN ('sent', 'paid')
    AND created_at >= now() - (p_days || ' days')::interval;

    -- Average steps to recovery
    SELECT COALESCE(AVG(s.step_number), 0)
    INTO v_avg_steps_to_recovery
    FROM public.follow_up_steps s
    JOIN public.follow_up_sequences seq ON s.sequence_id = seq.id
    WHERE seq.organization_id = p_org_id
    AND seq.status = 'completed'
    AND s.status = 'sent'
    AND seq.created_at >= now() - (p_days || ' days')::interval;

    -- Best performing template (highest success rate)
    SELECT template_type
    INTO v_best_template
    FROM (
        SELECT s.template_type, COUNT(*) as successes
        FROM public.follow_up_steps s
        JOIN public.follow_up_sequences seq ON s.sequence_id = seq.id
        WHERE seq.organization_id = p_org_id
        AND seq.status = 'completed'
        AND s.status = 'sent'
        GROUP BY 1
        ORDER BY 2 DESC
        LIMIT 1
    ) sub;

    RETURN jsonb_build_object(
        'sequences_created', v_sequences_created,
        'sequences_completed', v_sequences_completed,
        'sequences_cancelled', v_sequences_cancelled,
        'sequences_active', v_sequences_active,
        'emails_sent', v_emails_sent,
        'emails_failed', v_emails_failed,
        'recovery_rate', v_recovery_rate,
        'avg_steps_to_recovery', v_avg_steps_to_recovery,
        'best_performing_template', COALESCE(v_best_template, 'none'),
        'total_reminders_sent', v_total_reminders_sent
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'sequences_created', 0, 'sequences_completed', 0, 'sequences_cancelled', 0, 
        'sequences_active', 0, 'emails_sent', 0, 'emails_failed', 0,
        'recovery_rate', 0, 'avg_steps_to_recovery', 0, 'best_performing_template', 'none',
        'total_reminders_sent', 0
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Client Analytics Function
CREATE OR REPLACE FUNCTION public.get_client_analytics(p_org_id UUID, p_days INTEGER DEFAULT 30)
RETURNS TABLE(
  client_name TEXT,
  client_email TEXT,
  total_invoiced NUMERIC,
  total_paid NUMERIC,
  outstanding NUMERIC,
  invoice_count INTEGER,
  avg_days_to_pay NUMERIC,
  payment_reliability TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH client_stats AS (
        SELECT 
            snapshot_json->>'name' as name,
            snapshot_json->>'email' as email,
            SUM(amount) as invoiced,
            COUNT(*) as count,
            SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) as paid,
            AVG(CASE WHEN status = 'paid' THEN EXTRACT(EPOCH FROM (updated_at - created_at)) / 86400 ELSE NULL END) as days_to_pay
        FROM public.invoices
        WHERE organization_id = p_org_id
        AND created_at >= now() - (p_days || ' days')::interval
        GROUP BY 1, 2
    )
    SELECT 
        COALESCE(name, 'Unknown'),
        COALESCE(email, 'Unknown'),
        invoiced,
        paid,
        invoiced - paid as outstanding,
        count::integer,
        COALESCE(days_to_pay, 0),
        CASE 
            WHEN days_to_pay IS NULL THEN 'poor'
            WHEN days_to_pay <= 0 THEN 'excellent'
            WHEN days_to_pay <= 7 THEN 'good'
            WHEN days_to_pay <= 30 THEN 'fair'
            ELSE 'poor'
        END as reliability
    FROM client_stats
    ORDER BY invoiced DESC
    LIMIT 20;
EXCEPTION WHEN OTHERS THEN
    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Cashflow Forecast Function
CREATE OR REPLACE FUNCTION public.get_cashflow_forecast(p_org_id UUID)
RETURNS TABLE(forecast_date DATE, expected_amount NUMERIC, invoice_count INTEGER) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        due_date::date as forecast_date,
        SUM(amount) as expected_amount,
        COUNT(*)::integer as invoice_count
    FROM public.invoices
    WHERE organization_id = p_org_id
    AND status IN ('sent', 'payment_reported')
    AND due_date BETWEEN now() AND now() + '30 days'::interval
    GROUP BY 1
    ORDER BY 1 ASC;
EXCEPTION WHEN OTHERS THEN
    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Overview Stats Function
CREATE OR REPLACE FUNCTION public.get_overview_stats(p_org_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_total_outstanding NUMERIC := 0;
    v_overdue_amount NUMERIC := 0;
    v_collected_this_month NUMERIC := 0;
    v_active_recoveries INTEGER := 0;
    v_clients_count INTEGER := 0;
    v_success_rate_30d NUMERIC := 0;
BEGIN
    -- Total Outstanding
    SELECT COALESCE(SUM(amount), 0)
    INTO v_total_outstanding
    FROM public.invoices
    WHERE organization_id = p_org_id
    AND status != 'paid';

    -- Overdue Amount
    SELECT COALESCE(SUM(amount), 0)
    INTO v_overdue_amount
    FROM public.invoices
    WHERE organization_id = p_org_id
    AND status != 'paid'
    AND due_date < now();

    -- Collected this month
    SELECT COALESCE(SUM(amount), 0)
    INTO v_collected_this_month
    FROM public.payments
    WHERE organization_id = p_org_id
    AND paid_at >= date_trunc('month', now());

    -- Active recoveries
    SELECT COUNT(*)
    INTO v_active_recoveries
    FROM public.follow_up_sequences
    WHERE organization_id = p_org_id
    AND status = 'active';

    -- Clients count
    SELECT COUNT(*)
    INTO v_clients_count
    FROM public.clients
    WHERE organization_id = p_org_id;

    -- Success rate 30d (paid within 30 days of creation)
    SELECT CASE WHEN COUNT(*) = 0 THEN 0 ELSE (COUNT(*) FILTER (WHERE status = 'paid' AND updated_at <= created_at + '30 days'::interval)::numeric / COUNT(*) * 100) END
    INTO v_success_rate_30d
    FROM public.invoices
    WHERE organization_id = p_org_id
    AND created_at >= now() - '30 days'::interval;

    RETURN jsonb_build_object(
        'total_outstanding', v_total_outstanding,
        'overdue_amount', v_overdue_amount,
        'collected_this_month', v_collected_this_month,
        'active_recoveries', v_active_recoveries,
        'clients_count', v_clients_count,
        'success_rate_30d', v_success_rate_30d
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'total_outstanding', 0, 'overdue_amount', 0, 'collected_this_month', 0,
        'active_recoveries', 0, 'clients_count', 0, 'success_rate_30d', 0
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
