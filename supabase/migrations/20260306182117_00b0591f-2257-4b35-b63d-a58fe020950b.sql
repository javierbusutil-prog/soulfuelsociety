
CREATE TABLE public.weekly_plan_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  plan_day_id UUID REFERENCES public.weekly_plan_days(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  day_of_week INTEGER NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  exercise_data JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.weekly_plan_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create own weekly plan logs"
  ON public.weekly_plan_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own weekly plan logs"
  ON public.weekly_plan_logs FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin_or_pt(auth.uid()));

CREATE POLICY "Users can update own weekly plan logs"
  ON public.weekly_plan_logs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own weekly plan logs"
  ON public.weekly_plan_logs FOR DELETE
  USING (auth.uid() = user_id);
