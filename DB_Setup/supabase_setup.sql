-- SUPABASE DATABASE SETUP SQL
-- Run this in your Supabase SQL Editor

-- 1. Create Users Profile Table (linked to auth.users)
CREATE TABLE public.users (
  id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  business_name TEXT DEFAULT 'My Business',
  upi_id TEXT,
  bank_details TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create Clients Table
CREATE TABLE public.clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create Invoices Table
CREATE TABLE public.invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users NOT NULL,
  client_id UUID REFERENCES public.clients ON DELETE CASCADE, -- Nullable if client is deleted, we use snapshot
  invoice_number TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  due_date DATE NOT NULL,
  status TEXT CHECK (status IN ('draft', 'sent', 'paid')) DEFAULT 'draft' NOT NULL,
  notes TEXT,
  snapshot_json JSONB, -- Stores client data at time of creation
  public_token TEXT DEFAULT encode(gen_random_bytes(24), 'hex') UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Payments Table
CREATE TABLE public.payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID REFERENCES public.invoices ON DELETE CASCADE NOT NULL,
  amount NUMERIC NOT NULL,
  method TEXT CHECK (method IN ('upi', 'cash', 'bank')) NOT NULL,
  paid_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Reminder Logs
CREATE TABLE public.reminder_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID REFERENCES public.invoices ON DELETE CASCADE NOT NULL,
  type TEXT CHECK (type IN ('polite', 'firm', 'final')) NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Invoice Views (Analytics)
CREATE TABLE public.invoice_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID REFERENCES public.invoices ON DELETE CASCADE NOT NULL,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  ip_address TEXT
);

-- 7. Audit Events
CREATE TABLE public.events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users NOT NULL,
  type TEXT NOT NULL, -- invoice_created, invoice_sent, etc.
  meta JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ENABLE RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminder_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- POLICIES
CREATE POLICY "Users can manage own payments" ON public.payments 
  FOR ALL USING (EXISTS (SELECT 1 FROM public.invoices WHERE id = payments.invoice_id AND user_id = auth.uid()));

CREATE POLICY "Users can view own reminders" ON public.reminder_logs 
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.invoices WHERE id = reminder_logs.invoice_id AND user_id = auth.uid()));

CREATE POLICY "Users can view own invoice analytics" ON public.invoice_views 
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.invoices WHERE id = invoice_views.invoice_id AND user_id = auth.uid()));

CREATE POLICY "Public can log views" ON public.invoice_views FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view own events" ON public.events FOR SELECT USING (auth.uid() = user_id);

-- ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- POLICIES

-- Users can only see/edit their own profile
CREATE POLICY "Users can view own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);

-- Clients: Users can only see/manage their own clients
CREATE POLICY "Users can manage own clients" ON public.clients
  FOR ALL USING (auth.uid() = user_id);

-- Invoices: Users can only see/manage their own invoices
CREATE POLICY "Users can manage own invoices" ON public.invoices
  FOR ALL USING (auth.uid() = user_id);

-- AUTOMATIC PROFILE CREATION ON SIGNUP
-- Optional: Trigger to create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, business_name)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'business_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
