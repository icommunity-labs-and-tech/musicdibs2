
-- 1) Allow users to read their own orders
CREATE POLICY "Users can read own orders"
ON public.orders
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 2) Instagram creatives: allow users to read their own files
CREATE POLICY "Users can read own instagram creatives"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'instagram-creatives'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 3) Instagram creatives: allow users to delete their own files
CREATE POLICY "Users can delete own instagram creatives"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'instagram-creatives'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 4) Instagram creatives: allow users to update their own files
CREATE POLICY "Users can update own instagram creatives"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'instagram-creatives'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'instagram-creatives'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
