
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT false;

CREATE POLICY "Users read own role"
  ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid());
