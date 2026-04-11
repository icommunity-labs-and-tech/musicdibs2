CREATE POLICY "Admins can read all cancellation surveys"
  ON public.cancellation_surveys
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));