
-- Restrict profile UPDATE: users can only change display_name and phone
-- Credits, subscription_plan, and kyc_status are protected from client-side manipulation
DROP POLICY "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (
  user_id = auth.uid()
  AND available_credits = (SELECT p.available_credits FROM public.profiles p WHERE p.user_id = auth.uid())
  AND subscription_plan = (SELECT p.subscription_plan FROM public.profiles p WHERE p.user_id = auth.uid())
  AND kyc_status = (SELECT p.kyc_status FROM public.profiles p WHERE p.user_id = auth.uid())
);
