import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNutrition } from '@/hooks/useNutrition';
import { useUserSettings } from '@/hooks/useUserSettings';
import { useFastingSessions } from '@/hooks/useFastingSessions';
import { useCycleTracker } from '@/hooks/useCycleTracker';
import { DailyHabits } from '@/components/nutrition/DailyHabits';
import { DEFAULT_RING_HABITS } from '@/types/workoutPrograms';

export function TodaysHabitsSection() {
  const { user } = useAuth();
  const today = new Date();
  const dateStr = format(today, 'yyyy-MM-dd');

  const nutrition = useNutrition(today);
  const { settings: userSettings } = useUserSettings();
  const { getSessionsForDate } = useFastingSessions();
  const { entries: cycleEntries, settings: cycleSettings } = useCycleTracker();

  const ringHabits = userSettings?.ring_habits || DEFAULT_RING_HABITS;
  const fastCompleted = getSessionsForDate(today).length > 0;
  const cycleLogged = cycleEntries.some((e) => e.date === dateStr);
  const proteinMet = (nutrition.entry?.protein_logged || 0) >= (nutrition.entry?.protein_goal || 120);
  const hydrationMet = (nutrition.entry?.hydration_logged || 0) >= (nutrition.entry?.hydration_goal || 64);

  const [workoutCompleted, setWorkoutCompleted] = useState(false);

  const checkWorkout = useCallback(async () => {
    if (!user) return;
    const start = dateStr + 'T00:00:00';
    const end = dateStr + 'T23:59:59.999';
    const [{ data: planLogs }, { data: workoutLogs }] = await Promise.all([
      supabase.from('weekly_plan_logs').select('id').eq('user_id', user.id).gte('completed_at', start).lt('completed_at', end).limit(1),
      supabase.from('workout_completions').select('id').eq('user_id', user.id).gte('completed_at', start).lt('completed_at', end).limit(1),
    ]);
    setWorkoutCompleted((planLogs?.length || 0) > 0 || (workoutLogs?.length || 0) > 0);
  }, [user, dateStr]);

  useEffect(() => {
    checkWorkout();
  }, [checkWorkout]);

  return (
    <DailyHabits
      entry={nutrition.entry}
      toggleHabit={nutrition.toggleHabit}
      fastCompleted={fastCompleted}
      cycleLogged={cycleLogged}
      cycleEnabled={!!cycleSettings && !cycleSettings.hide_cycle_markers}
      proteinMet={proteinMet}
      hydrationMet={hydrationMet}
      workoutCompleted={workoutCompleted}
      ringHabits={ringHabits}
    />
  );
}