
CREATE TABLE public.ab_test_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id text NOT NULL,
  variant_index integer NOT NULL,
  variant_text text NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('impression', 'click')),
  session_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Allow anyone to insert (anonymous visitors)
ALTER TABLE public.ab_test_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert ab events"
ON public.ab_test_events FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Admins can read ab events"
ON public.ab_test_events FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Index for fast aggregation
CREATE INDEX idx_ab_events_test_id ON public.ab_test_events (test_id, event_type);
