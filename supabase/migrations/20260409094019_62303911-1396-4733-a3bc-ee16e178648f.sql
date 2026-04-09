
CREATE TABLE IF NOT EXISTS public.operation_pricing (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  operation_key TEXT UNIQUE NOT NULL,
  operation_name TEXT NOT NULL,
  operation_icon TEXT,
  credits_cost INTEGER NOT NULL,
  euro_cost DECIMAL(10,2) GENERATED ALWAYS AS (credits_cost * 0.60) STORED,
  category TEXT NOT NULL,
  display_order INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_operation_pricing_category ON public.operation_pricing(category);
CREATE INDEX IF NOT EXISTS idx_operation_pricing_active ON public.operation_pricing(is_active);
CREATE INDEX IF NOT EXISTS idx_operation_pricing_order ON public.operation_pricing(display_order);

CREATE OR REPLACE FUNCTION public.update_operation_pricing_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_operation_pricing_updated_at
BEFORE UPDATE ON public.operation_pricing
FOR EACH ROW EXECUTE FUNCTION public.update_operation_pricing_updated_at();

ALTER TABLE public.operation_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active operation pricing"
ON public.operation_pricing
FOR SELECT
TO authenticated, anon
USING (is_active = true);

CREATE POLICY "Admins can manage operation pricing"
ON public.operation_pricing
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role full access operation_pricing"
ON public.operation_pricing
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
