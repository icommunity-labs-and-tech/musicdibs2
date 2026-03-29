
CREATE TABLE IF NOT EXISTS public.voice_clones (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  elevenlabs_voice_id text NOT NULL,
  name text NOT NULL,
  description text,
  sample_storage_path text,
  status text NOT NULL DEFAULT 'active',
  remove_background_noise boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY (id)
);

ALTER TABLE public.voice_clones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own voice clones"
  ON public.voice_clones FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_voice_clones_user_id 
  ON public.voice_clones (user_id);

ALTER TABLE public.user_artist_profiles
  ADD COLUMN IF NOT EXISTS voice_clone_id uuid REFERENCES public.voice_clones(id),
  ADD COLUMN IF NOT EXISTS voice_type text DEFAULT 'preset';

INSERT INTO storage.buckets (id, name, public)
VALUES ('voice-clone-samples', 'voice-clone-samples', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload own voice samples"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'voice-clone-samples' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can read own voice samples"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'voice-clone-samples' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Service role full access voice clone samples"
  ON storage.objects FOR ALL TO service_role
  USING (bucket_id = 'voice-clone-samples');
