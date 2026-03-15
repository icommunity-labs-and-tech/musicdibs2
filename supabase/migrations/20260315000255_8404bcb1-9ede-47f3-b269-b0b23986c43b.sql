
-- Rate limiting table: stores recent request timestamps per user+feature
CREATE TABLE public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  feature text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_rate_limits_user_feature_time ON public.rate_limits (user_id, feature, created_at DESC);

-- Auto-cleanup old records (older than 1 hour)
CREATE OR REPLACE FUNCTION public.cleanup_rate_limits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.rate_limits WHERE created_at < now() - interval '1 hour';
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_cleanup_rate_limits
  AFTER INSERT ON public.rate_limits
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.cleanup_rate_limits();

-- Atomic rate limit check: returns true if allowed, false if rate limited
-- Also inserts a record if allowed
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  _user_id uuid,
  _feature text,
  _max_requests int,
  _window_seconds int
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _count int;
BEGIN
  SELECT count(*) INTO _count
  FROM public.rate_limits
  WHERE user_id = _user_id
    AND feature = _feature
    AND created_at > now() - (_window_seconds || ' seconds')::interval;

  IF _count >= _max_requests THEN
    RETURN false;
  END IF;

  INSERT INTO public.rate_limits (user_id, feature) VALUES (_user_id, _feature);
  RETURN true;
END;
$$;

-- RLS: only service_role can access
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only" ON public.rate_limits
  FOR ALL TO public
  USING (false)
  WITH CHECK (false);
