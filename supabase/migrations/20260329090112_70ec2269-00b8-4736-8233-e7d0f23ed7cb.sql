
-- Add sample_url column to voice_profiles
ALTER TABLE public.voice_profiles ADD COLUMN sample_url text;

-- Create storage bucket for voice samples
INSERT INTO storage.buckets (id, name, public)
VALUES ('voice-samples', 'voice-samples', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to read voice sample files
CREATE POLICY "Anyone can read voice samples"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'voice-samples');

-- Allow admins to upload/manage voice samples
CREATE POLICY "Admins can manage voice samples"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'voice-samples' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'voice-samples' AND public.has_role(auth.uid(), 'admin'));
