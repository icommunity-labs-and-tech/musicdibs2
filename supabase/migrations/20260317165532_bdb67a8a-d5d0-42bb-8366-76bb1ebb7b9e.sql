ALTER TABLE public.works
ADD COLUMN IF NOT EXISTS ibs_payload_checksum TEXT,
ADD COLUMN IF NOT EXISTS ibs_payload_algorithm TEXT;

CREATE INDEX IF NOT EXISTS idx_works_ibs_payload_checksum
ON public.works (ibs_payload_checksum)
WHERE status = 'registered' AND ibs_payload_checksum IS NOT NULL;