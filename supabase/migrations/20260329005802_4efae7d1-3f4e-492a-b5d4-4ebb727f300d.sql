
-- Create voice_profiles table for AI Studio voice type selection
CREATE TABLE public.voice_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  emoji text NOT NULL DEFAULT '🎤',
  description text,
  prompt_tag text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.voice_profiles ENABLE ROW LEVEL SECURITY;

-- Anyone can read active voice profiles (public reference data)
CREATE POLICY "Anyone can read voice profiles"
  ON public.voice_profiles
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Only admins can manage voice profiles
CREATE POLICY "Admins can manage voice profiles"
  ON public.voice_profiles
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed initial voice profiles
INSERT INTO public.voice_profiles (label, emoji, description, prompt_tag, sort_order) VALUES
  ('Masculina grave', '🎙️', 'Voz masculina profunda y potente', 'deep male vocals', 1),
  ('Masculina media', '🎤', 'Voz masculina rango medio, versátil', 'male vocals mid-range', 2),
  ('Masculina aguda', '🗣️', 'Voz masculina alta, estilo tenor', 'high-pitched male tenor vocals', 3),
  ('Femenina grave', '🎵', 'Voz femenina profunda y cálida', 'deep female contralto vocals', 4),
  ('Femenina media', '🎶', 'Voz femenina rango medio, versátil', 'female vocals mid-range', 5),
  ('Femenina aguda', '✨', 'Voz femenina alta, estilo soprano', 'high-pitched female soprano vocals', 6),
  ('Coro / Grupo', '👥', 'Voces múltiples, estilo coral o grupo', 'choir group vocals harmony', 7),
  ('Rap / Spoken', '🔥', 'Voz hablada o estilo rap', 'rap spoken word vocals', 8);
