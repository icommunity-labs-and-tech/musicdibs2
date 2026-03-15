-- Update handle_new_user to send welcome email via pg_net (fire and forget).
-- Uses vault secrets for service_role_key and constructs the URL from SUPABASE_URL.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _display_name TEXT;
  _supabase_url TEXT;
  _service_key  TEXT;
BEGIN
  -- Compute display_name
  _display_name := COALESCE(
    NEW.raw_user_meta_data->>'display_name',
    NEW.email
  );

  -- 1. Create profile with welcome credit
  INSERT INTO public.profiles (user_id, display_name, available_credits)
  VALUES (NEW.id, _display_name, 1)
  ON CONFLICT (user_id) DO NOTHING;

  -- 2. Record welcome credit transaction
  INSERT INTO public.credit_transactions (user_id, amount, type, description)
  VALUES (NEW.id, 1, 'onboarding', 'Crédito de bienvenida');

  -- 3. Send welcome email via pg_net (fire and forget)
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
          'displayName', _display_name
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
$$;