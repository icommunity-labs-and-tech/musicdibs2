-- Añade stripe_customer_id a profiles para evitar listUsers() en stripe-webhook
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT DEFAULT NULL;

-- Índice para lookup directo por customer_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id
  ON public.profiles (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;