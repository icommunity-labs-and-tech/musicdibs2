CREATE POLICY "Users can delete own social promotions"
  ON public.social_promotions
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());