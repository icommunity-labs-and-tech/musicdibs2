
CREATE TABLE public.video_generations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  task_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  prompt TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'text_to_video',
  style TEXT,
  aspect_ratio TEXT DEFAULT '1280:768',
  duration INTEGER DEFAULT 5,
  video_url TEXT,
  merged_url TEXT,
  merged_audio_id UUID,
  failure_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.video_generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own video generations"
  ON public.video_generations FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own video generations"
  ON public.video_generations FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own video generations"
  ON public.video_generations FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own video generations"
  ON public.video_generations FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
