INSERT INTO storage.buckets (id, name, public)
VALUES ('instagram-creatives', 'instagram-creatives', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users upload own instagram creatives"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'instagram-creatives'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Public read instagram creatives"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'instagram-creatives');