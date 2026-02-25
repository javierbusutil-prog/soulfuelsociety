import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, subDays } from 'date-fns';
import type { DailyNutrition } from './useNutrition';

export function useNutritionTrends(days: number = 7) {
  const { user } = useAuth();
  const [data, setData] = useState<DailyNutrition[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const startDate = format(subDays(new Date(), days - 1), 'yyyy-MM-dd');
    const endDate = format(new Date(), 'yyyy-MM-dd');

    const { data: rows } = await supabase
      .from('daily_nutrition')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true });

    setData((rows || []) as unknown as DailyNutrition[]);
    setLoading(false);
  }, [user, days]);

  useEffect(() => { fetch(); }, [fetch]);

  // Fill in missing days with nulls for the chart
  const filledData = (() => {
    const result: (DailyNutrition | null)[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const dateStr = format(subDays(new Date(), i), 'yyyy-MM-dd');
      const entry = data.find(d => d.date === dateStr) || null;
      result.push(entry);
    }
    return result;
  })();

  const labels = (() => {
    const result: string[] = [];
    for (let i = days - 1; i >= 0; i--) {
      result.push(format(subDays(new Date(), i), 'EEE'));
    }
    return result;
  })();

  return { data: filledData, labels, loading, refetch: fetch };
}
