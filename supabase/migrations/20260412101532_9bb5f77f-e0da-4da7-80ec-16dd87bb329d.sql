-- Allow NULL user_id on tables that need anonymization for GDPR account deletion

ALTER TABLE public.works ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.orders ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.purchase_evidences ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.purchase_usage_evidences ALTER COLUMN user_id DROP NOT NULL;