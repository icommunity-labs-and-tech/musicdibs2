-- Add library access columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS library_status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS library_status_since timestamptz,
  ADD COLUMN IF NOT EXISTS free_downloads_used integer NOT NULL DEFAULT 0;

-- RPC to increment free downloads (security definer, user can only call for themselves)
CREATE OR REPLACE FUNCTION public.increment_free_downloads(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  UPDATE public.profiles
  SET free_downloads_used = free_downloads_used + 1,
      updated_at = now()
  WHERE user_id = p_user_id;
END;
$$;