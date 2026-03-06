
-- Weekly plan days: one row per day per week, admin-managed
CREATE TABLE public.weekly_plan_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start date NOT NULL,
  day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  title text NOT NULL DEFAULT 'Rest Day',
  exercises jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (week_start, day_of_week)
);

-- RLS
ALTER TABLE public.weekly_plan_days ENABLE ROW LEVEL SECURITY;

-- Everyone can view
CREATE POLICY "Anyone can view weekly plan days"
  ON public.weekly_plan_days FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can manage
CREATE POLICY "Admins can manage weekly plan days"
  ON public.weekly_plan_days FOR ALL
  TO authenticated
  USING (public.is_admin_or_pt(auth.uid()))
  WITH CHECK (public.is_admin_or_pt(auth.uid()));

-- Auto-update updated_at
CREATE TRIGGER update_weekly_plan_days_updated_at
  BEFORE UPDATE ON public.weekly_plan_days
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
