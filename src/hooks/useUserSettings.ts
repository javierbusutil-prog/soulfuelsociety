import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { UserSettings } from '@/types/workoutPrograms';

export function useUserSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    if (!user) {
      setSettings(null);
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (data) {
      setSettings(data as unknown as UserSettings);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSettings = async (updates: Partial<UserSettings>) => {
    if (!user) return;

    if (settings) {
      // Update existing
      const { data, error } = await supabase
        .from('user_settings')
        .update(updates as any)
        .eq('user_id', user.id)
        .select()
        .single();

      if (data && !error) {
        setSettings(data as unknown as UserSettings);
      }
    } else {
      // Create new
      const { data, error } = await supabase
        .from('user_settings')
        .insert({
          user_id: user.id,
          ...updates,
        } as any)
        .select()
        .single();

      if (data && !error) {
        setSettings(data as unknown as UserSettings);
      }
    }
  };

  return {
    settings,
    loading,
    updateSettings,
    refetch: fetchSettings,
  };
}
