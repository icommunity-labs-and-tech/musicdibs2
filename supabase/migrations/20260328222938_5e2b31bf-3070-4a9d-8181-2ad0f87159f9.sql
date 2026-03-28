
DROP POLICY "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (
  (user_id = auth.uid())
  AND (available_credits = (SELECT p.available_credits FROM profiles p WHERE p.user_id = auth.uid()))
  AND (subscription_plan = (SELECT p.subscription_plan FROM profiles p WHERE p.user_id = auth.uid()))
  AND (kyc_status = (SELECT p.kyc_status FROM profiles p WHERE p.user_id = auth.uid()))
  AND (is_blocked IS NOT DISTINCT FROM (SELECT p.is_blocked FROM profiles p WHERE p.user_id = auth.uid()))
  AND (stripe_customer_id IS NOT DISTINCT FROM (SELECT p.stripe_customer_id FROM profiles p WHERE p.user_id = auth.uid()))
  AND (ibs_signature_id IS NOT DISTINCT FROM (SELECT p.ibs_signature_id FROM profiles p WHERE p.user_id = auth.uid()))
);
