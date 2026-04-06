
-- ============================================================================
-- MAILERLITE SYNC: Helper function + Triggers
-- Uses net.http_post (same pattern as handle_new_user)
-- ============================================================================

-- Helper: call mailerlite-webhook-handler edge function via pg_net
CREATE OR REPLACE FUNCTION public.notify_mailerlite(event_type TEXT, payload JSONB)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _service_key TEXT;
  _supabase_url TEXT := 'https://kzbmthhtbeddcjrucuex.supabase.co';
BEGIN
  SELECT decrypted_secret INTO _service_key
  FROM vault.decrypted_secrets
  WHERE name = 'email_queue_service_role_key'
  LIMIT 1;

  IF _service_key IS NULL THEN
    RAISE LOG '[notify_mailerlite] vault secret not found — skipped';
    RETURN;
  END IF;

  PERFORM net.http_post(
    url     := _supabase_url || '/functions/v1/mailerlite-webhook-handler',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || _service_key
    ),
    body    := jsonb_build_object('event', event_type) || payload
  );

EXCEPTION WHEN OTHERS THEN
  RAISE LOG '[notify_mailerlite] failed for event %: %', event_type, SQLERRM;
END;
$$;

-- ============================================================================
-- TRIGGER 1: New profile → sync to MailerLite "registrados" group
-- ============================================================================

CREATE OR REPLACE FUNCTION public.trigger_mailerlite_profile_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _email TEXT;
BEGIN
  -- Get email from auth.users
  SELECT email INTO _email FROM auth.users WHERE id = NEW.user_id;

  IF _email IS NOT NULL THEN
    PERFORM notify_mailerlite(
      'user.created',
      jsonb_build_object(
        'email', _email,
        'full_name', COALESCE(NEW.display_name, ''),
        'id', NEW.user_id::text,
        'locale', COALESCE(NEW.language, 'es')
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_created_mailerlite ON profiles;
CREATE TRIGGER on_profile_created_mailerlite
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION trigger_mailerlite_profile_created();

-- ============================================================================
-- TRIGGER 2: KYC status changes to 'verified'
-- ============================================================================

CREATE OR REPLACE FUNCTION public.trigger_mailerlite_kyc_verified()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _email TEXT;
BEGIN
  IF NEW.kyc_status = 'verified' AND (OLD.kyc_status IS DISTINCT FROM 'verified') THEN
    SELECT email INTO _email FROM auth.users WHERE id = NEW.user_id;

    IF _email IS NOT NULL THEN
      PERFORM notify_mailerlite(
        'activity.updated',
        jsonb_build_object(
          'email', _email,
          'updates', jsonb_build_object('kyc_verified', true)
        )
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_kyc_verified_mailerlite ON profiles;
CREATE TRIGGER on_kyc_verified_mailerlite
  AFTER UPDATE OF kyc_status ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION trigger_mailerlite_kyc_verified();

-- ============================================================================
-- TRIGGER 3: New work registered → update works_registered count
-- ============================================================================

CREATE OR REPLACE FUNCTION public.trigger_mailerlite_work_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _email TEXT;
  _works_count INT;
BEGIN
  SELECT email INTO _email FROM auth.users WHERE id = NEW.user_id;

  IF _email IS NOT NULL THEN
    SELECT COUNT(*) INTO _works_count FROM works WHERE user_id = NEW.user_id;

    PERFORM notify_mailerlite(
      'activity.updated',
      jsonb_build_object(
        'email', _email,
        'updates', jsonb_build_object(
          'works_registered', _works_count,
          'last_activity_date', CURRENT_DATE
        )
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_work_created_mailerlite ON works;
CREATE TRIGGER on_work_created_mailerlite
  AFTER INSERT ON works
  FOR EACH ROW
  EXECUTE FUNCTION trigger_mailerlite_work_created();

-- ============================================================================
-- TRIGGER 4: Credit transaction → update credits_balance
-- ============================================================================

CREATE OR REPLACE FUNCTION public.trigger_mailerlite_credits_updated()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _email TEXT;
  _balance INT;
BEGIN
  SELECT email INTO _email FROM auth.users WHERE id = NEW.user_id;

  IF _email IS NOT NULL THEN
    SELECT available_credits INTO _balance FROM profiles WHERE user_id = NEW.user_id;

    PERFORM notify_mailerlite(
      'activity.updated',
      jsonb_build_object(
        'email', _email,
        'updates', jsonb_build_object(
          'credits_balance', COALESCE(_balance, 0),
          'last_activity_date', CURRENT_DATE
        )
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_credits_transaction_mailerlite ON credit_transactions;
CREATE TRIGGER on_credits_transaction_mailerlite
  AFTER INSERT ON credit_transactions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_mailerlite_credits_updated();
