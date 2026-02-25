
-- Add flag to distinguish superset sets from main exercise sets
ALTER TABLE public.set_logs ADD COLUMN is_superset_set boolean NOT NULL DEFAULT false;
