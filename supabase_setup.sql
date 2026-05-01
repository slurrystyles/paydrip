-- SUPABASE DATABASE SETUP SQL (FINAL - ALL ISSUES FIXED)
-- ─────────────────────────────────────────────────────
-- Round 1 fixes: #1 FK columns, #2 RLS policies, #3 snapshot trigger,
--                #4 invoice_number unique per user, #5 overpayment guard
-- Round 2 fixes: #6 handle_new_user safe error handling,
--                #7 public_token expiry column,
--                #8 orphaned invoice guard (client_id+snapshot_json),
--                #9 FK indexes, #10 events INSERT policy,
--                #11 bank_details encryption note,
--                #12 ip_address hashed for GDPR
-- ─────────────────────────────────────────────────────

-- ─────────────────────────────────────────
-- TABLES
-- ─────────────────────────────────────────

CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) NOT NULL PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  business_name TEXT DEFAULT 'My Business',
  upi_id TEXT,
  bank_details TEXT, -- FIX #11: encrypt at app layer before storing (e.g. AES-256); never store plaintext
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  due_date DATE NOT NULL,
  status TEXT CHECK (status IN ('draft', 'sent', 'paid')) DEFAULT 'draft' NOT NULL,
  notes TEXT,
  -- FIX #8: snapshot_json required when client_id is null (enforced via trigger below)
  snapshot_json JSONB,
  public_token TEXT DEFAULT encode(gen_random_bytes(24), 'hex') UNIQUE NOT NULL,
  -- FIX #7: token expiry — null means never expires; set a date to invalidate public link
  public_token_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE (user_id, invoice_number)  -- FIX #4
);

CREATE TABLE public.payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC NOT NULL,
  method TEXT CHECK (method IN ('upi', 'cash', 'bank')) NOT NULL,
  paid_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.reminder_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE NOT NULL,
  type TEXT CHECK (type IN ('polite', 'firm', 'final')) NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.invoice_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE NOT NULL,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  -- FIX #12: store hashed IP (SHA-256 hex) instead of raw IP for GDPR compliance
  -- Hash at app layer: crypto.createHash('sha256').update(ip).digest('hex')
  ip_address_hash TEXT
);

CREATE TABLE public.events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) NOT NULL,
  type TEXT NOT NULL,
  meta JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ─────────────────────────────────────────
-- FIX #9: Indexes on foreign keys (Postgres does NOT auto-index FKs)
-- ─────────────────────────────────────────

CREATE INDEX idx_clients_user_id       ON public.clients(user_id);
CREATE INDEX idx_invoices_user_id      ON public.invoices(user_id);
CREATE INDEX idx_invoices_client_id    ON public.invoices(client_id);
CREATE INDEX idx_payments_invoice_id   ON public.payments(invoice_id);
CREATE INDEX idx_reminder_invoice_id   ON public.reminder_logs(invoice_id);
CREATE INDEX idx_views_invoice_id      ON public.invoice_views(invoice_id);
CREATE INDEX idx_events_user_id        ON public.events(user_id);

-- ─────────────────────────────────────────
-- FIX #3 + #8: snapshot_json trigger
-- Auto-fills snapshot; blocks insert if both client_id and snapshot_json are null
-- ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_invoice_snapshot()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-populate snapshot from client if not provided
  IF NEW.client_id IS NOT NULL AND NEW.snapshot_json IS NULL THEN
    SELECT jsonb_build_object(
      'name',  c.name,
      'email', c.email,
      'phone', c.phone
    )
    INTO NEW.snapshot_json
    FROM public.clients c
    WHERE c.id = NEW.client_id;
  END IF;

  -- FIX #8: Reject invoice with no client info at all
  IF NEW.snapshot_json IS NULL THEN
    RAISE EXCEPTION 'Invoice must have either a valid client_id or a snapshot_json';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_invoice_created
  BEFORE INSERT ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.set_invoice_snapshot();

-- ─────────────────────────────────────────
-- FIX #5: Overpayment guard
-- ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.check_overpayment()
RETURNS TRIGGER AS $$
DECLARE
  total_paid     NUMERIC;
  invoice_amount NUMERIC;
BEGIN
  SELECT COALESCE(SUM(amount), 0) + NEW.amount
  INTO total_paid
  FROM public.payments
  WHERE invoice_id = NEW.invoice_id;

  SELECT amount INTO invoice_amount
  FROM public.invoices
  WHERE id = NEW.invoice_id;

  IF total_paid > invoice_amount THEN
    RAISE EXCEPTION 'Overpayment: total payments (%) would exceed invoice amount (%)',
      total_paid, invoice_amount;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER prevent_overpayment
  BEFORE INSERT ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.check_overpayment();

-- ─────────────────────────────────────────
-- FIX #6: Safe auto profile creation on signup
-- Wrapped in EXCEPTION block so auth signup never fails silently
-- ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, business_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'name',
    COALESCE(NEW.raw_user_meta_data->>'business_name', 'My Business')
  );
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error to Postgres logs but don't block signup
    RAISE WARNING 'handle_new_user failed for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─────────────────────────────────────────
-- ENABLE RLS
-- ─────────────────────────────────────────

ALTER TABLE public.users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminder_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events        ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────
-- RLS POLICIES
-- ─────────────────────────────────────────

-- users
CREATE POLICY "Users can view own profile"   ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);

-- clients
CREATE POLICY "Users can manage own clients" ON public.clients
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own clients" ON public.clients
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- invoices
CREATE POLICY "Users can manage own invoices" ON public.invoices
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own invoices" ON public.invoices
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own invoices" ON public.invoices
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- payments
CREATE POLICY "Users can manage own payments" ON public.payments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.invoices WHERE id = payments.invoice_id AND user_id = auth.uid())
  );

-- reminder_logs
CREATE POLICY "Users can view own reminders" ON public.reminder_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.invoices WHERE id = reminder_logs.invoice_id AND user_id = auth.uid())
  );

-- invoice_views
CREATE POLICY "Users can view own invoice analytics" ON public.invoice_views
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.invoices WHERE id = invoice_views.invoice_id AND user_id = auth.uid())
  );

CREATE POLICY "Public can log views" ON public.invoice_views
  FOR INSERT WITH CHECK (true);

-- events
CREATE POLICY "Users can view own events" ON public.events
  FOR SELECT USING (auth.uid() = user_id);

-- FIX #10: events INSERT policy (was missing — app couldn't write audit logs via RLS)
CREATE POLICY "Users can insert own events" ON public.events
  FOR INSERT WITH CHECK (auth.uid() = user_id);