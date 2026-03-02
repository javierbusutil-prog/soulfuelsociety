
-- Add cycle adjustment columns to macro_targets
ALTER TABLE public.macro_targets
  ADD COLUMN cycle_adjustment_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN current_cycle_phase TEXT NOT NULL DEFAULT 'follicular',
  ADD COLUMN cycle_adjustment_percentage NUMERIC NOT NULL DEFAULT 0;
