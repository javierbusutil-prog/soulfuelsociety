import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Droplets, Flame, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DailyNutrition } from '@/hooks/useNutrition';

interface Props {
  entry: DailyNutrition | null;
  toggleHabit: (field: 'protein_priority' | 'whole_foods_focus' | 'electrolyte_taken') => void;
  fastCompleted: boolean;
  cycleLogged: boolean;
  cycleEnabled: boolean;
  proteinMet: boolean;
  hydrationMet: boolean;
}

interface HabitRowProps {
  label: string;
  done: boolean;
  onToggle?: () => void;
  icon: React.ReactNode;
  synced?: boolean;
}

function HabitRow({ label, done, onToggle, icon, synced }: HabitRowProps) {
  return (
    <button
      onClick={onToggle}
      disabled={synced}
      aria-pressed={done}
      aria-label={`${label}: ${done ? 'complete' : 'incomplete'}`}
      className={cn(
        'flex items-center gap-3 w-full px-3 py-3 rounded-xl transition-colors duration-200',
        done ? 'bg-success/10' : 'bg-secondary/50 hover:bg-secondary',
        synced && 'cursor-default opacity-80'
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
      {synced && <span className="ml-auto text-[10px] text-muted-foreground uppercase tracking-wide">Auto</span>}
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
          label="Protein Priority"
          done={entry?.protein_priority || false}
          onToggle={() => toggleHabit('protein_priority')}
          icon={<span className="text-base">🥩</span>}
        />
        <HabitRow
          label="Hydration Goal"
          done={hydrationMet}
          icon={<Droplets className="w-4 h-4 text-sky-500" />}
          synced
        />
        <HabitRow
          label="Whole Foods Focus"
          done={entry?.whole_foods_focus || false}
          onToggle={() => toggleHabit('whole_foods_focus')}
          icon={<span className="text-base">🥗</span>}
        />
        <HabitRow
          label="Fast Completed"
          done={fastCompleted}
          icon={<Flame className="w-4 h-4 text-accent" />}
          synced
        />
        {cycleEnabled && (
          <HabitRow
            label="Cycle Logged"
            done={cycleLogged}
            icon={<Moon className="w-4 h-4 text-pink-400" />}
            synced
          />
        )}
      </CardContent>
    </Card>
  );
}
