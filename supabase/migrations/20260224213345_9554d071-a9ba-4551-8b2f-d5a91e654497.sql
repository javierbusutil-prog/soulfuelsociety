
-- Create waitlist table (public signup, no auth required)
CREATE TABLE public.waitlist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT waitlist_email_unique UNIQUE (email)
);

-- Enable RLS
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (public form, no login needed)
CREATE POLICY "Anyone can join the waitlist"
  ON public.waitlist
  FOR INSERT
  WITH CHECK (true);

-- Only admins can view waitlist entries
CREATE POLICY "Admins can view waitlist"
  ON public.waitlist
  FOR SELECT
  USING (is_admin_or_pt(auth.uid()));

-- Only admins can delete waitlist entries
CREATE POLICY "Admins can delete waitlist entries"
  ON public.waitlist
  FOR DELETE
  USING (is_admin_or_pt(auth.uid()));
