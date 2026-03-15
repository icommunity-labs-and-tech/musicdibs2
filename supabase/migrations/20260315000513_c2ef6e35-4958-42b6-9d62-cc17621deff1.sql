
-- Tabla de rate limiting optimizada para Edge Functions de IA generativa
CREATE TABLE IF NOT EXISTS public.ai_rate_limits (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL,
  function_name TEXT NOT NULL,
  called_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índice para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_ai_rate_limits_lookup
  ON public.ai_rate_limits (user_id, function_name, called_at DESC);

-- RLS: solo service_role puede operar esta tabla
ALTER TABLE public.ai_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_only"
  ON public.ai_rate_limits
  FOR ALL TO public
  USING (false)
  WITH CHECK (false);

-- Limpieza automática cada hora via pg_cron
SELECT cron.schedule(
  'cleanup-ai-rate-limits',
  '0 * * * *',
  $$ DELETE FROM public.ai_rate_limits WHERE called_at < now() - interval '1 hour' $$
);

-- Eliminar la tabla rate_limits antigua y sus dependencias
DROP TRIGGER IF EXISTS trg_cleanup_rate_limits ON public.rate_limits;
DROP FUNCTION IF EXISTS public.cleanup_rate_limits();
DROP FUNCTION IF EXISTS public.check_rate_limit(uuid, text, integer, integer);
DROP TABLE IF EXISTS public.rate_limits;
