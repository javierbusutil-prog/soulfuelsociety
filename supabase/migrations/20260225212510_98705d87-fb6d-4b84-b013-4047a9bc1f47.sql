
-- Add superset support: a second movement name for superset exercises
ALTER TABLE public.exercise_templates ADD COLUMN superset_movement_name text DEFAULT NULL;
ALTER TABLE public.exercise_logs ADD COLUMN superset_movement_name text DEFAULT NULL;
