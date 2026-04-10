
CREATE TABLE public.purchase_usage_evidences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  purchase_evidence_id UUID REFERENCES public.purchase_evidences(id) ON DELETE CASCADE NOT NULL,
  event_type TEXT NOT NULL,
  event_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  session_id TEXT,
  metadata_json JSONB DEFAULT '{}'::jsonb,
  evidence_hash TEXT,
  ibs_transaction_id TEXT,
  ibs_registered_at TIMESTAMPTZ,
  certification_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_purchase_usage_user ON public.purchase_usage_evidences(user_id);
CREATE INDEX idx_purchase_usage_purchase ON public.purchase_usage_evidences(purchase_evidence_id);
CREATE INDEX idx_purchase_usage_event_type ON public.purchase_usage_evidences(event_type);

ALTER TABLE public.purchase_usage_evidences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read usage evidences"
  ON public.purchase_usage_evidences
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role full access usage evidences"
  ON public.purchase_usage_evidences
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
