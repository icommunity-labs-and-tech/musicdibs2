CREATE INDEX IF NOT EXISTS ai_generation_logs_created_at_idx
ON public.ai_generation_logs (created_at DESC);

CREATE OR REPLACE FUNCTION public.get_admin_ai_generation_logs(
  p_status_filter text DEFAULT NULL,
  p_feature_filter text DEFAULT NULL,
  p_limit integer DEFAULT 100
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  feature_key text,
  provider text,
  model text,
  provider_task_id text,
  status text,
  output_url text,
  estimated_cost_usd numeric,
  user_credits_charged integer,
  error_message text,
  created_at timestamptz,
  completed_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  safe_limit integer;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  safe_limit := LEAST(GREATEST(COALESCE(p_limit, 100), 1), 200);

  RETURN QUERY
  SELECT
    l.id,
    l.user_id,
    l.feature_key,
    l.provider,
    l.model,
    l.provider_task_id,
    l.status,
    l.output_url,
    l.estimated_cost_usd,
    l.user_credits_charged,
    l.error_message,
    l.created_at,
    l.completed_at
  FROM public.ai_generation_logs AS l
  WHERE (p_status_filter IS NULL OR l.status = p_status_filter)
    AND (p_feature_filter IS NULL OR l.feature_key = p_feature_filter)
  ORDER BY l.created_at DESC
  LIMIT safe_limit;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_admin_ai_generation_log_payloads(p_log_id uuid)
RETURNS TABLE (
  request_payload jsonb,
  response_payload jsonb
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT l.request_payload, l.response_payload
  FROM public.ai_generation_logs AS l
  WHERE l.id = p_log_id
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_ai_generation_logs(text, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_ai_generation_log_payloads(uuid) TO authenticated;