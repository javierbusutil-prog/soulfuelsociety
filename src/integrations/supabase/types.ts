export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      calendar_events: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at: string
          description: string | null
          enrollment_id: string | null
          event_date: string
          event_type: string
          id: string
          linked_program_id: string | null
          linked_session_id: string | null
          reminder_enabled: boolean
          title: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          description?: string | null
          enrollment_id?: string | null
          event_date: string
          event_type?: string
          id?: string
          linked_program_id?: string | null
          linked_session_id?: string | null
          reminder_enabled?: boolean
          title: string
          user_id: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          description?: string | null
          enrollment_id?: string | null
          event_date?: string
          event_type?: string
          id?: string
          linked_program_id?: string | null
          linked_session_id?: string | null
          reminder_enabled?: boolean
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "user_program_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_linked_program_id_fkey"
            columns: ["linked_program_id"]
            isOneToOne: false
            referencedRelation: "workout_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_linked_session_id_fkey"
            columns: ["linked_session_id"]
            isOneToOne: false
            referencedRelation: "workout_session_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          content: string
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      cycle_entries: {
        Row: {
          created_at: string
          date: string
          flow_level: string | null
          id: string
          is_period: boolean
          notes: string | null
          symptoms: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          flow_level?: string | null
          id?: string
          is_period?: boolean
          notes?: string | null
          symptoms?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          flow_level?: string | null
          id?: string
          is_period?: boolean
          notes?: string | null
          symptoms?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      cycle_settings: {
        Row: {
          created_at: string
          cycle_length_days: number
          hide_cycle_markers: boolean
          id: string
          period_length_days: number
          prediction_enabled: boolean
          reminder_enabled: boolean
          reminder_time: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          cycle_length_days?: number
          hide_cycle_markers?: boolean
          id?: string
          period_length_days?: number
          prediction_enabled?: boolean
          reminder_enabled?: boolean
          reminder_time?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          cycle_length_days?: number
          hide_cycle_markers?: boolean
          id?: string
          period_length_days?: number
          prediction_enabled?: boolean
          reminder_enabled?: boolean
          reminder_time?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_nutrition: {
        Row: {
          created_at: string
          date: string
          electrolyte_taken: boolean
          energy_level: number | null
          hydration_goal: number
          hydration_logged: number
          id: string
          mood_level: number | null
          protein_goal: number
          protein_logged: number
          protein_priority: boolean
          updated_at: string
          user_id: string
          whole_foods_focus: boolean
        }
        Insert: {
          created_at?: string
          date?: string
          electrolyte_taken?: boolean
          energy_level?: number | null
          hydration_goal?: number
          hydration_logged?: number
          id?: string
          mood_level?: number | null
          protein_goal?: number
          protein_logged?: number
          protein_priority?: boolean
          updated_at?: string
          user_id: string
          whole_foods_focus?: boolean
        }
        Update: {
          created_at?: string
          date?: string
          electrolyte_taken?: boolean
          energy_level?: number | null
          hydration_goal?: number
          hydration_logged?: number
          id?: string
          mood_level?: number | null
          protein_goal?: number
          protein_logged?: number
          protein_priority?: boolean
          updated_at?: string
          user_id?: string
          whole_foods_focus?: boolean
        }
        Relationships: []
      }
      event_completions: {
        Row: {
          completed_at: string
          event_id: string
          id: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          event_id: string
          id?: string
          user_id: string
        }
        Update: {
          completed_at?: string
          event_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_completions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          checkoff_enabled: boolean | null
          created_at: string
          created_by: string | null
          description: string | null
          end_datetime: string | null
          event_type: Database["public"]["Enums"]["event_type"] | null
          id: string
          is_global: boolean | null
          recurrence_rule: string | null
          start_datetime: string
          title: string
          user_id: string | null
        }
        Insert: {
          checkoff_enabled?: boolean | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_datetime?: string | null
          event_type?: Database["public"]["Enums"]["event_type"] | null
          id?: string
          is_global?: boolean | null
          recurrence_rule?: string | null
          start_datetime: string
          title: string
          user_id?: string | null
        }
        Update: {
          checkoff_enabled?: boolean | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_datetime?: string | null
          event_type?: Database["public"]["Enums"]["event_type"] | null
          id?: string
          is_global?: boolean | null
          recurrence_rule?: string | null
          start_datetime?: string
          title?: string
          user_id?: string | null
        }
        Relationships: []
      }
      fast_sessions: {
        Row: {
          created_at: string
          duration_minutes: number | null
          end_at: string | null
          id: string
          start_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_minutes?: number | null
          end_at?: string | null
          id?: string
          start_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          duration_minutes?: number | null
          end_at?: string | null
          id?: string
          start_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          user_id: string
          workout_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
          workout_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      group_memberships: {
        Row: {
          group_id: string
          id: string
          joined_at: string
          status: string | null
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string
          status?: string | null
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_memberships_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_default: boolean | null
          name: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          media_url: string | null
          read_at: string | null
          sender_id: string
          tag: string | null
          thread_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          media_url?: string | null
          read_at?: string | null
          sender_id: string
          tag?: string | null
          thread_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          media_url?: string | null
          read_at?: string | null
          sender_id?: string
          tag?: string | null
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "threads"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          read: boolean
          reference_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          read?: boolean
          reference_id?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          read?: boolean
          reference_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          price: number
          product_id: string
          quantity: number | null
        }
        Insert: {
          id?: string
          order_id: string
          price: number
          product_id: string
          quantity?: number | null
        }
        Update: {
          id?: string
          order_id?: string
          price?: number
          product_id?: string
          quantity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          id: string
          status: Database["public"]["Enums"]["order_status"] | null
          stripe_payment_id: string | null
          total: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["order_status"] | null
          stripe_payment_id?: string | null
          total: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["order_status"] | null
          stripe_payment_id?: string | null
          total?: number
          user_id?: string
        }
        Relationships: []
      }
      plan_completions: {
        Row: {
          completed_at: string
          id: string
          plan_item_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          id?: string
          plan_item_id: string
          user_id: string
        }
        Update: {
          completed_at?: string
          id?: string
          plan_item_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_completions_plan_item_id_fkey"
            columns: ["plan_item_id"]
            isOneToOne: false
            referencedRelation: "plan_items"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_items: {
        Row: {
          attachment_url: string | null
          created_at: string
          day_of_week: number
          id: string
          item_type: Database["public"]["Enums"]["plan_item_type"]
          notes: string | null
          plan_id: string
          title: string
          workout_id: string | null
        }
        Insert: {
          attachment_url?: string | null
          created_at?: string
          day_of_week: number
          id?: string
          item_type: Database["public"]["Enums"]["plan_item_type"]
          notes?: string | null
          plan_id: string
          title: string
          workout_id?: string | null
        }
        Update: {
          attachment_url?: string | null
          created_at?: string
          day_of_week?: number
          id?: string
          item_type?: Database["public"]["Enums"]["plan_item_type"]
          notes?: string | null
          plan_id?: string
          title?: string
          workout_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plan_items_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_items_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          updated_at: string
          user_id: string
          week_start_date: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          updated_at?: string
          user_id: string
          week_start_date: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          updated_at?: string
          user_id?: string
          week_start_date?: string
        }
        Relationships: []
      }
      posts: {
        Row: {
          content: string
          created_at: string
          group_id: string
          id: string
          is_pinned: boolean | null
          media_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          group_id: string
          id?: string
          is_pinned?: boolean | null
          media_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          group_id?: string
          id?: string
          is_pinned?: boolean | null
          media_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean | null
          category: string | null
          created_at: string
          delivery_asset_url: string | null
          description: string | null
          id: string
          images: Json | null
          inventory_count: number | null
          name: string
          price: number
          product_type: Database["public"]["Enums"]["product_type"] | null
          stripe_price_id: string | null
        }
        Insert: {
          active?: boolean | null
          category?: string | null
          created_at?: string
          delivery_asset_url?: string | null
          description?: string | null
          id?: string
          images?: Json | null
          inventory_count?: number | null
          name: string
          price: number
          product_type?: Database["public"]["Enums"]["product_type"] | null
          stripe_price_id?: string | null
        }
        Update: {
          active?: boolean | null
          category?: string | null
          created_at?: string
          delivery_asset_url?: string | null
          description?: string | null
          id?: string
          images?: Json | null
          inventory_count?: number | null
          name?: string
          price?: number
          product_type?: Database["public"]["Enums"]["product_type"] | null
          stripe_price_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          assigned_coach_id: string | null
          assigned_pt_id: string | null
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          stripe_customer_id: string | null
          subscription_status:
            | Database["public"]["Enums"]["subscription_status"]
            | null
          updated_at: string
        }
        Insert: {
          assigned_coach_id?: string | null
          assigned_pt_id?: string | null
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          stripe_customer_id?: string | null
          subscription_status?:
            | Database["public"]["Enums"]["subscription_status"]
            | null
          updated_at?: string
        }
        Update: {
          assigned_coach_id?: string | null
          assigned_pt_id?: string | null
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          stripe_customer_id?: string | null
          subscription_status?:
            | Database["public"]["Enums"]["subscription_status"]
            | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_assigned_coach_id_fkey"
            columns: ["assigned_coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_assigned_pt_id_fkey"
            columns: ["assigned_pt_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pt_consult_notes: {
        Row: {
          attachments: Json | null
          consult_request_id: string
          created_at: string
          follow_up_plan: string | null
          id: string
          modifications: string | null
          recommendations: string | null
          red_flags: string | null
          summary: string | null
        }
        Insert: {
          attachments?: Json | null
          consult_request_id: string
          created_at?: string
          follow_up_plan?: string | null
          id?: string
          modifications?: string | null
          recommendations?: string | null
          red_flags?: string | null
          summary?: string | null
        }
        Update: {
          attachments?: Json | null
          consult_request_id?: string
          created_at?: string
          follow_up_plan?: string | null
          id?: string
          modifications?: string | null
          recommendations?: string | null
          red_flags?: string | null
          summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pt_consult_notes_consult_request_id_fkey"
            columns: ["consult_request_id"]
            isOneToOne: false
            referencedRelation: "pt_consult_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      pt_consult_requests: {
        Row: {
          assigned_pt_id: string | null
          consult_type: Database["public"]["Enums"]["pt_consult_type"] | null
          created_at: string
          id: string
          notes: string | null
          preferred_times: Json | null
          scheduled_at: string | null
          status: Database["public"]["Enums"]["pt_consult_status"] | null
          user_id: string
        }
        Insert: {
          assigned_pt_id?: string | null
          consult_type?: Database["public"]["Enums"]["pt_consult_type"] | null
          created_at?: string
          id?: string
          notes?: string | null
          preferred_times?: Json | null
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["pt_consult_status"] | null
          user_id: string
        }
        Update: {
          assigned_pt_id?: string | null
          consult_type?: Database["public"]["Enums"]["pt_consult_type"] | null
          created_at?: string
          id?: string
          notes?: string | null
          preferred_times?: Json | null
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["pt_consult_status"] | null
          user_id?: string
        }
        Relationships: []
      }
      pt_intakes: {
        Row: {
          completed_at: string
          consent_given: boolean | null
          contraindications: string | null
          equipment_available: string[] | null
          id: string
          injury_history: string | null
          main_goal: string | null
          pain_area: string | null
          pain_scale: number | null
          user_id: string
        }
        Insert: {
          completed_at?: string
          consent_given?: boolean | null
          contraindications?: string | null
          equipment_available?: string[] | null
          id?: string
          injury_history?: string | null
          main_goal?: string | null
          pain_area?: string | null
          pain_scale?: number | null
          user_id: string
        }
        Update: {
          completed_at?: string
          consent_given?: boolean | null
          contraindications?: string | null
          equipment_available?: string[] | null
          id?: string
          injury_history?: string | null
          main_goal?: string | null
          pain_area?: string | null
          pain_scale?: number | null
          user_id?: string
        }
        Relationships: []
      }
      reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      threads: {
        Row: {
          admin_id: string | null
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          admin_id?: string | null
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          admin_id?: string | null
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_program_enrollments: {
        Row: {
          created_at: string
          id: string
          program_id: string
          selected_days_of_week: number[] | null
          start_date: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          program_id: string
          selected_days_of_week?: number[] | null
          start_date: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          program_id?: string
          selected_days_of_week?: number[] | null
          start_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_program_enrollments_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "workout_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          created_at: string
          id: string
          reminder_time: string
          reminders_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reminder_time?: string
          reminders_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reminder_time?: string
          reminders_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      waitlist: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      workout_completions: {
        Row: {
          completed_at: string
          id: string
          user_id: string
          workout_id: string
        }
        Insert: {
          completed_at?: string
          id?: string
          user_id: string
          workout_id: string
        }
        Update: {
          completed_at?: string
          id?: string
          user_id?: string
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_completions_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_programs: {
        Row: {
          admin_days_of_week: number[] | null
          cover_image_url: string | null
          created_at: string
          created_by: string | null
          description: string | null
          frequency_per_week: number
          id: string
          published: boolean
          schedule_mode: Database["public"]["Enums"]["schedule_mode"]
          title: string
          updated_at: string
          weeks: number
        }
        Insert: {
          admin_days_of_week?: number[] | null
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          frequency_per_week?: number
          id?: string
          published?: boolean
          schedule_mode?: Database["public"]["Enums"]["schedule_mode"]
          title: string
          updated_at?: string
          weeks?: number
        }
        Update: {
          admin_days_of_week?: number[] | null
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          frequency_per_week?: number
          id?: string
          published?: boolean
          schedule_mode?: Database["public"]["Enums"]["schedule_mode"]
          title?: string
          updated_at?: string
          weeks?: number
        }
        Relationships: []
      }
      workout_session_templates: {
        Row: {
          content_json: Json | null
          created_at: string
          id: string
          program_id: string
          session_index: number
          title: string
          week_number: number
        }
        Insert: {
          content_json?: Json | null
          created_at?: string
          id?: string
          program_id: string
          session_index: number
          title: string
          week_number: number
        }
        Update: {
          content_json?: Json | null
          created_at?: string
          id?: string
          program_id?: string
          session_index?: number
          title?: string
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "workout_session_templates_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "workout_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      workouts: {
        Row: {
          coaching_notes: string | null
          created_at: string
          created_by: string | null
          description: string | null
          duration_minutes: number | null
          equipment: string[] | null
          id: string
          is_featured: boolean | null
          level: Database["public"]["Enums"]["workout_level"] | null
          media_url: string | null
          thumbnail_url: string | null
          title: string
          workout_type: Database["public"]["Enums"]["workout_type"] | null
        }
        Insert: {
          coaching_notes?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_minutes?: number | null
          equipment?: string[] | null
          id?: string
          is_featured?: boolean | null
          level?: Database["public"]["Enums"]["workout_level"] | null
          media_url?: string | null
          thumbnail_url?: string | null
          title: string
          workout_type?: Database["public"]["Enums"]["workout_type"] | null
        }
        Update: {
          coaching_notes?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_minutes?: number | null
          equipment?: string[] | null
          id?: string
          is_featured?: boolean | null
          level?: Database["public"]["Enums"]["workout_level"] | null
          media_url?: string | null
          thumbnail_url?: string | null
          title?: string
          workout_type?: Database["public"]["Enums"]["workout_type"] | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_active_subscription: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_or_pt: { Args: { _user_id: string }; Returns: boolean }
      is_paid_member: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "free" | "paid" | "admin" | "pt_admin"
      event_type: "fast" | "workout" | "live_session" | "challenge" | "other"
      order_status: "pending" | "paid" | "fulfilled" | "cancelled"
      plan_item_type: "workout" | "nutrition"
      product_type: "digital" | "physical"
      pt_consult_status:
        | "pending"
        | "approved"
        | "scheduled"
        | "completed"
        | "declined"
      pt_consult_type:
        | "injury_screen"
        | "program_modification"
        | "mobility_assessment"
        | "other"
      schedule_mode: "admin_selected" | "user_selected"
      subscription_status: "inactive" | "active" | "cancelled" | "past_due"
      workout_level: "beginner" | "intermediate" | "advanced"
      workout_type: "strength" | "cardio" | "mobility" | "recovery" | "hiit"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["free", "paid", "admin", "pt_admin"],
      event_type: ["fast", "workout", "live_session", "challenge", "other"],
      order_status: ["pending", "paid", "fulfilled", "cancelled"],
      plan_item_type: ["workout", "nutrition"],
      product_type: ["digital", "physical"],
      pt_consult_status: [
        "pending",
        "approved",
        "scheduled",
        "completed",
        "declined",
      ],
      pt_consult_type: [
        "injury_screen",
        "program_modification",
        "mobility_assessment",
        "other",
      ],
      schedule_mode: ["admin_selected", "user_selected"],
      subscription_status: ["inactive", "active", "cancelled", "past_due"],
      workout_level: ["beginner", "intermediate", "advanced"],
      workout_type: ["strength", "cardio", "mobility", "recovery", "hiit"],
    },
  },
} as const
