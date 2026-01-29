// Workout Program Types

export type ScheduleMode = 'admin_selected' | 'user_selected';

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

export interface UserSettings {
  id: string;
  user_id: string;
  reminders_enabled: boolean;
  reminder_time: 'morning' | 'afternoon' | 'evening';
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
