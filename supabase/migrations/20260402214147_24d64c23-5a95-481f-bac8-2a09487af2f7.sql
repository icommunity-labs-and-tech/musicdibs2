
INSERT INTO storage.buckets (id, name, public)
VALUES ('translated-vocals', 'translated-vocals', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload their own translated vocals"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'translated-vocals' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can read their own translated vocals"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'translated-vocals' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own translated vocals"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'translated-vocals' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
