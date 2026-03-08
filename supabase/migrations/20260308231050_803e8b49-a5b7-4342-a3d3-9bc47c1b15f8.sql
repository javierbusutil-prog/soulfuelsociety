ALTER TABLE public.daily_nutrition 
  ADD COLUMN IF NOT EXISTS protein_goal_checked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hydration_goal_checked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS fast_checked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cycle_checked boolean NOT NULL DEFAULT false;