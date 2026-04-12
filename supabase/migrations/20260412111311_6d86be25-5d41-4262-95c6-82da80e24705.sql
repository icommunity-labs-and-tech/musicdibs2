ALTER TABLE public.cancellation_surveys
ADD COLUMN IF NOT EXISTS additional_feedback text,
ADD COLUMN IF NOT EXISTS is_account_deletion boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS account_deleted_at timestamptz;