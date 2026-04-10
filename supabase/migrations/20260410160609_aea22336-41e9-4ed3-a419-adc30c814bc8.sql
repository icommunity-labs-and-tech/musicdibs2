-- Función para incrementar descargas gratuitas usadas
CREATE OR REPLACE FUNCTION public.increment_free_downloads(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET free_downloads_used = COALESCE(free_downloads_used, 0) + 1
  WHERE user_id = p_user_id;
END;
$$;

-- Actualizar last_active_at cuando el usuario usa un crédito
CREATE OR REPLACE FUNCTION public.update_last_active_on_credit_use()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.amount < 0 THEN
    UPDATE public.profiles
    SET last_active_at = now()
    WHERE user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_last_active ON public.credit_transactions;
CREATE TRIGGER trg_update_last_active
  AFTER INSERT ON public.credit_transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_last_active_on_credit_use();

-- Resetear descargas gratuitas cuando el usuario reactiva
CREATE OR REPLACE FUNCTION public.reset_free_downloads_on_reactivation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.subscription_plan IN ('Annual', 'Monthly') 
     AND OLD.subscription_plan NOT IN ('Annual', 'Monthly') THEN
    NEW.free_downloads_used := 0;
    NEW.library_status := 'active';
    NEW.library_status_since := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reset_library_on_reactivation ON public.profiles;
CREATE TRIGGER trg_reset_library_on_reactivation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.reset_free_downloads_on_reactivation();