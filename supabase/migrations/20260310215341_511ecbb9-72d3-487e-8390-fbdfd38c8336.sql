
-- Add iBS-related columns to works table
ALTER TABLE public.works
  ADD COLUMN IF NOT EXISTS ibs_evidence_id text,
  ADD COLUMN IF NOT EXISTS ibs_signature_id text,
  ADD COLUMN IF NOT EXISTS blockchain_hash text,
  ADD COLUMN IF NOT EXISTS blockchain_network text,
  ADD COLUMN IF NOT EXISTS checker_url text,
  ADD COLUMN IF NOT EXISTS certified_at timestamptz;

-- Create table to store iCommunity signatures (user identities)
CREATE TABLE IF NOT EXISTS public.ibs_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  ibs_signature_id text NOT NULL,
  signature_name text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  kyc_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, ibs_signature_id)
);

-- Enable RLS
ALTER TABLE public.ibs_signatures ENABLE ROW LEVEL SECURITY;

-- RLS: users can read their own signatures
CREATE POLICY "Users can read own ibs signatures"
  ON public.ibs_signatures
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- RLS: users can insert their own signatures
CREATE POLICY "Users can insert own ibs signatures"
  ON public.ibs_signatures
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- RLS: users can update their own signatures
CREATE POLICY "Users can update own ibs signatures"
  ON public.ibs_signatures
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());
