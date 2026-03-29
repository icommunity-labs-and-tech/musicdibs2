
-- Drop existing voice_profiles and recreate with new schema
DROP TABLE IF EXISTS public.voice_profiles CASCADE;

CREATE TABLE public.voice_profiles (
  id text NOT NULL PRIMARY KEY,
  label text NOT NULL,
  description text,
  gender text NOT NULL,
  style text NOT NULL,
  prompt_tag text NOT NULL,
  emoji text,
  sort_order integer DEFAULT 0,
  active boolean DEFAULT true,
  sample_url text,
  sample_generated_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.voice_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active voice profiles"
  ON public.voice_profiles FOR SELECT TO anon, authenticated
  USING (active = true);

CREATE POLICY "Admins can manage voice profiles"
  ON public.voice_profiles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.voice_profiles (id, label, description, gender, style, prompt_tag, emoji, sort_order) VALUES
('female-pop',     'Pop femenina',      'Voz femenina clara y melódica, estilo pop comercial',          'female', 'pop',     'bright female pop vocals, melodic, clear tone',                        '👩', 10),
('female-rb',      'R&B / Soul',        'Voz femenina cálida y expresiva, estilo R&B y soul',            'female', 'rb',      'warm female R&B soul vocals, expressive, soulful',                     '🎤', 20),
('female-latin',   'Latina / Reggaeton','Voz femenina urbana, estilo reggaeton y latin pop',             'female', 'latin',   'female urban latin vocals, reggaeton style, powerful',                 '💃', 30),
('female-ballad',  'Balada femenina',   'Voz femenina suave y emotiva, perfecta para baladas',           'female', 'ballad',  'soft emotional female vocals, ballad style, intimate',                 '🌸', 40),
('female-rock',    'Rock femenina',     'Voz femenina potente y rockera',                                'female', 'rock',    'powerful female rock vocals, edgy, intense',                           '🎸', 50),
('male-pop',       'Pop masculino',     'Voz masculina moderna, estilo pop y electropop',                'male',   'pop',     'smooth male pop vocals, modern, polished',                             '👨', 60),
('male-trap',      'Trap / Hip-Hop',    'Voz masculina urbana, estilo trap y hip-hop',                   'male',   'trap',    'deep male trap vocals, urban hip-hop style, melodic rap',              '🎧', 70),
('male-latin',     'Latino / Urbano',   'Voz masculina latina, estilo reggaeton y trap latino',          'male',   'latin',   'male latin urban vocals, reggaeton and trap latino style',             '🌴', 80),
('male-rock',      'Rock masculino',    'Voz masculina potente, estilo rock y alternativo',              'male',   'rock',    'powerful male rock vocals, gritty, energetic',                         '🤘', 90),
('male-ballad',    'Balada masculina',  'Voz masculina profunda y emotiva para baladas',                 'male',   'ballad',  'deep emotional male vocals, crooner ballad style, romantic',           '🎻', 100),
('male-flamenco',  'Flamenco / Copla',  'Voz masculina con raíces flamencas y española',                'male',   'flamenco','male flamenco vocals, spanish style, deep and passionate',             '🌹', 110),
('child-young',    'Voz juvenil',       'Voz joven y fresca, estilo pop juvenil',                       'neutral','pop',     'young fresh vocals, youthful pop style, energetic',                    '⭐', 120),
('choir',          'Coro / Coral',      'Voces corales, múltiples voces en armonía',                    'neutral','choir',   'choir vocals, harmonic, multiple voices, epic',                        '🎵', 130),
('vintage-crooner','Crooner clásico',   'Voz estilo crooner vintage, años 50-60',                       'male',   'vintage', 'old crooner male vocalist, vintage 1950s style, charming, nostalgic',  '🎩', 140)
ON CONFLICT (id) DO NOTHING;
