CREATE TABLE public.cancellation_surveys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  plan_type TEXT,
  credits_remaining INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.cancellation_surveys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own cancellation surveys"
  ON public.cancellation_surveys FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own cancellation surveys"
  ON public.cancellation_surveys FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);