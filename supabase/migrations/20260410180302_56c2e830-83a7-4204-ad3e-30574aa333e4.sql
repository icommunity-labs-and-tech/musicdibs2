
-- Table for certified purchase evidence
CREATE TABLE public.purchase_evidences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  -- Buyer data
  email TEXT,
  display_name TEXT,
  ip_address TEXT,
  user_agent TEXT,
  browser_language TEXT,
  session_id TEXT,
  -- Payment data
  product_type TEXT NOT NULL,
  product_name TEXT,
  amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'eur',
  payment_provider TEXT NOT NULL DEFAULT 'stripe',
  payment_intent_id TEXT,
  charge_id TEXT,
  checkout_session_id TEXT,
  payment_status TEXT NOT NULL DEFAULT 'succeeded',
  -- Legal data
  accepted_terms BOOLEAN DEFAULT false,
  accepted_terms_version TEXT,
  accepted_terms_timestamp TIMESTAMPTZ,
  -- Evidence data
  evidence_payload_json JSONB,
  evidence_hash TEXT,
  -- Certification data
  ibs_transaction_id TEXT,
  ibs_registered_at TIMESTAMPTZ,
  certificate_pdf_url TEXT,
  certification_status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_purchase_evidences_user_id ON public.purchase_evidences(user_id);
CREATE INDEX idx_purchase_evidences_order_id ON public.purchase_evidences(order_id);
CREATE INDEX idx_purchase_evidences_payment_intent ON public.purchase_evidences(payment_intent_id);
CREATE INDEX idx_purchase_evidences_certification_status ON public.purchase_evidences(certification_status);

-- RLS
ALTER TABLE public.purchase_evidences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read all purchase evidences"
  ON public.purchase_evidences FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role full access purchase_evidences"
  ON public.purchase_evidences FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
