ALTER TABLE public.movements
ADD COLUMN IF NOT EXISTS is_bodyweight boolean NOT NULL DEFAULT false;