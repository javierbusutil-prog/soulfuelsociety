import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

interface MealLog {
  id: string;
  meal_label: string;
  has_protein: boolean;
  has_fiber: boolean;
  has_healthy_fats: boolean;
  has_carbs: boolean;
}

const MEAL_LABELS = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

const COMPONENTS = [
  { key: 'has_protein' as const, label: 'Protein', emoji: '🥩' },
  { key: 'has_fiber' as const, label: 'Fiber/Veg', emoji: '🥦' },
  { key: 'has_healthy_fats' as const, label: 'Healthy Fats', emoji: '🥑' },
  { key: 'has_carbs' as const, label: 'Carbs', emoji: '🍠' },
];

interface Props {
  selectedDate: Date;
}

export function MealStructureTracker({ selectedDate }: Props) {
  const { user } = useAuth();
  const [meals, setMeals] = useState<MealLog[]>([]);
  const [loading, setLoading] = useState(true);
  const dateStr = format(selectedDate, 'yyyy-MM-dd');

  const fetchMeals = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('meal_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', dateStr)
      .order('created_at', { ascending: true });
    if (data) setMeals(data as unknown as MealLog[]);
    setLoading(false);
  }, [user, dateStr]);

  useEffect(() => { fetchMeals(); }, [fetchMeals]);

  const addMeal = async () => {
    if (!user) return;
    const usedLabels = meals.map(m => m.meal_label);
    const nextLabel = MEAL_LABELS.find(l => !usedLabels.includes(l)) || `Meal ${meals.length + 1}`;
    await supabase.from('meal_logs').insert({
      user_id: user.id,
      date: dateStr,
      meal_label: nextLabel,
    } as any);
    fetchMeals();
  };

  const toggleComponent = async (mealId: string, key: string, current: boolean) => {
    await supabase.from('meal_logs').update({ [key]: !current } as any).eq('id', mealId);
    setMeals(prev => prev.map(m => m.id === mealId ? { ...m, [key]: !current } : m));
  };

  const removeMeal = async (mealId: string) => {
    await supabase.from('meal_logs').delete().eq('id', mealId);
    setMeals(prev => prev.filter(m => m.id !== mealId));
  };

  const totalComponents = meals.reduce((sum, m) => {
    return sum + (m.has_protein ? 1 : 0) + (m.has_fiber ? 1 : 0) + (m.has_healthy_fats ? 1 : 0) + (m.has_carbs ? 1 : 0);
  }, 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-sans font-semibold tracking-normal">Meal Structure</CardTitle>
          <span className="text-xs text-muted-foreground">{totalComponents} components logged</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {meals.map((meal) => (
          <div key={meal.id} className="rounded-xl bg-secondary/40 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{meal.meal_label}</span>
              <button
                onClick={() => removeMeal(meal.id)}
                className="text-muted-foreground hover:text-destructive transition-colors p-1"
                aria-label={`Remove ${meal.meal_label}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex gap-2 flex-wrap">
              {COMPONENTS.map(comp => {
                const active = meal[comp.key];
                return (
                  <button
                    key={comp.key}
                    onClick={() => toggleComponent(meal.id, comp.key, active)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border',
                      active
                        ? 'bg-success/15 border-success/30 text-foreground'
                        : 'bg-background border-border text-muted-foreground hover:border-muted-foreground/40'
                    )}
                  >
                    <span>{comp.emoji}</span>
                    {comp.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {meals.length === 0 && !loading && (
          <p className="text-sm text-muted-foreground text-center py-3">
            Tap + to log your first meal of the day
          </p>
        )}

        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={addMeal}
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Add Meal
        </Button>
      </CardContent>
    </Card>
  );
}
