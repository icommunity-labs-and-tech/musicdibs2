
-- Make instagram-creatives bucket private
UPDATE storage.buckets SET public = false WHERE id = 'instagram-creatives';

-- RLS policies for youtube-thumbnails bucket
CREATE POLICY "Users can view own youtube thumbnails"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'youtube-thumbnails' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can upload own youtube thumbnails"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'youtube-thumbnails'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update own youtube thumbnails"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'youtube-thumbnails'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own youtube thumbnails"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'youtube-thumbnails'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
