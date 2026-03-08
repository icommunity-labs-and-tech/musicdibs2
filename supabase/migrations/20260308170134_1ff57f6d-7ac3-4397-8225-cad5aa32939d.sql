
-- Create works-files storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('works-files', 'works-files', false);

-- Allow authenticated users to upload their own files
CREATE POLICY "Users can upload own work files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'works-files' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow authenticated users to read their own files
CREATE POLICY "Users can read own work files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'works-files' AND (storage.foldername(name))[1] = auth.uid()::text);
