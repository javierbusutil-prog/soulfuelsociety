-- Create storage bucket for community media
INSERT INTO storage.buckets (id, name, public) VALUES ('community-media', 'community-media', true);

-- Anyone can view community media
CREATE POLICY "Anyone can view community media"
ON storage.objects FOR SELECT
USING (bucket_id = 'community-media');

-- Authenticated users can upload
CREATE POLICY "Authenticated users can upload community media"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'community-media' AND auth.uid() IS NOT NULL);

-- Users can delete own uploads
CREATE POLICY "Users can delete own community media"
ON storage.objects FOR DELETE
USING (bucket_id = 'community-media' AND auth.uid()::text = (storage.foldername(name))[1]);
