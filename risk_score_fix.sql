-- 1. Create the Postgres function to calculate client risk score
CREATE OR REPLACE FUNCTION public.calculate_client_risk_score(
  p_client_id UUID,
  p_organization_id UUID
) RETURNS VOID AS $$
DECLARE
  v_user_id UUID;
  v_overdue_count INT := 0;
  v_total_reminders_sent INT := 0;
  v_responsive_reminders INT := 0;
  v_ghosting_detected BOOLEAN := false;
  v_total_delay_days NUMERIC := 0;
  v_avg_delay NUMERIC := 15;
  v_responsiveness_ratio NUMERIC := 50;
  v_base_score NUMERIC := 0;
  v_score NUMERIC := 0;
  v_risk_level public.risk_level := 'minimal'::public.risk_level;
  v_recovery_probability NUMERIC := 100;
BEGIN
  -- Get user_id for this client
  SELECT user_id INTO v_user_id
  FROM public.clients
  WHERE id = p_client_id
  LIMIT 1;

  -- Fallback if not found on clients table
  IF v_user_id IS NULL THEN
    SELECT user_id INTO v_user_id
    FROM public.invoices
    WHERE client_id = p_client_id AND organization_id = p_organization_id
    LIMIT 1;
  END IF;

  -- If still null, calculations cannot proceed
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  -- 1. Count overdue invoices for this client in this organization
  SELECT COUNT(*) INTO v_overdue_count
  FROM public.invoices
  WHERE client_id = p_client_id 
    AND organization_id = p_organization_id 
    AND due_date < CURRENT_DATE 
    AND status != 'paid';

  -- 2. Calculates avg days to pay (from paid invoices in the same company context)
  SELECT COALESCE(AVG(GREATEST(0, EXTRACT(EPOCH FROM (p.max_paid_at - i.due_date::timestamp)) / 86400)), 15) INTO v_avg_delay
  FROM public.invoices i
  JOIN (
    SELECT invoice_id, MAX(paid_at) as max_paid_at
    FROM public.payments
    GROUP BY invoice_id
  ) p ON i.id = p.invoice_id
  WHERE i.client_id = p_client_id 
    AND i.organization_id = p_organization_id 
    AND i.status = 'paid';

  -- 3. Total reminders sent for this client
  SELECT COUNT(*) INTO v_total_reminders_sent
  FROM public.reminder_timeline r
  JOIN public.invoices i ON r.invoice_id = i.id
  WHERE i.client_id = p_client_id AND i.organization_id = p_organization_id;

  -- 4. Count responsive reminders
  SELECT COUNT(*) INTO v_responsive_reminders
  FROM public.reminder_timeline r
  JOIN public.invoices i ON r.invoice_id = i.id
  WHERE i.client_id = p_client_id 
    AND i.organization_id = p_organization_id
    AND EXISTS (
      SELECT 1 
      FROM public.payments p 
      WHERE p.invoice_id = r.invoice_id 
        AND p.paid_at > r.sent_at
    );

  -- Calculate responsiveness ratio
  IF v_total_reminders_sent > 0 THEN
    v_responsiveness_ratio := (v_responsive_reminders::NUMERIC / v_total_reminders_sent::NUMERIC) * 100;
  ELSE
    v_responsiveness_ratio := 50;
  END IF;

  -- 5. Detects ghosting (invoice sent > 30 days ago, no payment OR overdue > 3 reminders with no payments)
  SELECT EXISTS (
    SELECT 1
    FROM public.invoices i
    LEFT JOIN public.payments p ON i.id = p.invoice_id
    WHERE i.client_id = p_client_id 
      AND i.organization_id = p_organization_id
      AND i.due_date < CURRENT_DATE 
      AND i.status != 'paid'
      -- no payments made at all
      AND p.id IS NULL
      -- either invoice created > 30 days ago, or has > 3 reminders sent
      AND (
        i.created_at < NOW() - INTERVAL '30 days'
        OR (
          SELECT COUNT(*) 
          FROM public.reminder_timeline 
          WHERE invoice_id = i.id
        ) > 3
      )
  ) INTO v_ghosting_detected;

  -- 6. Adaptive Scoring Algorithm (0-100)
  v_base_score := (v_overdue_count * 12) + (v_avg_delay * 1.2) + (100 - v_responsiveness_ratio) * 0.4;
  IF v_ghosting_detected THEN
    v_base_score := v_base_score + 25;
  END IF;

  v_score := LEAST(100, GREATEST(0, v_base_score));

  -- Assign risk level
  IF v_score > 85 THEN
    v_risk_level := 'critical'::public.risk_level;
  ELSIF v_score > 65 THEN
    v_risk_level := 'high'::public.risk_level;
  ELSIF v_score > 40 THEN
    v_risk_level := 'medium'::public.risk_level;
  ELSIF v_score > 15 THEN
    v_risk_level := 'low'::public.risk_level;
  ELSE
    v_risk_level := 'minimal'::public.risk_level;
  END IF;

  -- 7. Predictive Recovery Probability
  v_recovery_probability := 100 - (v_score * 0.8) - (v_overdue_count * 2);
  IF v_avg_delay > 60 THEN
    v_recovery_probability := v_recovery_probability - 15;
  END IF;
  v_recovery_probability := LEAST(98, GREATEST(5, v_recovery_probability));

  -- Insert or update client_risk_scores row
  INSERT INTO public.client_risk_scores (
    client_id,
    user_id,
    organization_id,
    score,
    risk_level,
    metrics,
    last_calculated_at,
    updated_at
  ) VALUES (
    p_client_id,
    v_user_id,
    p_organization_id,
    COALESCE(v_score, 0),
    v_risk_level,
    jsonb_build_object(
      'overdue_count', v_overdue_count,
      'avg_delay_days', ROUND(v_avg_delay, 2),
      'responsiveness_ratio', ROUND(v_responsiveness_ratio, 2),
      'recovery_probability', ROUND(v_recovery_probability, 2),
      'ghosting_detected', v_ghosting_detected
    ),
    now(),
    now()
  )
  ON CONFLICT (client_id) DO UPDATE SET
    score = EXCLUDED.score,
    risk_level = EXCLUDED.risk_level,
    metrics = EXCLUDED.metrics,
    last_calculated_at = EXCLUDED.last_calculated_at,
    updated_at = EXCLUDED.updated_at,
    user_id = EXCLUDED.user_id,
    organization_id = EXCLUDED.organization_id;

END;
$$ LANGUAGE plpgsql;

-- 2. Create trigger function on public.invoices to auto-recalculate client risk
CREATE OR REPLACE FUNCTION public.tr_calculate_invoice_client_risk()
RETURNS TRIGGER AS $$
BEGIN
  -- We ONLY calculate if client_id and organization_id are set
  IF NEW.client_id IS NOT NULL AND NEW.organization_id IS NOT NULL THEN
    PERFORM public.calculate_client_risk_score(NEW.client_id, NEW.organization_id);
  END IF;
  
  -- If client_id was updated/changed, recalculate for the old client as well to keep them in sync
  IF TG_OP = 'UPDATE' AND OLD.client_id IS NOT NULL AND OLD.organization_id IS NOT NULL AND OLD.client_id IS DISTINCT FROM NEW.client_id THEN
    PERFORM public.calculate_client_risk_score(OLD.client_id, OLD.organization_id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it already exists, then create it
DROP TRIGGER IF EXISTS tr_invoices_risk_score ON public.invoices;

CREATE TRIGGER tr_invoices_risk_score
AFTER INSERT OR UPDATE ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.tr_calculate_invoice_client_risk();

-- 3. BACKFILL existing clients by invoking calculate_client_risk_score
SELECT public.calculate_client_risk_score(id, organization_id)
FROM public.clients;
