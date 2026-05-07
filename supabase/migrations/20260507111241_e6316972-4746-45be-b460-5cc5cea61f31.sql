-- 1) Atomic credit debit RPC
CREATE OR REPLACE FUNCTION public.debit_user_credits(
  p_user_id uuid,
  p_amount integer,
  p_description text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _remaining integer;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'invalid_amount';
  END IF;

  UPDATE public.profiles
  SET available_credits = available_credits - p_amount,
      updated_at = now()
  WHERE user_id = p_user_id
    AND available_credits >= p_amount
  RETURNING available_credits INTO _remaining;

  IF _remaining IS NULL THEN
    RAISE EXCEPTION 'insufficient_credits';
  END IF;

  INSERT INTO public.credit_transactions (user_id, amount, type, description)
  VALUES (p_user_id, -p_amount, 'usage', COALESCE(p_description, 'Consumo de créditos'));

  RETURN _remaining;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.debit_user_credits(uuid, integer, text) FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.debit_user_credits(uuid, integer, text) TO service_role;

-- 2) ai_generation_logs: persistent storage refs + structured outputs
ALTER TABLE public.ai_generation_logs
  ADD COLUMN IF NOT EXISTS storage_bucket TEXT,
  ADD COLUMN IF NOT EXISTS storage_path TEXT,
  ADD COLUMN IF NOT EXISTS structured_outputs JSONB;

-- 3) ai_generations: variants grouping + persistent storage refs
ALTER TABLE public.ai_generations
  ADD COLUMN IF NOT EXISTS generation_group_id UUID,
  ADD COLUMN IF NOT EXISTS variant_index INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_primary BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS provider_task_id TEXT,
  ADD COLUMN IF NOT EXISTS storage_bucket TEXT,
  ADD COLUMN IF NOT EXISTS storage_path TEXT;

CREATE INDEX IF NOT EXISTS ai_generations_group_idx
  ON public.ai_generations (generation_group_id, variant_index);
