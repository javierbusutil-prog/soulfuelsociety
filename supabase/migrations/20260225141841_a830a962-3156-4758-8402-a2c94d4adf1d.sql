
-- Movements table
CREATE TABLE public.movements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  video_url TEXT,
  thumbnail_url TEXT,
  muscle_group TEXT NOT NULL DEFAULT 'full body',
  category TEXT NOT NULL DEFAULT 'mobility',
  equipment TEXT NOT NULL DEFAULT 'bodyweight',
  difficulty TEXT NOT NULL DEFAULT 'beginner',
  form_cues TEXT[] NOT NULL DEFAULT '{}',
  common_mistakes TEXT[] NOT NULL DEFAULT '{}',
  regressions TEXT[] NOT NULL DEFAULT '{}',
  progressions TEXT[] NOT NULL DEFAULT '{}',
  safety_notes TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  published BOOLEAN NOT NULL DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.movements ENABLE ROW LEVEL SECURITY;

-- Anyone can view published movements
CREATE POLICY "Anyone can view published movements"
  ON public.movements FOR SELECT
  USING (published = true OR is_admin_or_pt(auth.uid()));

-- Only admins can manage movements
CREATE POLICY "Admins can manage movements"
  ON public.movements FOR ALL
  USING (is_admin_or_pt(auth.uid()));

-- Movement favorites table
CREATE TABLE public.movement_favorites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  movement_id UUID NOT NULL REFERENCES public.movements(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, movement_id)
);

ALTER TABLE public.movement_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own movement favorites"
  ON public.movement_favorites FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add movement favorites"
  ON public.movement_favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove movement favorites"
  ON public.movement_favorites FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at on movements
CREATE TRIGGER update_movements_updated_at
  BEFORE UPDATE ON public.movements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for movement media
INSERT INTO storage.buckets (id, name, public) VALUES ('movement-media', 'movement-media', true);

-- Storage policies for movement media
CREATE POLICY "Anyone can view movement media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'movement-media');

CREATE POLICY "Admins can upload movement media"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'movement-media' AND is_admin_or_pt(auth.uid()));

CREATE POLICY "Admins can update movement media"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'movement-media' AND is_admin_or_pt(auth.uid()));

CREATE POLICY "Admins can delete movement media"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'movement-media' AND is_admin_or_pt(auth.uid()));
