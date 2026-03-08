INSERT INTO storage.buckets (id, name, public) VALUES ('blog-images', 'blog-images', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read access for blog images" ON storage.objects FOR SELECT USING (bucket_id = 'blog-images');

CREATE POLICY "Authenticated users can upload blog images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'blog-images');

CREATE POLICY "Authenticated users can update blog images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'blog-images');

CREATE POLICY "Authenticated users can delete blog images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'blog-images');