-- Add user_id to events for personal events (null = admin/global event)
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add is_global flag to distinguish admin-created events visible to all
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS is_global boolean DEFAULT false;

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can manage events" ON public.events;
DROP POLICY IF EXISTS "Anyone can view events" ON public.events;

-- Users can view their own events OR global events
CREATE POLICY "Users can view own and global events" 
ON public.events FOR SELECT 
USING (
  is_global = true 
  OR user_id = auth.uid() 
  OR is_admin_or_pt(auth.uid())
);

-- Users can create their own events
CREATE POLICY "Users can create own events" 
ON public.events FOR INSERT 
WITH CHECK (
  (user_id = auth.uid() AND is_global = false)
  OR is_admin_or_pt(auth.uid())
);

-- Users can update their own events, admins can update any
CREATE POLICY "Users can update own events" 
ON public.events FOR UPDATE 
USING (
  user_id = auth.uid() 
  OR is_admin_or_pt(auth.uid())
);

-- Users can delete their own events, admins can delete any
CREATE POLICY "Users can delete own events" 
ON public.events FOR DELETE 
USING (
  user_id = auth.uid() 
  OR is_admin_or_pt(auth.uid())
);

-- Update existing seed events to be global
UPDATE public.events SET is_global = true WHERE user_id IS NULL;