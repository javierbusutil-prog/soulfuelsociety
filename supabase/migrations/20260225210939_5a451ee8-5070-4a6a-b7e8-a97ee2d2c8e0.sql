
-- Workout sections (warmup/main) linked to existing workouts table
CREATE TABLE public.workout_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id uuid NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
  section_type text NOT NULL DEFAULT 'main' CHECK (section_type IN ('warmup', 'main')),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Exercise templates within sections
CREATE TABLE public.exercise_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid NOT NULL REFERENCES public.workout_sections(id) ON DELETE CASCADE,
  name text NOT NULL,
  notes text,
  tracking_type text NOT NULL DEFAULT 'sets_reps' CHECK (tracking_type IN ('sets_reps', 'time', 'total_reps')),
  default_sets integer DEFAULT 3,
  default_reps text DEFAULT '10',
  default_rest text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Workout logs (user completions)
CREATE TABLE public.workout_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  workout_id uuid NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Exercise logs within a workout log
CREATE TABLE public.exercise_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_log_id uuid NOT NULL REFERENCES public.workout_logs(id) ON DELETE CASCADE,
  exercise_template_id uuid REFERENCES public.exercise_templates(id) ON DELETE SET NULL,
  exercise_name text NOT NULL,
  tracking_type text NOT NULL DEFAULT 'sets_reps',
  completed boolean NOT NULL DEFAULT false,
  time_result text,
  total_reps_result integer,
  notes text,
  section_type text NOT NULL DEFAULT 'main',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Set logs within an exercise log
CREATE TABLE public.set_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_log_id uuid NOT NULL REFERENCES public.exercise_logs(id) ON DELETE CASCADE,
  set_number integer NOT NULL DEFAULT 1,
  target_reps text,
  completed_reps integer,
  weight numeric,
  completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS for workout_sections (admins manage, anyone can view)
ALTER TABLE public.workout_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage workout sections" ON public.workout_sections FOR ALL USING (is_admin_or_pt(auth.uid()));
CREATE POLICY "Anyone can view workout sections" ON public.workout_sections FOR SELECT USING (true);

-- RLS for exercise_templates (admins manage, anyone can view)
ALTER TABLE public.exercise_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage exercise templates" ON public.exercise_templates FOR ALL USING (is_admin_or_pt(auth.uid()));
CREATE POLICY "Anyone can view exercise templates" ON public.exercise_templates FOR SELECT USING (true);

-- RLS for workout_logs (users manage own)
ALTER TABLE public.workout_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can create own workout logs" ON public.workout_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own workout logs" ON public.workout_logs FOR SELECT USING (auth.uid() = user_id OR is_admin_or_pt(auth.uid()));
CREATE POLICY "Users can update own workout logs" ON public.workout_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own workout logs" ON public.workout_logs FOR DELETE USING (auth.uid() = user_id);

-- RLS for exercise_logs (via workout_log ownership)
ALTER TABLE public.exercise_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own exercise logs" ON public.exercise_logs FOR ALL USING (
  EXISTS (SELECT 1 FROM public.workout_logs wl WHERE wl.id = exercise_logs.workout_log_id AND (wl.user_id = auth.uid() OR is_admin_or_pt(auth.uid())))
);

-- RLS for set_logs (via exercise_log -> workout_log ownership)
ALTER TABLE public.set_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own set logs" ON public.set_logs FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.exercise_logs el
    JOIN public.workout_logs wl ON wl.id = el.workout_log_id
    WHERE el.id = set_logs.exercise_log_id AND (wl.user_id = auth.uid() OR is_admin_or_pt(auth.uid()))
  )
);

-- Indexes
CREATE INDEX idx_workout_sections_workout ON public.workout_sections(workout_id);
CREATE INDEX idx_exercise_templates_section ON public.exercise_templates(section_id);
CREATE INDEX idx_workout_logs_user ON public.workout_logs(user_id);
CREATE INDEX idx_workout_logs_workout ON public.workout_logs(workout_id);
CREATE INDEX idx_exercise_logs_workout_log ON public.exercise_logs(workout_log_id);
CREATE INDEX idx_set_logs_exercise_log ON public.set_logs(exercise_log_id);
