
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email_unsubscribed boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.broadcast_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject text NOT NULL,
  body text NOT NULL,
  audience text NOT NULL,
  recipient_ids uuid[],
  recipient_count integer NOT NULL,
  sent_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  sent_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.broadcast_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view broadcast emails"
  ON public.broadcast_emails FOR SELECT TO authenticated
  USING (public.is_admin_or_pt(auth.uid()));

CREATE POLICY "Admins can insert broadcast emails"
  ON public.broadcast_emails FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_pt(auth.uid()) AND auth.uid() = sent_by);

CREATE POLICY "Admins can update broadcast emails"
  ON public.broadcast_emails FOR UPDATE TO authenticated
  USING (public.is_admin_or_pt(auth.uid()));

CREATE POLICY "Admins can delete broadcast emails"
  ON public.broadcast_emails FOR DELETE TO authenticated
  USING (public.is_admin_or_pt(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_broadcast_emails_sent_at ON public.broadcast_emails(sent_at DESC);
