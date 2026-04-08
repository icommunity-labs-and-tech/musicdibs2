
-- Table: api_cost_config — per-feature API cost configuration
CREATE TABLE public.api_cost_config (
  feature_key TEXT PRIMARY KEY,
  feature_label TEXT NOT NULL DEFAULT '',
  api_provider TEXT NOT NULL DEFAULT '',
  credit_cost INTEGER NOT NULL DEFAULT 0,
  price_per_credit_eur NUMERIC NOT NULL DEFAULT 0.10,
  api_cost_eur NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.api_cost_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage api_cost_config" ON public.api_cost_config
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role full access api_cost_config" ON public.api_cost_config
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Table: api_cost_daily — daily profitability snapshots
CREATE TABLE public.api_cost_daily (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  feature_key TEXT NOT NULL REFERENCES public.api_cost_config(feature_key),
  total_uses INTEGER NOT NULL DEFAULT 0,
  total_credits_charged INTEGER NOT NULL DEFAULT 0,
  total_revenue_eur NUMERIC NOT NULL DEFAULT 0,
  total_api_cost_eur NUMERIC NOT NULL DEFAULT 0,
  gross_margin_eur NUMERIC NOT NULL DEFAULT 0,
  margin_pct NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (date, feature_key)
);

ALTER TABLE public.api_cost_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read api_cost_daily" ON public.api_cost_daily
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role full access api_cost_daily" ON public.api_cost_daily
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Seed api_cost_config with existing features
INSERT INTO public.api_cost_config (feature_key, feature_label, api_provider, credit_cost, price_per_credit_eur, api_cost_eur, notes) VALUES
  ('generate_audio',         'Crear música (instrumental)',  'Mureka',       5,  0.10, 0.02,  NULL),
  ('generate_audio_song',    'Crear canción con voz',        'Mureka',       8,  0.10, 0.04,  NULL),
  ('edit_audio',             'Edición AI',                   'Mureka',       3,  0.10, 0.015, NULL),
  ('generate_vocal_track',   'Pista vocal AI',               'ElevenLabs',   5,  0.10, 0.03,  NULL),
  ('enhance_audio',          'Masterizado Auphonic',         'Auphonic',     3,  0.10, 0.01,  NULL),
  ('generate_cover',         'Portada AI',                   'fal.ai',       3,  0.10, 0.005, NULL),
  ('generate_video',         'Video AI',                     'Runway',      10,  0.10, 0.08,  NULL),
  ('promote_work',           'Promoción social',             'fal.ai + AI',  5,  0.10, 0.01,  NULL),
  ('register_work',          'Registro blockchain',          'IBS',          1,  0.10, 0.005, NULL),
  ('generate_press_release', 'Nota de prensa',               'Claude',       5,  0.10, 0.02,  NULL),
  ('generate_lyrics',        'Compositor de letras',         'Claude',       2,  0.10, 0.01,  NULL)
ON CONFLICT (feature_key) DO NOTHING;
