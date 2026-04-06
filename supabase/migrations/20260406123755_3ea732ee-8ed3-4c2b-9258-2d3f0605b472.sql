
CREATE TABLE public.metric_alert_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_key text NOT NULL,
  alert_title text NOT NULL,
  alert_description text,
  notified_at timestamp with time zone NOT NULL DEFAULT now(),
  resolved_at timestamp with time zone,
  UNIQUE(alert_key)
);

ALTER TABLE public.metric_alert_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access metric alerts"
  ON public.metric_alert_notifications
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
