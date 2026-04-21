CREATE INDEX IF NOT EXISTS idx_ai_generations_user_created_at_desc
ON public.ai_generations (user_id, created_at DESC);