
-- Add full superset config columns to exercise_templates
ALTER TABLE public.exercise_templates
  ADD COLUMN superset_tracking_type text DEFAULT 'sets_reps',
  ADD COLUMN superset_default_sets integer DEFAULT 3,
  ADD COLUMN superset_default_reps text DEFAULT '10',
  ADD COLUMN superset_default_rest text DEFAULT NULL;

-- Add superset tracking columns to exercise_logs
ALTER TABLE public.exercise_logs
  ADD COLUMN superset_tracking_type text DEFAULT NULL,
  ADD COLUMN superset_completed boolean DEFAULT false,
  ADD COLUMN superset_time_result text DEFAULT NULL,
  ADD COLUMN superset_total_reps_result integer DEFAULT NULL;
