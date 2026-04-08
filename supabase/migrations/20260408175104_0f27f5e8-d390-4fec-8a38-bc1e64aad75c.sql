
CREATE TABLE public.product_metrics_daily (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date date NOT NULL UNIQUE,
  ai_studio_entries integer NOT NULL DEFAULT 0,
  generations_started integer NOT NULL DEFAULT 0,
  generations_completed integer NOT NULL DEFAULT 0,
  audios_downloaded integer NOT NULL DEFAULT 0,
  works_after_generation integer NOT NULL DEFAULT 0,
  uses_create_music integer NOT NULL DEFAULT 0,
  uses_lyrics integer NOT NULL DEFAULT 0,
  uses_vocal integer NOT NULL DEFAULT 0,
  uses_cover integer NOT NULL DEFAULT 0,
  uses_video integer NOT NULL DEFAULT 0,
  uses_promotion integer NOT NULL DEFAULT 0,
  uses_press integer NOT NULL DEFAULT 0,
  uses_register integer NOT NULL DEFAULT 0,
  uses_voice_cloning integer NOT NULL DEFAULT 0,
  unique_users integer NOT NULL DEFAULT 0,
  total_revenue_eur numeric NOT NULL DEFAULT 0,
  revenue_create_music_eur numeric NOT NULL DEFAULT 0,
  revenue_cover_eur numeric NOT NULL DEFAULT 0,
  revenue_video_eur numeric NOT NULL DEFAULT 0,
  revenue_promotion_eur numeric NOT NULL DEFAULT 0,
  revenue_register_eur numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.product_metrics_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read product_metrics_daily"
  ON public.product_metrics_daily FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role full access product_metrics_daily"
  ON public.product_metrics_daily FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE INDEX idx_product_metrics_daily_date ON public.product_metrics_daily (date DESC);
