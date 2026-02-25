import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

export interface DailyNutrition {
  id: string;
  user_id: string;
  date: string;
  protein_goal: number;
  protein_logged: number;
  hydration_goal: number;
  hydration_logged: number;
  electrolyte_taken: boolean;
  protein_priority: boolean;
  whole_foods_focus: boolean;
  energy_level: number | null;
  mood_level: number | null;
  created_at: string;
  updated_at: string;
}

export function useNutrition(date?: Date) {
  const { user } = useAuth();
  const [entry, setEntry] = useState<DailyNutrition | null>(null);
  const [loading, setLoading] = useState(true);
  const [streak, setStreak] = useState(0);

  const dateStr = format(date || new Date(), 'yyyy-MM-dd');

  const fetchEntry = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('daily_nutrition')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', dateStr)
      .maybeSingle();

    if (!error && data) {
      setEntry(data as unknown as DailyNutrition);
    } else {
      setEntry(null);
    }
    setLoading(false);
  }, [user, dateStr]);

  const fetchStreak = useCallback(async () => {
    if (!user) return;

    const { data } = await supabase
      .from('daily_nutrition')
      .select('date, protein_goal, protein_logged, hydration_goal, hydration_logged, protein_priority, whole_foods_focus')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(60);

    if (!data || data.length === 0) { setStreak(0); return; }

    let count = 0;
    const today = new Date();
    for (let i = 0; i < 60; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const ds = format(d, 'yyyy-MM-dd');
      const row = data.find((r: any) => r.date === ds);
      if (!row) break;
      // Count as complete if at least 3 of 4 habits done
      const habits = [
        row.protein_priority,
        row.whole_foods_focus,
        (row as any).protein_logged >= (row as any).protein_goal,
        (row as any).hydration_logged >= (row as any).hydration_goal,
      ].filter(Boolean).length;
      if (habits >= 3) count++;
      else break;
    }
    setStreak(count);
  }, [user]);

  useEffect(() => {
    fetchEntry();
    fetchStreak();
  }, [fetchEntry, fetchStreak]);

  const upsert = async (updates: Partial<DailyNutrition>) => {
    if (!user) return;

    if (entry) {
      const { data, error } = await supabase
        .from('daily_nutrition')
        .update(updates as any)
        .eq('id', entry.id)
        .select()
        .single();
      if (!error && data) setEntry(data as unknown as DailyNutrition);
    } else {
      const { data, error } = await supabase
        .from('daily_nutrition')
        .insert({ user_id: user.id, date: dateStr, ...updates } as any)
        .select()
        .single();
      if (!error && data) setEntry(data as unknown as DailyNutrition);
    }
    fetchStreak();
  };

  const addProtein = async (grams: number) => {
    const current = entry?.protein_logged || 0;
    await upsert({ protein_logged: current + grams });
  };

  const addWater = async (oz: number) => {
    const current = entry?.hydration_logged || 0;
    await upsert({ hydration_logged: current + oz });
  };

  const toggleHabit = async (field: 'protein_priority' | 'whole_foods_focus' | 'electrolyte_taken') => {
    const current = entry?.[field] || false;
    await upsert({ [field]: !current });
  };

  const setGoal = async (field: 'protein_goal' | 'hydration_goal', value: number) => {
    await upsert({ [field]: value });
  };

  const setCheckin = async (field: 'energy_level' | 'mood_level', value: number) => {
    await upsert({ [field]: value });
  };

  return {
    entry,
    loading,
    streak,
    addProtein,
    addWater,
    toggleHabit,
    setGoal,
    setCheckin,
    upsert,
    refetch: fetchEntry,
  };
}
