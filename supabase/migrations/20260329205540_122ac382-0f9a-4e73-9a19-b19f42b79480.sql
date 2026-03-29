
-- Drop the overly permissive UPDATE policy on works
DROP POLICY IF EXISTS "Users can update distribution on own works" ON public.works;

-- Create restricted UPDATE policy that locks certification-critical fields
CREATE POLICY "Users can update own works metadata" ON public.works
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND status IS NOT DISTINCT FROM (SELECT w.status FROM public.works w WHERE w.id = works.id)
    AND blockchain_hash IS NOT DISTINCT FROM (SELECT w.blockchain_hash FROM public.works w WHERE w.id = works.id)
    AND blockchain_network IS NOT DISTINCT FROM (SELECT w.blockchain_network FROM public.works w WHERE w.id = works.id)
    AND certificate_url IS NOT DISTINCT FROM (SELECT w.certificate_url FROM public.works w WHERE w.id = works.id)
    AND checker_url IS NOT DISTINCT FROM (SELECT w.checker_url FROM public.works w WHERE w.id = works.id)
    AND certified_at IS NOT DISTINCT FROM (SELECT w.certified_at FROM public.works w WHERE w.id = works.id)
    AND file_hash IS NOT DISTINCT FROM (SELECT w.file_hash FROM public.works w WHERE w.id = works.id)
    AND file_path IS NOT DISTINCT FROM (SELECT w.file_path FROM public.works w WHERE w.id = works.id)
    AND ibs_evidence_id IS NOT DISTINCT FROM (SELECT w.ibs_evidence_id FROM public.works w WHERE w.id = works.id)
    AND ibs_payload_checksum IS NOT DISTINCT FROM (SELECT w.ibs_payload_checksum FROM public.works w WHERE w.id = works.id)
    AND ibs_payload_algorithm IS NOT DISTINCT FROM (SELECT w.ibs_payload_algorithm FROM public.works w WHERE w.id = works.id)
    AND ibs_signature_id IS NOT DISTINCT FROM (SELECT w.ibs_signature_id FROM public.works w WHERE w.id = works.id)
  );

-- Service role can update all fields (for edge functions / backend operations)
CREATE POLICY "Service role can update all works" ON public.works
  FOR UPDATE TO service_role
  USING (true)
  WITH CHECK (true);
