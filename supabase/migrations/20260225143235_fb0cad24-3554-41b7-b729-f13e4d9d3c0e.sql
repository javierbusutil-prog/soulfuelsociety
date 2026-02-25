
-- Add ring_habits JSONB column to user_settings to store personalized daily ring habits
-- Default: workout, protein, hydration ON; fasting, cycle_logging, whole_foods OFF
ALTER TABLE public.user_settings
ADD COLUMN ring_habits JSONB NOT NULL DEFAULT '{"workout": true, "protein": true, "hydration": true, "fasting": false, "cycle_logging": false, "whole_foods": false}'::jsonb;
