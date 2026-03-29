
-- Session bookings table
CREATE TABLE public.session_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL,
  coach_id uuid,
  scheduled_at timestamptz NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 60,
  session_type text NOT NULL DEFAULT 'solo',
  status text NOT NULL DEFAULT 'scheduled',
  coach_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.session_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches can manage all bookings"
  ON public.session_bookings FOR ALL
  TO authenticated
  USING (public.is_admin_or_pt(auth.uid()));

CREATE POLICY "Members can view own bookings"
  ON public.session_bookings FOR SELECT
  TO authenticated
  USING (auth.uid() = member_id);

-- Session logs table
CREATE TABLE public.session_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES public.session_bookings(id) ON DELETE CASCADE,
  member_ids uuid[] NOT NULL DEFAULT '{}',
  coach_id uuid NOT NULL,
  scheduled_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'completed',
  coach_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.session_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches can manage session logs"
  ON public.session_logs FOR ALL
  TO authenticated
  USING (public.is_admin_or_pt(auth.uid()));

CREATE POLICY "Members can view own session logs"
  ON public.session_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = ANY(member_ids));
