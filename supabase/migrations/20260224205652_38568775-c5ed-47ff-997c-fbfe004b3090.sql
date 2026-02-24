
-- Cycle entries: logs period days with flow level and symptoms
CREATE TABLE public.cycle_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL,
  is_period BOOLEAN NOT NULL DEFAULT true,
  flow_level TEXT CHECK (flow_level IN ('light', 'medium', 'heavy')),
  symptoms TEXT[] DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

ALTER TABLE public.cycle_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own cycle entries"
  ON public.cycle_entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own cycle entries"
  ON public.cycle_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cycle entries"
  ON public.cycle_entries FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own cycle entries"
  ON public.cycle_entries FOR DELETE
  USING (auth.uid() = user_id);

-- Cycle settings per user
CREATE TABLE public.cycle_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  cycle_length_days INTEGER NOT NULL DEFAULT 28,
  period_length_days INTEGER NOT NULL DEFAULT 5,
  prediction_enabled BOOLEAN NOT NULL DEFAULT true,
  reminder_enabled BOOLEAN NOT NULL DEFAULT false,
  reminder_time TEXT NOT NULL DEFAULT 'morning',
  hide_cycle_markers BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.cycle_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own cycle settings"
  ON public.cycle_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own cycle settings"
  ON public.cycle_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cycle settings"
  ON public.cycle_settings FOR UPDATE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_cycle_entries_updated_at
  BEFORE UPDATE ON public.cycle_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cycle_settings_updated_at
  BEFORE UPDATE ON public.cycle_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
