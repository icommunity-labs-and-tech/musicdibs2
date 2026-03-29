
CREATE TABLE IF NOT EXISTS public.social_promotions (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  work_id uuid NOT NULL,
  image_url text,
  copy_ig_feed text,
  copy_ig_story text,
  copy_tiktok text,
  status text NOT NULL DEFAULT 'generating',
  credits_spent integer DEFAULT 25,
  error_detail text,
  email_sent_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY (id)
);

ALTER TABLE public.social_promotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own promotions"
  ON public.social_promotions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Service role full access social promotions"
  ON public.social_promotions FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX idx_social_promotions_user ON public.social_promotions (user_id);
CREATE INDEX idx_social_promotions_work ON public.social_promotions (work_id);
CREATE INDEX idx_social_promotions_status ON public.social_promotions (status);

INSERT INTO storage.buckets (id, name, public)
VALUES ('social-promo-images', 'social-promo-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read social promo images"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'social-promo-images');

CREATE POLICY "Service role upload social promo images"
  ON storage.objects FOR INSERT TO service_role
  WITH CHECK (bucket_id = 'social-promo-images');
