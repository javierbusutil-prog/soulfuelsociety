import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Pencil, Check } from 'lucide-react';
import type { DailyNutrition } from '@/hooks/useNutrition';

interface Props {
  entry: DailyNutrition | null;
  addProtein: (grams: number) => void;
  setGoal: (field: 'protein_goal' | 'hydration_goal', value: number) => void;
}

const quickAdds = [20, 30, 40];

export function ProteinTracker({ entry, addProtein, setGoal }: Props) {
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState('');

  const goal = entry?.protein_goal || 120;
  const logged = entry?.protein_logged || 0;
  const pct = Math.min(100, Math.round((logged / goal) * 100));

  const saveGoal = () => {
    const val = parseInt(goalInput);
    if (val > 0) setGoal('protein_goal', val);
    setEditingGoal(false);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-sans font-semibold tracking-normal">Protein</CardTitle>
          {editingGoal ? (
            <div className="flex items-center gap-1.5">
              <Input
                type="number"
                value={goalInput}
                onChange={e => setGoalInput(e.target.value)}
                className="w-20 h-7 text-xs"
                placeholder={String(goal)}
                autoFocus
                aria-label="Protein goal in grams"
              />
              <Button size="icon-sm" variant="ghost" onClick={saveGoal} aria-label="Save goal">
                <Check className="w-3.5 h-3.5" />
              </Button>
            </div>
          ) : (
            <button
              onClick={() => { setGoalInput(String(goal)); setEditingGoal(true); }}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Edit protein goal"
            >
              <Pencil className="w-3 h-3" />
              {goal}g goal
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex justify-between text-sm mb-1.5">
            <span className="font-medium">{logged}g</span>
            <span className="text-muted-foreground">{pct}%</span>
          </div>
          <Progress value={pct} className="h-2.5" />
        </div>
        <div className="flex gap-2">
          {quickAdds.map(g => (
            <Button
              key={g}
              variant="outline"
              size="sm"
              onClick={() => addProtein(g)}
              className="flex-1 text-xs"
              aria-label={`Add ${g} grams of protein`}
            >
              +{g}g
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
