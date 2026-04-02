
ALTER TABLE public.cash_payments ADD COLUMN IF NOT EXISTS expires_at timestamptz;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS membership_expires_at timestamptz;
