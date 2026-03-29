
-- Add onboarding flag to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS has_completed_onboarding boolean NOT NULL DEFAULT false;

-- Create member_profiles table for onboarding data
CREATE TABLE public.member_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  fitness_level text NOT NULL DEFAULT 'beginner',
  primary_goal text NOT NULL DEFAULT 'general_fitness',
  training_days_per_week integer NOT NULL DEFAULT 3,
  injuries_limitations text,
  preferred_days text[],
  preferred_time text,
  gym_location text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.member_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create own member profile"
  ON public.member_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own member profile"
  ON public.member_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own member profile"
  ON public.member_profiles FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin_or_pt(auth.uid()));
