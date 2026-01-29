-- Create schedule mode enum
CREATE TYPE public.schedule_mode AS ENUM ('admin_selected', 'user_selected');

-- Create workout_programs table
CREATE TABLE public.workout_programs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  weeks INTEGER NOT NULL DEFAULT 4,
  frequency_per_week INTEGER NOT NULL DEFAULT 3,
  schedule_mode schedule_mode NOT NULL DEFAULT 'admin_selected',
  admin_days_of_week INTEGER[] DEFAULT NULL, -- 0=Sunday, 1=Monday, etc.
  published BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create workout_session_templates table
CREATE TABLE public.workout_session_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  program_id UUID NOT NULL REFERENCES public.workout_programs(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL,
  session_index INTEGER NOT NULL,
  title TEXT NOT NULL,
  content_json JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(program_id, week_number, session_index)
);

-- Create user_program_enrollments table
CREATE TABLE public.user_program_enrollments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  program_id UUID NOT NULL REFERENCES public.workout_programs(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  selected_days_of_week INTEGER[] DEFAULT NULL, -- For user_selected mode
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, program_id)
);

-- Create calendar_events table for workout program events
CREATE TABLE public.calendar_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_date DATE NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'workout',
  title TEXT NOT NULL,
  description TEXT,
  linked_program_id UUID REFERENCES public.workout_programs(id) ON DELETE CASCADE,
  linked_session_id UUID REFERENCES public.workout_session_templates(id) ON DELETE SET NULL,
  enrollment_id UUID REFERENCES public.user_program_enrollments(id) ON DELETE CASCADE,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  reminder_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_settings table for reminder preferences
CREATE TABLE public.user_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  reminders_enabled BOOLEAN NOT NULL DEFAULT true,
  reminder_time TEXT NOT NULL DEFAULT 'morning', -- morning, afternoon, evening
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.workout_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_session_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_program_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for workout_programs
CREATE POLICY "Anyone can view published programs" ON public.workout_programs
  FOR SELECT USING (published = true OR is_admin_or_pt(auth.uid()));

CREATE POLICY "Admins can manage programs" ON public.workout_programs
  FOR ALL USING (is_admin_or_pt(auth.uid()));

-- RLS Policies for workout_session_templates
CREATE POLICY "Anyone can view templates of published programs" ON public.workout_session_templates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.workout_programs p
      WHERE p.id = workout_session_templates.program_id
      AND (p.published = true OR is_admin_or_pt(auth.uid()))
    )
  );

CREATE POLICY "Admins can manage session templates" ON public.workout_session_templates
  FOR ALL USING (is_admin_or_pt(auth.uid()));

-- RLS Policies for user_program_enrollments
CREATE POLICY "Users can view own enrollments" ON public.user_program_enrollments
  FOR SELECT USING (auth.uid() = user_id OR is_admin_or_pt(auth.uid()));

CREATE POLICY "Users can create own enrollments" ON public.user_program_enrollments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own enrollments" ON public.user_program_enrollments
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for calendar_events
CREATE POLICY "Users can view own calendar events" ON public.calendar_events
  FOR SELECT USING (auth.uid() = user_id OR is_admin_or_pt(auth.uid()));

CREATE POLICY "Users can create own calendar events" ON public.calendar_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own calendar events" ON public.calendar_events
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own calendar events" ON public.calendar_events
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for user_settings
CREATE POLICY "Users can view own settings" ON public.user_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own settings" ON public.user_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings" ON public.user_settings
  FOR UPDATE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_session_templates_program ON public.workout_session_templates(program_id);
CREATE INDEX idx_enrollments_user ON public.user_program_enrollments(user_id);
CREATE INDEX idx_enrollments_program ON public.user_program_enrollments(program_id);
CREATE INDEX idx_calendar_events_user_date ON public.calendar_events(user_id, event_date);
CREATE INDEX idx_calendar_events_enrollment ON public.calendar_events(enrollment_id);

-- Trigger for updated_at on workout_programs
CREATE TRIGGER update_workout_programs_updated_at
  BEFORE UPDATE ON public.workout_programs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for updated_at on user_settings
CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();