
CREATE TABLE public.group_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL,
  created_by uuid NOT NULL,
  invite_token text NOT NULL UNIQUE,
  invitee_email text,
  status text NOT NULL DEFAULT 'pending',
  plan_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_by uuid
);

ALTER TABLE public.group_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creators can view own group invites"
  ON public.group_invites FOR SELECT
  USING (auth.uid() = created_by OR auth.uid() = accepted_by OR public.is_admin_or_pt(auth.uid()));

CREATE POLICY "Authenticated users can create invites"
  ON public.group_invites FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creators can update own invites"
  ON public.group_invites FOR UPDATE
  USING (auth.uid() = created_by OR public.is_admin_or_pt(auth.uid()));

CREATE POLICY "Anyone can view invite by token"
  ON public.group_invites FOR SELECT
  USING (true);
