import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { startOfWeek, format } from 'date-fns';
import { toast } from 'sonner';

export interface PlanExercise {
  label: string;       // e.g. "A)", "B1)", "C2)"
  name: string;        // e.g. "Back Squat"
  details: string;     // e.g. "@20X1, 12,8,4,12,8,4; rest 2:00"
}

export interface PlanDay {
  id?: string;
  week_start: string;
  day_of_week: number;
  title: string;
  exercises: PlanExercise[];
  notes: string | null;
}

export function useWeeklyPlan(currentWeekStart: Date) {
  const { user, isAdmin } = useAuth();
  const [days, setDays] = useState<PlanDay[]>([]);
  const [loading, setLoading] = useState(true);

  const weekStr = format(startOfWeek(currentWeekStart, { weekStartsOn: 1 }), 'yyyy-MM-dd');

  const fetchDays = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('weekly_plan_days' as any)
      .select('*')
      .eq('week_start', weekStr)
      .order('day_of_week');

    if (!error && data) {
      setDays((data as any[]).map(d => {
        let parsedExercises: PlanExercise[] = [];

        if (Array.isArray(d.exercises)) {
          parsedExercises = d.exercises;
        } else if (typeof d.exercises === 'string') {
          try {
            const parsed = JSON.parse(d.exercises);
            parsedExercises = Array.isArray(parsed) ? parsed : [];
          } catch {
            parsedExercises = [];
          }
        }

        return {
          ...d,
          exercises: parsedExercises,
        };
      }));
    }
    setLoading(false);
  }, [weekStr]);

  useEffect(() => { fetchDays(); }, [fetchDays]);

  const upsertDay = async (dayOfWeek: number, updates: Partial<PlanDay>) => {
    if (!user || !isAdmin) return;

    const existing = days.find(d => d.day_of_week === dayOfWeek);
    const payload = {
      week_start: weekStr,
      day_of_week: dayOfWeek,
      title: updates.title ?? existing?.title ?? 'Rest Day',
      exercises: JSON.stringify(updates.exercises ?? existing?.exercises ?? []),
      notes: updates.notes ?? existing?.notes ?? null,
      created_by: user.id,
    };

    if (existing?.id) {
      const { error } = await supabase
        .from('weekly_plan_days' as any)
        .update({ 
          title: payload.title, 
          exercises: payload.exercises, 
          notes: payload.notes 
        } as any)
        .eq('id', existing.id);
      if (error) { toast.error('Failed to update day'); return; }
    } else {
      const { error } = await supabase
        .from('weekly_plan_days' as any)
        .insert(payload as any);
      if (error) { toast.error('Failed to save day'); return; }
    }

    await fetchDays();
  };

  const deleteDay = async (dayOfWeek: number) => {
    if (!user || !isAdmin) return;
    const existing = days.find(d => d.day_of_week === dayOfWeek);
    if (!existing?.id) return;

    const { error } = await supabase
      .from('weekly_plan_days' as any)
      .delete()
      .eq('id', existing.id);
    if (error) { toast.error('Failed to delete'); return; }
    await fetchDays();
  };

  const getDayData = (dayOfWeek: number): PlanDay => {
    return days.find(d => d.day_of_week === dayOfWeek) || {
      week_start: weekStr,
      day_of_week: dayOfWeek,
      title: 'Rest Day',
      exercises: [],
      notes: null,
    };
  };

  return { days, loading, upsertDay, deleteDay, getDayData, refetch: fetchDays };
}
