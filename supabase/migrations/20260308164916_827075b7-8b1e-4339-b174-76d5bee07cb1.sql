
-- Profiles table for user-specific data
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  phone text,
  kyc_status text NOT NULL DEFAULT 'unverified' CHECK (kyc_status IN ('verified','pending','unverified')),
  subscription_plan text NOT NULL DEFAULT 'Free',
  available_credits integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Works table
CREATE TABLE public.works (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  type text NOT NULL DEFAULT 'document',
  author text,
  description text,
  status text NOT NULL DEFAULT 'processing' CHECK (status IN ('processing','registered','failed')),
  file_path text,
  certificate_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.works ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own works" ON public.works FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own works" ON public.works FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Credit transactions
CREATE TABLE public.credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount integer NOT NULL,
  type text NOT NULL CHECK (type IN ('purchase','usage','bonus','refund')),
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own transactions" ON public.credit_transactions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own transactions" ON public.credit_transactions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Promotion requests
CREATE TABLE public.promotion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  artist_name text NOT NULL,
  main_link text NOT NULL,
  work_title text NOT NULL,
  description text NOT NULL,
  promotion_goal text NOT NULL,
  social_networks text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','completed')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.promotion_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own promotions" ON public.promotion_requests FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own promotions" ON public.promotion_requests FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable realtime for works
ALTER PUBLICATION supabase_realtime ADD TABLE public.works;
