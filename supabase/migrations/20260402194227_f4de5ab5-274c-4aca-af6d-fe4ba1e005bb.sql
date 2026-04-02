ALTER TABLE public.profiles
ADD COLUMN upgraded_at timestamp with time zone DEFAULT NULL,
ADD COLUMN intake_reminder_sent boolean NOT NULL DEFAULT false;