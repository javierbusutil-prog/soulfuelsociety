
-- Add intake_submitted to profiles
ALTER TABLE public.profiles ADD COLUMN intake_submitted boolean NOT NULL DEFAULT false;

-- Create intake_forms table
CREATE TABLE public.intake_forms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  responses JSONB NOT NULL DEFAULT '{}',
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.intake_forms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own intake form"
ON public.intake_forms FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own intake form"
ON public.intake_forms FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all intake forms"
ON public.intake_forms FOR SELECT
TO authenticated
USING (public.is_admin_or_pt(auth.uid()));
