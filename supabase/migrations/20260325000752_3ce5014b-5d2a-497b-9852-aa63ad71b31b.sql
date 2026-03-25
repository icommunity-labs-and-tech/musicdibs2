CREATE POLICY "Users can upload auphonic files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'works-files'
  AND (storage.foldername(name))[1] = 'auphonic'
  AND auth.uid()::text = (storage.foldername(name))[2]
);

CREATE POLICY "Users can read own auphonic files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'works-files'
  AND (storage.foldername(name))[1] = 'auphonic'
  AND auth.uid()::text = (storage.foldername(name))[2]
);