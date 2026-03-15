
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ibs_signature_id TEXT DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_ibs_signature_id
  ON public.profiles (ibs_signature_id)
  WHERE ibs_signature_id IS NOT NULL;
