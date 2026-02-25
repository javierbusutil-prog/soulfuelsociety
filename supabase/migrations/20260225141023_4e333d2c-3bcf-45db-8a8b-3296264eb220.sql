
-- Meal logs: simple component-based tracking per meal
CREATE TABLE public.meal_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  meal_label TEXT NOT NULL DEFAULT 'Meal', -- e.g. Breakfast, Lunch, Dinner, Snack
  has_protein BOOLEAN NOT NULL DEFAULT false,
  has_fiber BOOLEAN NOT NULL DEFAULT false,
  has_healthy_fats BOOLEAN NOT NULL DEFAULT false,
  has_carbs BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.meal_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own meal logs" ON public.meal_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own meal logs" ON public.meal_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own meal logs" ON public.meal_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own meal logs" ON public.meal_logs FOR DELETE USING (auth.uid() = user_id);

-- Weekly reflections
CREATE TABLE public.weekly_reflections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  week_start DATE NOT NULL,
  protein_consistency INTEGER NOT NULL DEFAULT 3 CHECK (protein_consistency BETWEEN 1 AND 5),
  energy_rating INTEGER NOT NULL DEFAULT 3 CHECK (energy_rating BETWEEN 1 AND 5),
  cravings_intensity INTEGER NOT NULL DEFAULT 3 CHECK (cravings_intensity BETWEEN 1 AND 5),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, week_start)
);

ALTER TABLE public.weekly_reflections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reflections" ON public.weekly_reflections FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own reflections" ON public.weekly_reflections FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own reflections" ON public.weekly_reflections FOR UPDATE USING (auth.uid() = user_id);
