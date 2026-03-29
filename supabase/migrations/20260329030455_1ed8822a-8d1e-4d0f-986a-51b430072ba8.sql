
CREATE TABLE public.coaching_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  coach_id uuid NOT NULL,
  version integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  program_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.coaching_programs ENABLE ROW LEVEL SECURITY;

-- Coaches can do everything
CREATE POLICY "Coaches can manage coaching programs"
  ON public.coaching_programs FOR ALL
  TO authenticated
  USING (public.is_admin_or_pt(auth.uid()));

-- Members can view their own active programs
CREATE POLICY "Members can view own programs"
  ON public.coaching_programs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
