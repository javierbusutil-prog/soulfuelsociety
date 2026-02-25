
-- Replace the overly permissive insert policy with a restrictive one
-- Notifications are only inserted by SECURITY DEFINER triggers, so no user should insert directly
DROP POLICY "System can insert notifications" ON public.notifications;

CREATE POLICY "No direct insert"
  ON public.notifications FOR INSERT
  WITH CHECK (false);
