
CREATE TABLE public.marketing_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year integer NOT NULL,
  month integer NOT NULL CHECK (month BETWEEN 1 AND 12),
  ad_spend numeric(12,2) NOT NULL DEFAULT 0,
  cogs numeric(12,2) NOT NULL DEFAULT 0,
  cash_balance numeric(12,2) NOT NULL DEFAULT 0,
  monthly_burn numeric(12,2) NOT NULL DEFAULT 0,
  notes text,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(year, month)
);

ALTER TABLE public.marketing_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage marketing metrics"
ON public.marketing_metrics
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role full access marketing metrics"
ON public.marketing_metrics
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
