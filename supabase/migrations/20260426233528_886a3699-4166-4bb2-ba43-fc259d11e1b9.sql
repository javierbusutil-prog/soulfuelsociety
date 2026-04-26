-- Create client_invitations table
CREATE TABLE public.client_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  full_name text NOT NULL,
  invited_by uuid NOT NULL,
  note text,
  token text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending',
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for common lookups
CREATE INDEX idx_client_invitations_email ON public.client_invitations (lower(email));
CREATE INDEX idx_client_invitations_status ON public.client_invitations (status);

-- Enable RLS
ALTER TABLE public.client_invitations ENABLE ROW LEVEL SECURITY;

-- RLS: only admins/coaches can manage
CREATE POLICY "Admins can view client invitations"
ON public.client_invitations
FOR SELECT
TO authenticated
USING (public.is_admin_or_pt(auth.uid()));

CREATE POLICY "Admins can insert client invitations"
ON public.client_invitations
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin_or_pt(auth.uid()) AND auth.uid() = invited_by);

CREATE POLICY "Admins can update client invitations"
ON public.client_invitations
FOR UPDATE
TO authenticated
USING (public.is_admin_or_pt(auth.uid()));

CREATE POLICY "Admins can delete client invitations"
ON public.client_invitations
FOR DELETE
TO authenticated
USING (public.is_admin_or_pt(auth.uid()));

-- Trigger function: when a user signs up, mark matching pending invitations as accepted
CREATE OR REPLACE FUNCTION public.accept_client_invitation_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.client_invitations
  SET status = 'accepted',
      accepted_at = now()
  WHERE lower(email) = lower(NEW.email)
    AND status = 'pending';
  RETURN NEW;
END;
$$;

-- Attach trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created_accept_invitation ON auth.users;
CREATE TRIGGER on_auth_user_created_accept_invitation
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.accept_client_invitation_on_signup();