// Custom type definitions for Soul Fuel Society

export type AppRole = 'free' | 'paid' | 'admin' | 'pt_admin';
export type SubscriptionStatus = 'inactive' | 'active' | 'cancelled' | 'past_due';
export type EventType = 'fast' | 'workout' | 'live_session' | 'challenge' | 'other';
export type WorkoutLevel = 'beginner' | 'intermediate' | 'advanced';
export type WorkoutType = 'strength' | 'cardio' | 'mobility' | 'recovery' | 'hiit';
export type PlanItemType = 'workout' | 'nutrition';
export type PTConsultType = 'injury_screen' | 'program_modification' | 'mobility_assessment' | 'other';
export type PTConsultStatus = 'pending' | 'approved' | 'scheduled' | 'completed' | 'declined';
export type ProductType = 'digital' | 'physical';
export type OrderStatus = 'pending' | 'paid' | 'fulfilled' | 'cancelled';

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  subscription_status: SubscriptionStatus;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  selected_plan: string | null;
  session_count: number | null;
  group_size: string | null;
  assigned_coach_id: string | null;
  assigned_pt_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

export interface Group {
  id: string;
  name: string;
  description: string | null;
  is_default: boolean;
  created_by: string | null;
  created_at: string;
}

export interface Post {
  id: string;
  group_id: string;
  user_id: string;
  content: string;
  media_url: string | null;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  // Joined fields
  profiles?: Profile;
}

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  // Joined fields
  profiles?: Profile;
}

export interface Reaction {
  id: string;
  post_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export interface Event {
  id: string;
  title: string;
  description: string | null;
  event_type: EventType;
  start_datetime: string;
  end_datetime: string | null;
  recurrence_rule: string | null;
  checkoff_enabled: boolean;
  created_by: string | null;
  created_at: string;
  user_id: string | null;
  is_global: boolean;
}

export interface EventCompletion {
  id: string;
  event_id: string;
  user_id: string;
  completed_at: string;
}

export interface Workout {
  id: string;
  title: string;
  level: WorkoutLevel;
  workout_type: WorkoutType;
  duration_minutes: number;
  equipment: string[] | null;
  description: string | null;
  coaching_notes: string | null;
  media_url: string | null;
  thumbnail_url: string | null;
  is_featured: boolean;
  created_by: string | null;
  created_at: string;
}

export interface WorkoutCompletion {
  id: string;
  workout_id: string;
  user_id: string;
  completed_at: string;
}

export interface Favorite {
  id: string;
  user_id: string;
  workout_id: string;
  created_at: string;
}

export interface Thread {
  id: string;
  user_id: string;
  admin_id: string | null;
  created_at: string;
  // Joined fields
  profiles?: Profile;
  last_message?: Message;
}

export interface Message {
  id: string;
  thread_id: string;
  sender_id: string;
  content: string;
  media_url: string | null;
  tag: string | null;
  read_at: string | null;
  created_at: string;
  // Joined fields
  profiles?: Profile;
}

export interface Plan {
  id: string;
  user_id: string;
  week_start_date: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlanItem {
  id: string;
  plan_id: string;
  day_of_week: number;
  item_type: PlanItemType;
  workout_id: string | null;
  title: string;
  notes: string | null;
  attachment_url: string | null;
  created_at: string;
  // Joined fields
  workout?: Workout;
}

export interface PlanCompletion {
  id: string;
  plan_item_id: string;
  user_id: string;
  completed_at: string;
}

export interface PTIntake {
  id: string;
  user_id: string;
  main_goal: string | null;
  injury_history: string | null;
  pain_area: string | null;
  pain_scale: number | null;
  equipment_available: string[] | null;
  contraindications: string | null;
  consent_given: boolean;
  completed_at: string;
}

export interface PTConsultRequest {
  id: string;
  user_id: string;
  consult_type: PTConsultType;
  preferred_times: Record<string, unknown> | null;
  notes: string | null;
  status: PTConsultStatus;
  scheduled_at: string | null;
  assigned_pt_id: string | null;
  created_at: string;
}

export interface PTConsultNote {
  id: string;
  consult_request_id: string;
  summary: string | null;
  recommendations: string | null;
  modifications: string | null;
  red_flags: string | null;
  follow_up_plan: string | null;
  attachments: Record<string, unknown> | null;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  images: string[] | null;
  category: string | null;
  product_type: ProductType;
  inventory_count: number | null;
  delivery_asset_url: string | null;
  active: boolean;
  stripe_price_id: string | null;
  created_at: string;
}

export interface Order {
  id: string;
  user_id: string;
  stripe_payment_id: string | null;
  total: number;
  status: OrderStatus;
  created_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  price: number;
  // Joined fields
  product?: Product;
}

// Re-export Movement types
export type { Movement } from './movements';
export { MUSCLE_GROUPS, MOVEMENT_CATEGORIES, EQUIPMENT_OPTIONS, DIFFICULTY_LEVELS, COMMON_TAGS } from './movements';
