CREATE POLICY "Users can update distribution on own works"
ON public.works
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());