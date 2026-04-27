// Workout Program Types

export type ScheduleMode = 'admin_selected' | 'user_selected';

export type ProgramAccessType = 'free' | 'membership' | 'standalone';

export interface WorkoutProgram {
  id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  weeks: number;
  frequency_per_week: number;
  schedule_mode: ScheduleMode;
  admin_days_of_week: number[] | null;
  published: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  ebook_url: string | null;
  access_type: ProgramAccessType;
  price_cents: number | null;
  stripe_price_id: string | null;
}

export interface WorkoutSessionTemplate {
  id: string;
  program_id: string;
  week_number: number;
  session_index: number;
  title: string;
  content_json: SessionContent;
  created_at: string;
}

export interface SessionContent {
  exercises?: Exercise[];
  notes?: string;
  warmup?: string;
  cooldown?: string;
}

export interface Exercise {
  name: string;
  sets?: number;
  reps?: string;
  duration?: string;
  notes?: string;
}

export interface UserProgramEnrollment {
  id: string;
  user_id: string;
  program_id: string;
  start_date: string;
  selected_days_of_week: number[] | null;
  created_at: string;
}

export interface CalendarEvent {
  id: string;
  user_id: string;
  event_date: string;
  event_type: string;
  title: string;
  description: string | null;
  linked_program_id: string | null;
  linked_session_id: string | null;
  enrollment_id: string | null;
  completed: boolean;
  completed_at: string | null;
  reminder_enabled: boolean;
  created_at: string;
}

export interface RingHabits {
  workout: boolean;
  protein: boolean;
  hydration: boolean;
  fasting: boolean;
  cycle_logging: boolean;
  whole_foods: boolean;
}

export const DEFAULT_RING_HABITS: RingHabits = {
  workout: true,
  protein: true,
  hydration: true,
  fasting: false,
  cycle_logging: false,
  whole_foods: false,
};

export interface UserSettings {
  id: string;
  user_id: string;
  reminders_enabled: boolean;
  reminder_time: 'morning' | 'afternoon' | 'evening';
  ring_habits: RingHabits;
  created_at: string;
  updated_at: string;
}

// Day of week helpers
export const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday', short: 'Sun' },
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' },
];
