CREATE TABLE IF NOT EXISTS public.auphonic_productions (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL,
    auphonic_uuid TEXT NOT NULL,
    mode          TEXT NOT NULL,
    status        TEXT NOT NULL DEFAULT 'processing',
    input_url     TEXT,
    output_url    TEXT,
    duration_secs INTEGER,
    credits_used  INTEGER DEFAULT 1,
    error_detail  TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  ALTER TABLE public.auphonic_productions ENABLE ROW LEVEL SECURITY;

  CREATE POLICY "Users can read own auphonic productions"
    ON public.auphonic_productions FOR SELECT TO authenticated
    USING (user_id = auth.uid());

  CREATE POLICY "Service role full access auphonic"
    ON public.auphonic_productions FOR ALL TO service_role
    USING (true) WITH CHECK (true);