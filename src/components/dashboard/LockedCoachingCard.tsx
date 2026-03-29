import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock, Dumbbell } from 'lucide-react';

const FAKE_WORKOUTS = [
  { label: 'A) Barbell Back Squat', detail: '4 × 8 @ RPE 7' },
  { label: 'B) Romanian Deadlift', detail: '3 × 10 tempo 3-1-1' },
  { label: 'C) Walking Lunges', detail: '3 × 12 each leg' },
];

export function LockedCoachingCard() {
  return (
    <Card className="p-4 space-y-3 relative overflow-hidden">
      <div className="absolute top-3 right-3">
        <Lock className="w-4 h-4 text-muted-foreground/60" />
      </div>
      <div className="flex items-center gap-2">
        <Dumbbell className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">Your coaching program</h3>
      </div>
      <div className="relative">
        <div className="space-y-2 select-none pointer-events-none" style={{ filter: 'blur(4px)' }} aria-hidden="true">
          {FAKE_WORKOUTS.map((w, i) => (
            <div key={i} className="flex items-center justify-between bg-muted/40 rounded-lg px-3 py-2.5">
              <span className="text-sm font-medium text-foreground">{w.label}</span>
              <span className="text-xs text-muted-foreground">{w.detail}</span>
            </div>
          ))}
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/80 pointer-events-none" />
      </div>
      <Button asChild size="sm" className="w-full text-xs">
        <Link to="/upgrade">Unlock with a paid plan</Link>
      </Button>
    </Card>
  );
}
