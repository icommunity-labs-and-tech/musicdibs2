-- Create table for AI music generations history
CREATE TABLE public.ai_generations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  prompt TEXT NOT NULL,
  duration INTEGER NOT NULL,
  genre TEXT,
  mood TEXT,
  audio_url TEXT NOT NULL,
  is_favorite BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.ai_generations ENABLE ROW LEVEL SECURITY;

-- Users can read their own generations
CREATE POLICY "Users can read own generations"
ON public.ai_generations
FOR SELECT
USING (user_id = auth.uid());

-- Users can insert their own generations
CREATE POLICY "Users can insert own generations"
ON public.ai_generations
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Users can update their own generations (for favorites)
CREATE POLICY "Users can update own generations"
ON public.ai_generations
FOR UPDATE
USING (user_id = auth.uid());

-- Users can delete their own generations
CREATE POLICY "Users can delete own generations"
ON public.ai_generations
FOR DELETE
USING (user_id = auth.uid());

-- Index for faster queries
CREATE INDEX idx_ai_generations_user_id ON public.ai_generations(user_id);
CREATE INDEX idx_ai_generations_created_at ON public.ai_generations(created_at DESC);