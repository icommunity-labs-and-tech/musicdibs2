CREATE TABLE IF NOT EXISTS public.user_artist_profiles (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  name text NOT NULL,
  voice_profile_id text REFERENCES public.voice_profiles(id),
  genre text,
  mood text,
  default_duration integer DEFAULT 60,
  style_notes text,
  is_default boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY (id)
);

ALTER TABLE public.user_artist_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own artist profiles"
  ON public.user_artist_profiles FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_artist_profiles_user_id 
  ON public.user_artist_profiles (user_id);