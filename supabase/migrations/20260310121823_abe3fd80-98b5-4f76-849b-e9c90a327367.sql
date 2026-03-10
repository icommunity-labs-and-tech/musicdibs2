
-- Fix 1: Add caller ownership check to decrement_credits
CREATE OR REPLACE FUNCTION public.decrement_credits(_user_id uuid, _amount integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow users to decrement their own credits
  IF _user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Forbidden: cannot modify another user''s credits';
  END IF;

  UPDATE public.profiles
  SET available_credits = GREATEST(0, available_credits - _amount),
      updated_at = now()
  WHERE user_id = _user_id;
END;
$$;

-- Fix 2: Restrict profiles INSERT policy to enforce safe defaults
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (
  (user_id = auth.uid())
  AND (available_credits = 0)
  AND (subscription_plan = 'Free')
  AND (kyc_status = 'unverified')
);
