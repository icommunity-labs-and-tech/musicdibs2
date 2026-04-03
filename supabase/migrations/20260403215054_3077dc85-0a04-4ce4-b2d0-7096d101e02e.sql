
INSERT INTO storage.buckets (id, name, public)
VALUES ('event-posters', 'event-posters', false),
       ('social-posters', 'social-posters', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users upload event posters"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'event-posters' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users read event posters"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'event-posters' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users delete event posters"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'event-posters' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users upload social posters"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'social-posters' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users read social posters"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'social-posters' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users delete social posters"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'social-posters' AND (storage.foldername(name))[1] = auth.uid()::text);
