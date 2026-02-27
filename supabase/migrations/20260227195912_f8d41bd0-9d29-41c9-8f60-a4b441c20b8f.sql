-- Table for invited/approved test user emails
CREATE TABLE public.invited_emails (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL UNIQUE,
  invited_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.invited_emails ENABLE ROW LEVEL SECURITY;

-- Only admins can manage invites
CREATE POLICY "Admins can manage invited emails"
ON public.invited_emails FOR ALL
USING (is_admin_or_pt(auth.uid()));

-- Anyone can check if their email is invited (needed at signup)
CREATE POLICY "Anyone can check invite status"
ON public.invited_emails FOR SELECT
USING (true);