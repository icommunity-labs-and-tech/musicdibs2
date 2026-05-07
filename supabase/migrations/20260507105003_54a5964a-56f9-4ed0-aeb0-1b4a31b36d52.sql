
-- ============================================
-- AI Provider Settings (admin-controlled router)
-- ============================================
CREATE TABLE public.ai_provider_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 1,
  config_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  cost_usd_estimate NUMERIC(10,4),
  user_credits_cost INTEGER,
  fallback_provider TEXT,
  fallback_model TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Only one active row per feature_key
CREATE UNIQUE INDEX ai_provider_settings_one_active_per_feature
  ON public.ai_provider_settings (feature_key)
  WHERE is_active = true;

-- Lookup index
CREATE INDEX ai_provider_settings_feature_idx
  ON public.ai_provider_settings (feature_key, is_enabled, priority);

ALTER TABLE public.ai_provider_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage ai_provider_settings"
  ON public.ai_provider_settings
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role full access ai_provider_settings"
  ON public.ai_provider_settings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- updated_at trigger
CREATE TRIGGER update_ai_provider_settings_updated_at
BEFORE UPDATE ON public.ai_provider_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_operation_pricing_updated_at();

-- ============================================
-- AI Generation Logs (tracks each generation)
-- ============================================
CREATE TABLE public.ai_generation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  feature_key TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  provider_task_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  request_payload JSONB,
  response_payload JSONB,
  output_url TEXT,
  estimated_cost_usd NUMERIC(10,4),
  user_credits_charged INTEGER,
  used_fallback BOOLEAN NOT NULL DEFAULT false,
  primary_provider_attempted TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX ai_generation_logs_user_idx ON public.ai_generation_logs (user_id, created_at DESC);
CREATE INDEX ai_generation_logs_task_idx ON public.ai_generation_logs (provider_task_id);
CREATE INDEX ai_generation_logs_feature_idx ON public.ai_generation_logs (feature_key, created_at DESC);

ALTER TABLE public.ai_generation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read all ai_generation_logs"
  ON public.ai_generation_logs FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users read own ai_generation_logs"
  ON public.ai_generation_logs FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Service role full access ai_generation_logs"
  ON public.ai_generation_logs FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE TRIGGER update_ai_generation_logs_updated_at
BEFORE UPDATE ON public.ai_generation_logs
FOR EACH ROW
EXECUTE FUNCTION public.update_operation_pricing_updated_at();

-- ============================================
-- Seed initial provider catalog
-- ============================================
INSERT INTO public.ai_provider_settings
  (feature_key, provider, model, is_active, is_enabled, priority, fallback_provider, fallback_model, cost_usd_estimate, notes)
VALUES
  -- Music: vocal song
  ('music_generation_vocal', 'elevenlabs', 'eleven_music_v1', true,  true, 1, 'lyria',     'lyria-002',          0.08, 'Default vocal song generator'),
  ('music_generation_vocal', 'kie_suno',   'V4_5',           false, true, 2, NULL,        NULL,                 0.05, 'KIE Suno (async via callback)'),
  ('music_generation_vocal', 'lyria',      'lyria-002',      false, true, 3, NULL,        NULL,                 0.06, 'Google Lyria fallback'),

  -- Music: instrumental
  ('music_generation_instrumental', 'elevenlabs', 'eleven_music_v1', true,  true, 1, 'lyria',   'lyria-002', 0.08, 'Default instrumental generator'),
  ('music_generation_instrumental', 'kie_suno',   'V4_5',           false, true, 2, NULL,      NULL,        0.05, 'KIE Suno instrumental mode'),
  ('music_generation_instrumental', 'lyria',      'lyria-002',      false, true, 3, NULL,      NULL,        0.06, NULL),

  -- Lyrics
  ('lyrics_generation', 'anthropic', 'claude-haiku-4-5-20251001', true,  true, 1, 'gemini', 'gemini-2.5-flash', 0.002, 'Default lyrics writer'),
  ('lyrics_generation', 'gemini',    'gemini-2.5-flash',          false, true, 2, NULL,     NULL,               0.001, NULL),

  -- Mastering
  ('mastering', 'roex',     'mastering-v1', true,  true, 1, 'auphonic', 'auphonic-v1', 0.20, 'Default mastering provider'),
  ('mastering', 'auphonic', 'auphonic-v1', false, true, 2, NULL,        NULL,          0.15, NULL),

  -- Cover art
  ('cover_generation', 'fal',       'flux-pro',                       true,  true, 1, 'gemini',    'gemini-3-flash-preview', 0.03, 'Default cover art'),
  ('cover_generation', 'gemini',    'gemini-3-flash-preview',         false, true, 2, NULL,        NULL,                     0.02, NULL),
  ('cover_generation', 'stability', 'stable-diffusion-3.5-large',     false, true, 3, NULL,        NULL,                     0.04, NULL),

  -- Promo material (creatives / videos)
  ('promo_generation', 'fal',     'flux-pro',         true,  true, 1, 'gemini', 'gemini-3-flash-preview', 0.03, 'Default promo creatives'),
  ('promo_generation', 'gemini',  'gemini-3-flash-preview', false, true, 2, NULL,    NULL,                     0.02, NULL),
  ('promo_generation', 'runway',  'gen3',             false, true, 3, NULL,     NULL,                     0.50, 'Used for promo videos');
