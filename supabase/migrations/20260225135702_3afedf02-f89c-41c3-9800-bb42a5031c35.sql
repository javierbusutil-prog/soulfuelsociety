
-- Daily nutrition tracking table
CREATE TABLE public.daily_nutrition (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  protein_goal INTEGER NOT NULL DEFAULT 120,
  protein_logged INTEGER NOT NULL DEFAULT 0,
  hydration_goal INTEGER NOT NULL DEFAULT 64,
  hydration_logged INTEGER NOT NULL DEFAULT 0,
  electrolyte_taken BOOLEAN NOT NULL DEFAULT false,
  protein_priority BOOLEAN NOT NULL DEFAULT false,
  whole_foods_focus BOOLEAN NOT NULL DEFAULT false,
  energy_level INTEGER DEFAULT NULL,
  mood_level INTEGER DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

ALTER TABLE public.daily_nutrition ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own nutrition" ON public.daily_nutrition
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own nutrition" ON public.daily_nutrition
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own nutrition" ON public.daily_nutrition
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own nutrition" ON public.daily_nutrition
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_daily_nutrition_updated_at
  BEFORE UPDATE ON public.daily_nutrition
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
