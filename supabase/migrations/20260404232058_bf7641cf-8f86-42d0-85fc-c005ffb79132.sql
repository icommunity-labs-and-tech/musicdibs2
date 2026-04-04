
-- Tabla para notas de prensa generadas con IA
CREATE TABLE IF NOT EXISTS public.press_releases (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  work_id uuid,
  title text NOT NULL,
  body text NOT NULL,
  short_bio text,
  genre text,
  language text DEFAULT 'es',
  status text DEFAULT 'draft',
  groover_campaign_id text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY (id)
);

ALTER TABLE public.press_releases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own press releases"
  ON public.press_releases FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Tabla para conexión con Audiomack
CREATE TABLE IF NOT EXISTS public.audiomack_connections (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL UNIQUE,
  audiomack_slug text NOT NULL,
  audiomack_id text,
  connected_at timestamp with time zone DEFAULT now() NOT NULL,
  last_sync_at timestamp with time zone,
  PRIMARY KEY (id)
);

ALTER TABLE public.audiomack_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own audiomack connection"
  ON public.audiomack_connections FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Tabla para métricas de Audiomack (cache)
CREATE TABLE IF NOT EXISTS public.audiomack_metrics (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  audiomack_slug text NOT NULL,
  plays_last_hour integer DEFAULT 0,
  favorites integer DEFAULT 0,
  reposts integer DEFAULT 0,
  followers integer DEFAULT 0,
  top_songs jsonb,
  fetched_at timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY (id)
);

ALTER TABLE public.audiomack_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own audiomack metrics"
  ON public.audiomack_metrics FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Service role manage audiomack metrics"
  ON public.audiomack_metrics FOR ALL TO service_role
  USING (true);
