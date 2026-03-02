import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface MacroTargets {
  id: string;
  calorie_target: number;
  protein_target_g: number;
  carb_target_g: number;
  fat_target_g: number;
  fiber_target_g: number;
  water_target_oz: number;
  goal: string;
  activity_level: string;
  method_used: string;
  cycle_adjustment_enabled: boolean;
  current_cycle_phase: string;
  cycle_adjustment_percentage: number;
  updated_at: string;
}

export function useMacroTargets() {
  const { user } = useAuth();
  const [targets, setTargets] = useState<MacroTargets | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    fetchTargets();
  }, [user]);

  const fetchTargets = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('macro_targets' as any)
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!error && data) {
      setTargets(data as any);
    }
    setLoading(false);
  };

  const saveTargets = async (values: Omit<MacroTargets, 'id' | 'updated_at'>) => {
    if (!user) return;

    const payload = { ...values, user_id: user.id };

    if (targets) {
      const { error } = await supabase
        .from('macro_targets' as any)
        .update(payload as any)
        .eq('user_id', user.id);
      if (error) { toast.error('Could not save targets'); return; }
    } else {
      const { error } = await supabase
        .from('macro_targets' as any)
        .insert(payload as any);
      if (error) { toast.error('Could not save targets'); return; }
    }

    toast.success('Targets saved!');
    await fetchTargets();
  };

  return { targets, loading, saveTargets, refetch: fetchTargets };
}
