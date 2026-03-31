
CREATE TABLE public.premium_social_promotions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  work_id UUID NOT NULL,
  artist_name TEXT NOT NULL,
  song_title TEXT NOT NULL,
  description TEXT NOT NULL,
  promo_style TEXT,
  promo_message TEXT,
  external_link TEXT,
  team_notes TEXT,
  status TEXT NOT NULL DEFAULT 'submitted',
  credits_spent INTEGER NOT NULL DEFAULT 30,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.premium_social_promotions ENABLE ROW LEVEL SECURITY;

-- Users can read their own premium promotions
CREATE POLICY "Users can read own premium promotions"
  ON public.premium_social_promotions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Service role has full access
CREATE POLICY "Service role full access premium promotions"
  ON public.premium_social_promotions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
