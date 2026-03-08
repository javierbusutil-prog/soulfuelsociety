import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Droplets, Flame, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DailyNutrition } from '@/hooks/useNutrition';

type ManualHabitField = 'protein_priority' | 'whole_foods_focus' | 'electrolyte_taken' | 'protein_goal_checked' | 'hydration_goal_checked' | 'fast_checked' | 'cycle_checked';

interface Props {
  entry: DailyNutrition | null;
  toggleHabit: (field: ManualHabitField) => void;
  fastCompleted: boolean;
  cycleLogged: boolean;
  cycleEnabled: boolean;
  proteinMet: boolean;
  hydrationMet: boolean;
}

interface HabitRowProps {
  label: string;
  done: boolean;
  onToggle: () => void;
  icon: React.ReactNode;
}

function HabitRow({ label, done, onToggle, icon }: HabitRowProps) {
  return (
    <button
      onClick={onToggle}
      aria-pressed={done}
      aria-label={`${label}: ${done ? 'complete' : 'incomplete'}`}
      className={cn(
        'flex items-center gap-3 w-full px-3 py-3 rounded-xl transition-colors duration-200',
        done ? 'bg-success/10' : 'bg-secondary/50 hover:bg-secondary',
      )}
    >
      <div className={cn(
        'w-7 h-7 rounded-full flex items-center justify-center border-2 transition-colors duration-200 shrink-0',
        done ? 'border-success bg-success text-success-foreground' : 'border-border bg-background'
      )}>
        {done && <Check className="w-4 h-4" />}
      </div>
      <span className="flex items-center gap-2 text-sm font-medium">
        {icon}
        {label}
      </span>
    </button>
  );
}

export function DailyHabits({ entry, toggleHabit, fastCompleted, cycleLogged, cycleEnabled, proteinMet, hydrationMet }: Props) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-sans font-semibold tracking-normal">Today's Habits</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <HabitRow
          label="Protein Goal"
          done={proteinMet || (entry?.protein_goal_checked ?? false)}
          onToggle={() => toggleHabit('protein_goal_checked')}
          icon={<span className="text-base">🥩</span>}
        />
        <HabitRow
          label="Hydration Goal"
          done={hydrationMet || (entry?.hydration_goal_checked ?? false)}
          onToggle={() => toggleHabit('hydration_goal_checked')}
          icon={<Droplets className="w-4 h-4 text-sky-500" />}
        />
        <HabitRow
          label="Whole Foods Focus"
          done={entry?.whole_foods_focus || false}
          onToggle={() => toggleHabit('whole_foods_focus')}
          icon={<span className="text-base">🥗</span>}
        />
        <HabitRow
          label="Fast Completed"
          done={fastCompleted || (entry?.fast_checked ?? false)}
          onToggle={() => toggleHabit('fast_checked')}
          icon={<Flame className="w-4 h-4 text-accent" />}
        />
        {cycleEnabled && (
          <HabitRow
            label="Cycle Logged"
            done={cycleLogged || (entry?.cycle_checked ?? false)}
            onToggle={() => toggleHabit('cycle_checked')}
            icon={<Moon className="w-4 h-4 text-pink-400" />}
          />
        )}
      </CardContent>
    </Card>
  );
}
