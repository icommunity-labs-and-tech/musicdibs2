
CREATE TABLE public.product_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  event_name TEXT NOT NULL,
  feature TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  session_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_product_events_user ON public.product_events (user_id);
CREATE INDEX idx_product_events_event ON public.product_events (event_name);
CREATE INDEX idx_product_events_created ON public.product_events (created_at);

ALTER TABLE public.product_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own events"
ON public.product_events
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can read all events"
ON public.product_events
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
