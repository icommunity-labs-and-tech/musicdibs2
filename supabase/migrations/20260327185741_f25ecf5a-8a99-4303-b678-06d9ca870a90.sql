
-- Create managed_artists table
CREATE TABLE public.managed_artists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_user_id uuid NOT NULL,
  artist_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  artist_name text NOT NULL,
  artist_email text,
  artist_phone text,
  artist_country text,
  representation_type text NOT NULL DEFAULT 'full',
  contract_reference text,
  contract_signed_at date,
  notes text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.managed_artists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can read own artists"
  ON public.managed_artists FOR SELECT TO authenticated
  USING (manager_user_id = auth.uid());

CREATE POLICY "Managers can insert own artists"
  ON public.managed_artists FOR INSERT TO authenticated
  WITH CHECK (manager_user_id = auth.uid() AND public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Managers can update own artists"
  ON public.managed_artists FOR UPDATE TO authenticated
  USING (manager_user_id = auth.uid() AND public.has_role(auth.uid(), 'manager'))
  WITH CHECK (manager_user_id = auth.uid());

-- Create managed_works table
CREATE TABLE public.managed_works (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_id uuid NOT NULL REFERENCES public.works(id) ON DELETE CASCADE,
  managed_artist_id uuid NOT NULL REFERENCES public.managed_artists(id) ON DELETE CASCADE,
  manager_user_id uuid NOT NULL,
  authorized_by text NOT NULL DEFAULT 'contract',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.managed_works ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can read own managed works"
  ON public.managed_works FOR SELECT TO authenticated
  USING (manager_user_id = auth.uid());

CREATE POLICY "Managers can insert own managed works"
  ON public.managed_works FOR INSERT TO authenticated
  WITH CHECK (manager_user_id = auth.uid() AND public.has_role(auth.uid(), 'manager'));

-- Create manager_contracts table
CREATE TABLE public.manager_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_user_id uuid NOT NULL,
  plan_name text NOT NULL DEFAULT 'standard',
  valid_until date,
  max_artists integer DEFAULT 50,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.manager_contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can read own contracts"
  ON public.manager_contracts FOR SELECT TO authenticated
  USING (manager_user_id = auth.uid());
