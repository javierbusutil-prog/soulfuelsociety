
-- Add ebook_url to workout_programs
ALTER TABLE public.workout_programs ADD COLUMN ebook_url text DEFAULT NULL;

-- Create storage bucket for program ebooks
INSERT INTO storage.buckets (id, name, public) VALUES ('program-ebooks', 'program-ebooks', true);

-- Anyone can view program ebooks
CREATE POLICY "Anyone can view program ebooks"
ON storage.objects FOR SELECT
USING (bucket_id = 'program-ebooks');

-- Admins can upload program ebooks
CREATE POLICY "Admins can upload program ebooks"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'program-ebooks' AND is_admin_or_pt(auth.uid()));

-- Admins can delete program ebooks
CREATE POLICY "Admins can delete program ebooks"
ON storage.objects FOR DELETE
USING (bucket_id = 'program-ebooks' AND is_admin_or_pt(auth.uid()));

-- Admins can update program ebooks
CREATE POLICY "Admins can update program ebooks"
ON storage.objects FOR UPDATE
USING (bucket_id = 'program-ebooks' AND is_admin_or_pt(auth.uid()));
