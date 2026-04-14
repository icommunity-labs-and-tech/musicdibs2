
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _display_name TEXT;
  _language TEXT;
  _supabase_url TEXT;
  _service_key  TEXT;
BEGIN
  _display_name := COALESCE(
    NEW.raw_user_meta_data->>'display_name',
    NEW.email
  );

  _language := COALESCE(
    NEW.raw_user_meta_data->>'language',
    'es'
  );

  INSERT INTO public.profiles (user_id, display_name, available_credits, language)
  VALUES (NEW.id, _display_name, 0, _language)
  ON CONFLICT (user_id) DO NOTHING;

  BEGIN
    SELECT decrypted_secret INTO _service_key
    FROM vault.decrypted_secrets
    WHERE name = 'email_queue_service_role_key'
    LIMIT 1;

    _supabase_url := 'https://kzbmthhtbeddcjrucuex.supabase.co';

    IF _service_key IS NOT NULL THEN
      PERFORM net.http_post(
        url     := _supabase_url || '/functions/v1/send-welcome-email',
        headers := jsonb_build_object(
          'Content-Type',  'application/json',
          'Authorization', 'Bearer ' || _service_key
        ),
        body    := jsonb_build_object(
          'userId',      NEW.id::text,
          'email',       NEW.email,
          'displayName', _display_name,
          'language',    _language
        )
      );
    ELSE
      RAISE LOG '[handle_new_user] vault secret not found — welcome email skipped for %', NEW.id;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG '[handle_new_user] welcome email failed for %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$function$;
