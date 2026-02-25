// Movement types for Soul Fuel Society

export interface Movement {
  id: string;
  name: string;
  video_url: string | null;
  thumbnail_url: string | null;
  muscle_group: string;
  category: string;
  equipment: string;
  difficulty: string;
  form_cues: string[];
  common_mistakes: string[];
  regressions: string[];
  progressions: string[];
  safety_notes: string | null;
  tags: string[];
  published: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const MUSCLE_GROUPS = ['glutes', 'hamstrings', 'quads', 'core', 'upper body', 'full body'] as const;
export const MOVEMENT_CATEGORIES = ['squat', 'hinge', 'lunge', 'push', 'pull', 'carry', 'core', 'mobility'] as const;
export const EQUIPMENT_OPTIONS = ['bodyweight', 'dumbbells', 'barbell', 'bands', 'cable', 'machine'] as const;
export const DIFFICULTY_LEVELS = ['beginner', 'intermediate', 'advanced'] as const;
export const COMMON_TAGS = [
  'knee friendly', 'low back friendly', 'home workout', 'gym only',
  'pregnancy safe', 'postpartum', 'warm up', 'cool down',
] as const;
