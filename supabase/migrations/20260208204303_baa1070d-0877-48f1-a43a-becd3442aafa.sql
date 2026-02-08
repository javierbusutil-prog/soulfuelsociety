-- Create fast_sessions table
CREATE TABLE public.fast_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  start_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  end_at TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'deleted')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.fast_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own fast sessions"
ON public.fast_sessions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own fast sessions"
ON public.fast_sessions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own fast sessions"
ON public.fast_sessions
FOR UPDATE
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_fast_sessions_updated_at
BEFORE UPDATE ON public.fast_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_fast_sessions_user_status ON public.fast_sessions(user_id, status);
CREATE INDEX idx_fast_sessions_end_at ON public.fast_sessions(end_at);