
-- Coach availability table
CREATE TABLE public.coach_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL,
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(coach_id, day_of_week, start_time)
);

ALTER TABLE public.coach_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches can manage own availability"
  ON public.coach_availability FOR ALL
  TO authenticated
  USING (is_admin_or_pt(auth.uid()))
  WITH CHECK (auth.uid() = coach_id);

CREATE POLICY "Anyone authenticated can view availability"
  ON public.coach_availability FOR SELECT
  TO authenticated
  USING (true);

-- Coach blocked dates table
CREATE TABLE public.coach_blocked_dates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL,
  blocked_date date NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(coach_id, blocked_date)
);

ALTER TABLE public.coach_blocked_dates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches can manage own blocked dates"
  ON public.coach_blocked_dates FOR ALL
  TO authenticated
  USING (is_admin_or_pt(auth.uid()))
  WITH CHECK (auth.uid() = coach_id);

CREATE POLICY "Anyone authenticated can view blocked dates"
  ON public.coach_blocked_dates FOR SELECT
  TO authenticated
  USING (true);

-- Add member_ids array and group booking statuses to session_bookings
ALTER TABLE public.session_bookings 
  ADD COLUMN IF NOT EXISTS member_ids uuid[] DEFAULT '{}';

-- Backfill member_ids from member_id for existing rows
UPDATE public.session_bookings 
  SET member_ids = ARRAY[member_id] 
  WHERE member_ids = '{}' OR member_ids IS NULL;
