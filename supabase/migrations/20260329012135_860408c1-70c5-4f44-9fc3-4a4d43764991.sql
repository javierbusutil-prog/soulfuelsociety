ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS selected_plan text,
  ADD COLUMN IF NOT EXISTS session_count integer,
  ADD COLUMN IF NOT EXISTS group_size text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text;