INSERT INTO public.ai_generation_logs (
  user_id, feature_key, provider, model, status,
  output_url, storage_bucket, storage_path,
  request_payload, response_payload, created_at, updated_at, completed_at
)
SELECT
  g.user_id,
  CASE WHEN COALESCE(g.genre,'') ILIKE '%instrumental%' OR COALESCE(g.mood,'') ILIKE '%instrumental%'
       THEN 'music_generation_instrumental'
       ELSE 'music_generation_vocal' END,
  COALESCE(g.provider, 'legacy'),
  COALESCE(g.provider, 'legacy'),
  'completed',
  g.audio_url,
  g.storage_bucket,
  g.storage_path,
  jsonb_build_object('prompt', g.prompt, 'genre', g.genre, 'mood', g.mood, 'duration', g.duration, 'backfilled', true),
  jsonb_build_object('generation_id', g.id, 'generation_group_id', g.generation_group_id, 'variant_index', g.variant_index),
  g.created_at, g.created_at, g.created_at
FROM public.ai_generations g
WHERE NOT EXISTS (
  SELECT 1 FROM public.ai_generation_logs l
  WHERE (l.response_payload->>'generation_id')::uuid = g.id
);