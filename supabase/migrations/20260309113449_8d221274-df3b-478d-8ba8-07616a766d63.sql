
CREATE OR REPLACE FUNCTION public.decrement_credits(_user_id uuid, _amount integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET available_credits = GREATEST(0, available_credits - _amount),
      updated_at = now()
  WHERE user_id = _user_id;
END;
$$;
