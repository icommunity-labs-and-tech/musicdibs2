ALTER TABLE public.ai_generation_logs
  ADD COLUMN IF NOT EXISTS callback_token TEXT,
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS ai_generation_logs_idempotency_idx
  ON public.ai_generation_logs (user_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS ai_generation_logs_callback_token_idx
  ON public.ai_generation_logs (callback_token)
  WHERE callback_token IS NOT NULL;