import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { addDays, differenceInDays, isSameDay, parseISO, startOfDay } from 'date-fns';
import { toast } from '@/hooks/use-toast';

export interface CycleEntry {
  id: string;
  user_id: string;
  date: string;
  is_period: boolean;
  flow_level: 'light' | 'medium' | 'heavy' | null;
  symptoms: string[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CycleSettings {
  id: string;
  user_id: string;
  cycle_length_days: number;
  period_length_days: number;
  prediction_enabled: boolean;
  reminder_enabled: boolean;
  reminder_time: string;
  hide_cycle_markers: boolean;
  created_at: string;
  updated_at: string;
}

export const SYMPTOM_OPTIONS = [
  'Cramps', 'Bloating', 'Headache', 'Fatigue', 'Mood swings',
  'Back pain', 'Breast tenderness', 'Acne', 'Nausea', 'Insomnia',
];

export function useCycleTracker() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<CycleEntry[]>([]);
  const [settings, setSettings] = useState<CycleSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchEntries = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('cycle_entries')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false });
    if (data) setEntries(data as unknown as CycleEntry[]);
  }, [user]);

  const fetchSettings = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('cycle_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    if (data) setSettings(data as unknown as CycleSettings);
  }, [user]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchEntries(), fetchSettings()]);
      setLoading(false);
    };
    load();
  }, [fetchEntries, fetchSettings]);

  const togglePeriodDay = async (
    date: string,
    flowLevel?: 'light' | 'medium' | 'heavy',
    symptoms?: string[],
    notes?: string
  ) => {
    if (!user) return;

    const existing = entries.find(e => e.date === date);
    if (existing) {
      // Remove entry
      await supabase.from('cycle_entries').delete().eq('id', existing.id);
    } else {
      // Add entry
      await supabase.from('cycle_entries').insert({
        user_id: user.id,
        date,
        is_period: true,
        flow_level: flowLevel || 'medium',
        symptoms: symptoms || [],
        notes: notes || null,
      } as any);
    }
    await fetchEntries();
  };

  const updateEntry = async (
    id: string,
    updates: { flow_level?: string; symptoms?: string[]; notes?: string }
  ) => {
    await supabase.from('cycle_entries').update(updates as any).eq('id', id);
    await fetchEntries();
  };

  const updateSettings = async (updates: Partial<CycleSettings>) => {
    if (!user) return;
    
    if (settings) {
      await supabase
        .from('cycle_settings')
        .update(updates as any)
        .eq('user_id', user.id);
    } else {
      await supabase
        .from('cycle_settings')
        .insert({ user_id: user.id, ...updates } as any);
    }
    await fetchSettings();
  };

  const getEntriesForDate = (date: Date): CycleEntry | undefined => {
    const dateStr = date.toISOString().split('T')[0];
    return entries.find(e => e.date === dateStr);
  };

  // Predict next period based on most recent period start
  const prediction = useMemo(() => {
    if (!settings?.prediction_enabled) return null;
    
    // Find period "starts" - first day of each period cluster
    const periodDates = entries
      .filter(e => e.is_period)
      .map(e => e.date)
      .sort();

    if (periodDates.length === 0) return null;

    // Find the most recent period start (gap of >3 days from previous entry)
    const periodStarts: string[] = [];
    for (let i = 0; i < periodDates.length; i++) {
      if (i === 0) {
        periodStarts.push(periodDates[i]);
      } else {
        const daysBetween = differenceInDays(
          parseISO(periodDates[i]),
          parseISO(periodDates[i - 1])
        );
        if (daysBetween > 3) {
          periodStarts.push(periodDates[i]);
        }
      }
    }

    if (periodStarts.length === 0) return null;

    const lastPeriodStart = parseISO(periodStarts[periodStarts.length - 1]);
    const cycleLength = settings.cycle_length_days || 28;
    const periodLength = settings.period_length_days || 5;

    const nextPeriodStart = addDays(lastPeriodStart, cycleLength);
    const nextPeriodEnd = addDays(nextPeriodStart, periodLength - 1);

    return {
      nextPeriodStart,
      nextPeriodEnd,
      lastPeriodStart,
    };
  }, [entries, settings]);

  const isPredictedPeriodDay = (date: Date): boolean => {
    if (!prediction) return false;
    const d = startOfDay(date);
    const start = startOfDay(prediction.nextPeriodStart);
    const end = startOfDay(prediction.nextPeriodEnd);
    return d >= start && d <= end;
  };

  return {
    entries,
    settings,
    loading,
    togglePeriodDay,
    updateEntry,
    updateSettings,
    getEntriesForDate,
    prediction,
    isPredictedPeriodDay,
    refetch: fetchEntries,
  };
}
