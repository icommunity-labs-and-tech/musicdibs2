ALTER TABLE public.voice_clones
  ADD COLUMN IF NOT EXISTS mureka_vocal_id text,
  ADD COLUMN IF NOT EXISTS provider text DEFAULT 'elevenlabs';