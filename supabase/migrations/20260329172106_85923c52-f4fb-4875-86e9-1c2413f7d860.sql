
-- Add nutrition_disclaimer_accepted to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS nutrition_disclaimer_accepted boolean NOT NULL DEFAULT false;

-- Create disclaimer_acceptances table
CREATE TABLE IF NOT EXISTS public.disclaimer_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  disclaimer_type text NOT NULL,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  user_agent text
);

ALTER TABLE public.disclaimer_acceptances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own disclaimer acceptance"
  ON public.disclaimer_acceptances FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own disclaimer acceptance"
  ON public.disclaimer_acceptances FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR is_admin_or_pt(auth.uid()));
