
CREATE TABLE IF NOT EXISTS public.ibs_sync_queue (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_id          UUID NOT NULL REFERENCES public.works(id) ON DELETE CASCADE,
    user_id          UUID NOT NULL,
    ibs_evidence_id  TEXT NOT NULL,
    retry_count      INTEGER NOT NULL DEFAULT 0,
    max_retries      INTEGER NOT NULL DEFAULT 3,
    status           TEXT NOT NULL DEFAULT 'waiting',
    last_retry_at    TIMESTAMPTZ,
    error_detail     TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ibs_sync_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_only_select" ON public.ibs_sync_queue FOR SELECT USING (false);
CREATE POLICY "service_role_only_insert" ON public.ibs_sync_queue FOR INSERT WITH CHECK (false);
CREATE POLICY "service_role_only_update" ON public.ibs_sync_queue FOR UPDATE USING (false) WITH CHECK (false);
CREATE POLICY "service_role_only_delete" ON public.ibs_sync_queue FOR DELETE USING (false);

CREATE INDEX IF NOT EXISTS idx_ibs_sync_queue_status ON public.ibs_sync_queue(status) WHERE status IN ('waiting', 'retrying');
CREATE INDEX IF NOT EXISTS idx_ibs_sync_queue_work_id ON public.ibs_sync_queue(work_id);
