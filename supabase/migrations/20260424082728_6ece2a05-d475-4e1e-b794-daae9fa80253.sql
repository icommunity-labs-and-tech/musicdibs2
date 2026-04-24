-- 1. subscriptions
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS plan text,
  ADD COLUMN IF NOT EXISTS amount numeric,
  ADD COLUMN IF NOT EXISTS currency text DEFAULT 'eur';

-- 2. renewal_log
ALTER TABLE public.renewal_log
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS action text,
  ADD COLUMN IF NOT EXISTS detail text;

-- 3. profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS managed_by_manager_id uuid,
  ADD COLUMN IF NOT EXISTS is_managed_artist boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_active_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS library_status text DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS library_status_since timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS free_downloads_used integer DEFAULT 0;

-- works
ALTER TABLE public.works
  ADD COLUMN IF NOT EXISTS file_hash_sha512_b64 text;

-- user_artist_profiles
ALTER TABLE public.user_artist_profiles
  ADD COLUMN IF NOT EXISTS generation_type text DEFAULT 'vocal',
  ADD COLUMN IF NOT EXISTS created_from_generation_id uuid;

-- voice_profiles
ALTER TABLE public.voice_profiles
  ADD COLUMN IF NOT EXISTS preview_url text,
  ADD COLUMN IF NOT EXISTS preview_generated_at timestamptz;

-- ai_generations
ALTER TABLE public.ai_generations
  ADD COLUMN IF NOT EXISTS voice_profile_id text;