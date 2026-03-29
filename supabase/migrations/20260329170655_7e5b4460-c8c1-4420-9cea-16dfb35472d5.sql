
-- Add waiver_accepted to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS waiver_accepted boolean NOT NULL DEFAULT false;

-- Create waiver_acceptances table
CREATE TABLE public.waiver_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  waiver_version text NOT NULL DEFAULT 'March 2026',
  ip_address text,
  user_agent text
);

ALTER TABLE public.waiver_acceptances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own waiver acceptance"
  ON public.waiver_acceptances FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own waiver acceptance"
  ON public.waiver_acceptances FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR is_admin_or_pt(auth.uid()));

-- Create storage bucket for legal documents
INSERT INTO storage.buckets (id, name, public) VALUES ('legal-documents', 'legal-documents', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can read legal documents"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'legal-documents');
