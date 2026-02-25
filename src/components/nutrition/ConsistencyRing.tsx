import { Card, CardContent } from '@/components/ui/card';
import { Flame } from 'lucide-react';

interface Props {
  proteinMet: boolean;
  hydrationMet: boolean;
  fastCompleted: boolean;
  cycleLogged: boolean;
  cycleEnabled: boolean;
  streak: number;
}

export function ConsistencyRing({ proteinMet, hydrationMet, fastCompleted, cycleLogged, cycleEnabled, streak }: Props) {
  const segments = [
    { done: proteinMet, label: 'Protein' },
    { done: hydrationMet, label: 'Hydration' },
    { done: fastCompleted, label: 'Fast' },
  ];
  if (cycleEnabled) segments.push({ done: cycleLogged, label: 'Cycle' });

  const completed = segments.filter(s => s.done).length;
  const total = segments.length;
  const pct = Math.round((completed / total) * 100);

  const radius = 52;
  const stroke = 8;
  const circumference = 2 * Math.PI * radius;

  return (
    <Card className="overflow-hidden">
      <CardContent className="flex items-center gap-6 py-5 px-6">
        {/* Ring */}
        <div className="relative w-28 h-28 shrink-0">
          <svg viewBox="0 0 128 128" className="w-full h-full -rotate-90" aria-hidden="true">
            <circle
              cx="64" cy="64" r={radius}
              fill="none"
              stroke="hsl(var(--secondary))"
              strokeWidth={stroke}
            />
            <circle
              cx="64" cy="64" r={radius}
              fill="none"
              stroke="hsl(var(--success))"
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference - (circumference * pct) / 100}
              className="transition-all duration-700"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-semibold">{pct}%</span>
            <span className="text-[10px] text-muted-foreground">today</span>
          </div>
        </div>

        {/* Streak + segments */}
        <div className="flex-1 space-y-3">
          {streak > 0 && (
            <div className="flex items-center gap-1.5 text-sm font-medium text-accent" aria-label={`${streak} day streak`}>
              <Flame className="w-4 h-4" />
              {streak} day streak
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {segments.map(s => (
              <span
                key={s.label}
                className={`text-[11px] px-2.5 py-1 rounded-full font-medium transition-colors ${
                  s.done
                    ? 'bg-success/15 text-success'
                    : 'bg-secondary text-muted-foreground'
                }`}
              >
                {s.label}
              </span>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
