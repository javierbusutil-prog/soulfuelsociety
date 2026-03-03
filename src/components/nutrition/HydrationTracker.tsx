import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Pencil, Check, Droplets, ChevronUp } from 'lucide-react';
import type { DailyNutrition } from '@/hooks/useNutrition';

interface Props {
  entry: DailyNutrition | null;
  addWater: (oz: number) => void;
  toggleHabit: (field: 'protein_priority' | 'whole_foods_focus' | 'electrolyte_taken') => void;
  setGoal: (field: 'protein_goal' | 'hydration_goal', value: number) => void;
}

const quickAdds = [8, 16, 20];

export function HydrationTracker({ entry, addWater, toggleHabit, setGoal }: Props) {
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState('');
  const [inputValue, setInputValue] = useState('');

  const goal = entry?.hydration_goal || 64;
  const logged = entry?.hydration_logged || 0;
  const pct = Math.min(100, Math.round((logged / goal) * 100));

  const currentInput = inputValue === '' ? 0 : parseInt(inputValue) || 0;

  const handleAdd = () => {
    if (currentInput > 0) {
      addWater(currentInput);
      setInputValue('');
    }
  };

  const handleIncrement = () => {
    const next = currentInput + 1;
    setInputValue(String(next));
  };

  const saveGoal = () => {
    const val = parseInt(goalInput);
    if (val > 0) setGoal('hydration_goal', val);
    setEditingGoal(false);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-sans font-semibold tracking-normal flex items-center gap-2">
            <Droplets className="w-4 h-4 text-sky-500" />
            Hydration
          </CardTitle>
          {editingGoal ? (
            <div className="flex items-center gap-1.5">
              <Input
                type="number"
                value={goalInput}
                onChange={e => setGoalInput(e.target.value)}
                className="w-20 h-7 text-xs"
                placeholder={String(goal)}
                autoFocus
                aria-label="Hydration goal in ounces"
              />
              <Button size="icon-sm" variant="ghost" onClick={saveGoal} aria-label="Save goal">
                <Check className="w-3.5 h-3.5" />
              </Button>
            </div>
          ) : (
            <button
              onClick={() => { setGoalInput(String(goal)); setEditingGoal(true); }}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Edit hydration goal"
            >
              <Pencil className="w-3 h-3" />
              {goal}oz goal
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex justify-between text-sm mb-1.5">
            <span className="font-medium">{logged}oz</span>
            <span className="text-muted-foreground">{pct}%</span>
          </div>
          <Progress value={pct} className="h-2.5" />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center border border-input rounded-xl overflow-hidden flex-1">
            <Input
              type="number"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              placeholder="0"
              className="h-11 text-center text-sm border-0 rounded-none px-2 focus-visible:ring-0 focus-visible:ring-offset-0 flex-1"
              aria-label="Water amount in ounces"
              onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
            />
            <Button
              variant="ghost"
              size="sm"
              className="h-11 w-11 min-w-11 px-0 rounded-none border-l border-input"
              onClick={handleIncrement}
              aria-label="Increment by 1"
            >
              <ChevronUp className="w-5 h-5" />
            </Button>
          </div>
          <span className="text-xs text-muted-foreground font-medium">oz</span>
          <Button
            size="sm"
            className="h-11 px-4"
            onClick={handleAdd}
            disabled={currentInput <= 0}
          >
            Add
          </Button>
        </div>
        <div className="flex items-center justify-between pt-1">
          <label htmlFor="electrolyte-toggle" className="text-sm text-muted-foreground">Electrolytes taken</label>
          <Switch
            id="electrolyte-toggle"
            checked={entry?.electrolyte_taken || false}
            onCheckedChange={() => toggleHabit('electrolyte_taken')}
          />
        </div>
      </CardContent>
    </Card>
  );
}
