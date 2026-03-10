
-- 1. Update handle_new_user to grant 1 onboarding credit and log it
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, available_credits)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email), 1);

  INSERT INTO public.credit_transactions (user_id, amount, type, description)
  VALUES (NEW.id, 1, 'onboarding', 'Crédito de bienvenida');

  RETURN NEW;
END;
$$;

-- 2. Recreate the trigger (drop + create to ensure it uses the new function)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Remove user INSERT policy on credit_transactions (security fix)
-- Only service_role should insert transactions
DROP POLICY IF EXISTS "Users can insert own transactions" ON public.credit_transactions;

-- 4. Add service_role INSERT policy
CREATE POLICY "Service role can insert transactions"
ON public.credit_transactions
FOR INSERT
TO service_role
WITH CHECK (true);
