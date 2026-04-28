CREATE TABLE public.pt_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  chief_complaint TEXT NOT NULL,
  symptom_duration TEXT NOT NULL,
  pain_scale INTEGER NOT NULL CHECK (pain_scale >= 1 AND pain_scale <= 10),
  goals TEXT NOT NULL,
  preferred_contact TEXT NOT NULL CHECK (preferred_contact IN ('call', 'text')),
  best_time TEXT NOT NULL CHECK (best_time IN ('morning', 'afternoon', 'evening')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'consult_scheduled', 'evaluation_booked', 'active_patient', 'discharged')),
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.pt_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can insert own pt requests"
ON public.pt_requests FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Members can view own pt requests"
ON public.pt_requests FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.is_admin_or_pt(auth.uid()));

CREATE POLICY "Admins can update pt requests"
ON public.pt_requests FOR UPDATE
TO authenticated
USING (public.is_admin_or_pt(auth.uid()));

CREATE POLICY "Admins can delete pt requests"
ON public.pt_requests FOR DELETE
TO authenticated
USING (public.is_admin_or_pt(auth.uid()));

CREATE TRIGGER pt_requests_updated_at
BEFORE UPDATE ON public.pt_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.notify_admins_on_pt_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _admin RECORD;
BEGIN
  FOR _admin IN
    SELECT DISTINCT user_id FROM public.user_roles WHERE role IN ('admin', 'pt_admin')
  LOOP
    INSERT INTO public.notifications (user_id, type, title, body, reference_id)
    VALUES (
      _admin.user_id,
      'pt_request',
      'New PT evaluation request',
      'New PT evaluation request from ' || NEW.full_name,
      NEW.id
    );
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER pt_requests_notify_admins
AFTER INSERT ON public.pt_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_admins_on_pt_request();