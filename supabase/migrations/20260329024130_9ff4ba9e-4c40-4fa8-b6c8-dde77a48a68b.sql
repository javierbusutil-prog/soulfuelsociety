
-- Create coaches table for admin-manageable coach profiles
CREATE TABLE public.coaches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  initials text NOT NULL,
  title text NOT NULL,
  years_experience text NOT NULL DEFAULT '10+',
  bio text NOT NULL,
  specialties text[] NOT NULL DEFAULT '{}',
  credentials text[] NOT NULL DEFAULT '{}',
  photo_url text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.coaches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view coaches" ON public.coaches
  FOR SELECT TO public USING (true);

CREATE POLICY "Admins can manage coaches" ON public.coaches
  FOR ALL TO public USING (is_admin_or_pt(auth.uid()));

-- Create storage bucket for coach photos
INSERT INTO storage.buckets (id, name, public) VALUES ('coach-photos', 'coach-photos', true);

CREATE POLICY "Anyone can view coach photos" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'coach-photos');

CREATE POLICY "Admins can upload coach photos" ON storage.objects
  FOR INSERT TO public WITH CHECK (bucket_id = 'coach-photos' AND is_admin_or_pt(auth.uid()));

CREATE POLICY "Admins can update coach photos" ON storage.objects
  FOR UPDATE TO public USING (bucket_id = 'coach-photos' AND is_admin_or_pt(auth.uid()));

CREATE POLICY "Admins can delete coach photos" ON storage.objects
  FOR DELETE TO public USING (bucket_id = 'coach-photos' AND is_admin_or_pt(auth.uid()));
