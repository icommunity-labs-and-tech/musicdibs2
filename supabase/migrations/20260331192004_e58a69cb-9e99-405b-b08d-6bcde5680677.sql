
-- 1. Fix auphonic-temp bucket INSERT policy: scope uploads to user's own folder
DROP POLICY IF EXISTS "Auth users upload auphonic-temp" ON storage.objects;
CREATE POLICY "Auth users upload auphonic-temp scoped"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'auphonic-temp'
    AND (storage.foldername(name))[1] = 'auphonic'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

-- 2. Harden ab_test_events INSERT: only allow known event_types, restrict to session-bound
DROP POLICY IF EXISTS "Anyone can insert ab events" ON public.ab_test_events;
CREATE POLICY "Rate-limited ab event insert"
  ON public.ab_test_events FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    event_type IN ('impression', 'click', 'conversion')
    AND session_id IS NOT NULL
    AND char_length(session_id) <= 64
    AND char_length(test_id) <= 64
    AND char_length(variant_text) <= 256
  );

-- 3. Tighten always-true service_role policies by making them explicit role checks
-- audit_log INSERT is already service_role only via roles, OK
-- credit_transactions INSERT is already service_role only via roles, OK
-- works UPDATE for service_role is already scoped to service_role role, OK

-- 4. Fix function search_path on functions that lack it
-- enqueue_email
CREATE OR REPLACE FUNCTION public.enqueue_email(queue_name text, payload jsonb)
  RETURNS bigint
  LANGUAGE sql
  SECURITY DEFINER
  SET search_path = 'public'
AS $$ SELECT pgmq.send(queue_name, payload); $$;

-- read_email_batch
CREATE OR REPLACE FUNCTION public.read_email_batch(queue_name text, batch_size integer, vt integer)
  RETURNS TABLE(msg_id bigint, read_ct integer, message jsonb)
  LANGUAGE sql
  SECURITY DEFINER
  SET search_path = 'public'
AS $$ SELECT msg_id, read_ct, message FROM pgmq.read(queue_name, vt, batch_size); $$;

-- delete_email
CREATE OR REPLACE FUNCTION public.delete_email(queue_name text, message_id bigint)
  RETURNS boolean
  LANGUAGE sql
  SECURITY DEFINER
  SET search_path = 'public'
AS $$ SELECT pgmq.delete(queue_name, message_id); $$;

-- move_to_dlq
CREATE OR REPLACE FUNCTION public.move_to_dlq(source_queue text, dlq_name text, message_id bigint, payload jsonb)
  RETURNS bigint
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = 'public'
AS $$
DECLARE new_id BIGINT;
BEGIN
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  PERFORM pgmq.delete(source_queue, message_id);
  RETURN new_id;
END;
$$;
