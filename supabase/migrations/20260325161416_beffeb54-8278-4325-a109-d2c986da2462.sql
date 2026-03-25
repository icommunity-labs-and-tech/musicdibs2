CREATE TABLE IF NOT EXISTS public.lyrics_generations (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL,
  description  text,
  theme        text,
  genre        text,
  mood         text,
  style        text,
  language     text DEFAULT 'Español',
  rhyme_scheme text,
  structure    text,
  artist_refs  text[],
  pov          text,
  lyrics       text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lyrics_generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own lyrics"
  ON public.lyrics_generations FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own lyrics"
  ON public.lyrics_generations FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own lyrics"
  ON public.lyrics_generations FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX idx_lyrics_generations_user_id
  ON public.lyrics_generations (user_id, created_at DESC);