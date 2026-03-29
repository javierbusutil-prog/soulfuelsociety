
-- Add waiver_version column to profiles for version checking
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS waiver_version text DEFAULT NULL;
