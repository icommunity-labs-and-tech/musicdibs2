-- 1. subscriptions
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  stripe_customer_id text,
  plan text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  amount numeric,
  currency text NOT NULL DEFAULT 'eur',
  current_period_start timestamptz,
  current_period_end timestamptz,
  tier text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own subscriptions" ON public.subscriptions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins read all subscriptions" ON public.subscriptions FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Service role full access subscriptions" ON public.subscriptions FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 2. renewal_log
CREATE TABLE IF NOT EXISTS public.renewal_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  email text,
  action text NOT NULL,
  detail text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.renewal_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read renewal_log" ON public.renewal_log FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Service role full access renewal_log" ON public.renewal_log FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 3. app_settings
CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage app_settings" ON public.app_settings FOR ALL TO authenticated USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Service role full access app_settings" ON public.app_settings FOR ALL TO service_role USING (true) WITH CHECK (true);
INSERT INTO public.app_settings (key, value) VALUES ('subscription_billing_enabled','false'::jsonb) ON CONFLICT (key) DO NOTHING;

-- 4. generation_jobs
CREATE TABLE IF NOT EXISTS public.generation_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL DEFAULT 'audio',
  status text NOT NULL DEFAULT 'pending',
  provider text NOT NULL DEFAULT 'elevenlabs',
  prompt text,
  lyrics text,
  genre text,
  mood text,
  duration_seconds integer DEFAULT 60,
  mode text NOT NULL DEFAULT 'song',
  voice_id text,
  audio_url text,
  audio_duration_seconds integer,
  credits_cost integer NOT NULL DEFAULT 3,
  credits_refunded boolean DEFAULT false,
  error_message text,
  provider_job_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.generation_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own generation_jobs" ON public.generation_jobs FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users insert own generation_jobs" ON public.generation_jobs FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Service role full access generation_jobs" ON public.generation_jobs FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 5. library_deletion_queue
CREATE TABLE IF NOT EXISTS public.library_deletion_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  asset_type text NOT NULL,
  asset_id uuid NOT NULL,
  storage_path text,
  scheduled_deletion_at timestamptz NOT NULL,
  notified_at timestamptz,
  deleted_at timestamptz,
  status text DEFAULT 'scheduled',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.library_deletion_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own deletion queue" ON public.library_deletion_queue FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Service role full access deletion queue" ON public.library_deletion_queue FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 6. profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS managed_by_manager_id uuid,
  ADD COLUMN IF NOT EXISTS is_managed_artist boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_active_at timestamptz DEFAULT now();

-- 7. works
ALTER TABLE public.works ADD COLUMN IF NOT EXISTS file_hash_sha512_b64 text;

-- 8. user_artist_profiles
ALTER TABLE public.user_artist_profiles ADD COLUMN IF NOT EXISTS created_from_generation_id uuid;

-- 9. voice_profiles
ALTER TABLE public.voice_profiles
  ADD COLUMN IF NOT EXISTS preview_url text,
  ADD COLUMN IF NOT EXISTS preview_generated_at timestamptz;

-- 10. ai_generations
ALTER TABLE public.ai_generations ADD COLUMN IF NOT EXISTS voice_profile_id text;