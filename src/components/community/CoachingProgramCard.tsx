import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock, Dumbbell } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const FAKE_WORKOUTS = [
  { label: 'A) Barbell Back Squat', detail: '4 × 8 @ RPE 7' },
  { label: 'B) Romanian Deadlift', detail: '3 × 10 tempo 3-1-1' },
  { label: 'C) Walking Lunges', detail: '3 × 12 each leg' },
];

export function CoachingProgramCard() {
  const { isPaidMember } = useAuth();

  if (isPaidMember) {
    // Paid users see a live card linking to their workouts
    return (
      <Link to="/workouts" className="block">
        <Card className="p-4 space-y-3 hover:shadow-md transition-shadow border-primary/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Dumbbell className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Your coaching program</h3>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            View your personalized workouts and weekly plan from your coach.
          </p>
          <Button size="sm" variant="outline" className="w-full text-xs">
            Go to workouts
          </Button>
        </Card>
      </Link>
    );
  }

  // Free users see a locked preview
  return (
    <Card className="p-4 space-y-3 relative overflow-hidden">
      {/* Lock icon */}
      <div className="absolute top-3 right-3">
        <Lock className="w-4 h-4 text-muted-foreground/60" />
      </div>

      <div className="flex items-center gap-2">
        <Dumbbell className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">Your coaching program</h3>
      </div>

      {/* Blurred fake workout rows */}
      <div className="relative">
        <div className="space-y-2 select-none pointer-events-none" style={{ filter: 'blur(4px)' }} aria-hidden="true">
          {FAKE_WORKOUTS.map((w, i) => (
            <div key={i} className="flex items-center justify-between bg-muted/40 rounded-lg px-3 py-2.5">
              <span className="text-sm font-medium text-foreground">{w.label}</span>
              <span className="text-xs text-muted-foreground">{w.detail}</span>
            </div>
          ))}
        </div>
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/80 pointer-events-none" />
      </div>

      <Button asChild size="sm" className="w-full text-xs">
        <Link to="/upgrade">Unlock with a paid plan</Link>
      </Button>
    </Card>
  );
}
