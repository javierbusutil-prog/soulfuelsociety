
-- Table to store user macro calculator targets
CREATE TABLE public.macro_targets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  calorie_target INTEGER NOT NULL,
  protein_target_g INTEGER NOT NULL,
  carb_target_g INTEGER NOT NULL,
  fat_target_g INTEGER NOT NULL,
  fiber_target_g INTEGER NOT NULL DEFAULT 28,
  water_target_oz INTEGER NOT NULL DEFAULT 75,
  goal TEXT NOT NULL DEFAULT 'maintain',
  activity_level TEXT NOT NULL DEFAULT 'moderate',
  method_used TEXT NOT NULL DEFAULT 'simple',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Each user has one active target row (upsert pattern)
CREATE UNIQUE INDEX idx_macro_targets_user ON public.macro_targets (user_id);

-- Enable RLS
ALTER TABLE public.macro_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own macro targets"
  ON public.macro_targets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own macro targets"
  ON public.macro_targets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own macro targets"
  ON public.macro_targets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own macro targets"
  ON public.macro_targets FOR DELETE
  USING (auth.uid() = user_id);

-- Auto-update timestamp
CREATE TRIGGER update_macro_targets_updated_at
  BEFORE UPDATE ON public.macro_targets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
