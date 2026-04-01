
-- Add media_file_path column to premium_social_promotions
ALTER TABLE public.premium_social_promotions ADD COLUMN media_file_path text DEFAULT NULL;

-- Create storage bucket for premium promo media files
INSERT INTO storage.buckets (id, name, public) VALUES ('premium-promo-media', 'premium-promo-media', false);

-- RLS: authenticated users can upload to their own folder
CREATE POLICY "Users can upload own promo media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'premium-promo-media' AND (storage.foldername(name))[1] = auth.uid()::text);

-- RLS: users can read their own files
CREATE POLICY "Users can read own promo media"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'premium-promo-media' AND (storage.foldername(name))[1] = auth.uid()::text);

-- RLS: service_role can do everything (for admin download and cleanup)
CREATE POLICY "Service role full access promo media"
ON storage.objects FOR ALL TO service_role
USING (bucket_id = 'premium-promo-media')
WITH CHECK (bucket_id = 'premium-promo-media');

-- RLS: admins can read promo media
CREATE POLICY "Admins can read promo media"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'premium-promo-media' AND public.has_role(auth.uid(), 'admin'));
