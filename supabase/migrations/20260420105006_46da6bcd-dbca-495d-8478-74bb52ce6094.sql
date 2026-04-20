-- 1) Recreate cancellation_stats view with SECURITY INVOKER
DROP VIEW IF EXISTS public.cancellation_stats;
CREATE VIEW public.cancellation_stats
WITH (security_invoker = true) AS
SELECT cancellation_reason,
       plan_type,
       count(*) AS total_cancelaciones,
       round(avg(credits_remaining), 1) AS avg_creditos_restantes,
       round(avg(lifetime_value), 2) AS avg_lifetime_value,
       date_trunc('day'::text, cancelled_at) AS fecha
FROM public.cancellation_tracking
GROUP BY cancellation_reason, plan_type, (date_trunc('day'::text, cancelled_at))
ORDER BY (date_trunc('day'::text, cancelled_at)) DESC;

-- 2) Drop leftover public-read policy on the private 'instagram-creatives' bucket
DROP POLICY IF EXISTS "Public read instagram creatives" ON storage.objects;

-- 3) Tighten upload policy on 'premium-promo-media' (path: promotions/{user_id}/...)
DROP POLICY IF EXISTS "Users can upload promo media" ON storage.objects;
CREATE POLICY "Users can upload promo media"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'premium-promo-media'
  AND (storage.foldername(name))[1] = 'promotions'
  AND (storage.foldername(name))[2] = auth.uid()::text
);