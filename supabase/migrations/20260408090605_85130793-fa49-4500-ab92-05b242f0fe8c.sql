
-- Create feature_costs table
CREATE TABLE public.feature_costs (
  feature_key TEXT PRIMARY KEY,
  credit_cost INTEGER NOT NULL DEFAULT 0,
  label TEXT NOT NULL DEFAULT ''
);

-- Enable RLS
ALTER TABLE public.feature_costs ENABLE ROW LEVEL SECURITY;

-- Anyone can read (needed by edge functions with anon key and client-side)
CREATE POLICY "Anyone can read feature costs"
  ON public.feature_costs FOR SELECT
  TO anon, authenticated
  USING (true);

-- Only admins can modify
CREATE POLICY "Admins can manage feature costs"
  ON public.feature_costs FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Service role full access
CREATE POLICY "Service role full access feature_costs"
  ON public.feature_costs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
