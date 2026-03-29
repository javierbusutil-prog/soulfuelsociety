import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock, Dumbbell, BookOpen } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const FAKE_WORKOUTS = [
  { label: 'A) Barbell Back Squat', detail: '4 × 8 @ RPE 7' },
  { label: 'B) Romanian Deadlift', detail: '3 × 10 tempo 3-1-1' },
  { label: 'C) Walking Lunges', detail: '3 × 12 each leg' },
];

export function CoachingProgramCard() {
  const { isPaidMember, user } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [hasSupplemental, setHasSupplemental] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !isPaidMember) {
      setLoading(false);
      return;
    }
    const fetch = async () => {
      const { data: prof } = await supabase
        .from('profiles')
        .select('selected_plan')
        .eq('id', user.id)
        .single();
      const plan = prof?.selected_plan || null;
      setSelectedPlan(plan);

      if (plan === 'in-person') {
        const { data: supp } = await supabase
          .from('coaching_programs')
          .select('id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .eq('plan_type', 'inperson_supplemental' as any)
          .limit(1)
          .maybeSingle();
        setHasSupplemental(!!supp);
      }
      setLoading(false);
    };
    fetch();
  }, [user, isPaidMember]);

  if (!isPaidMember) {
    // Free users see a locked preview
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

  if (loading) return null;

  // In-person members: only show supplemental card if they have one
  if (selectedPlan === 'in-person') {
    if (!hasSupplemental) return null;

    return (
      <Link to="/workouts" className="block">
        <Card className="p-4 space-y-3 hover:shadow-md transition-shadow border-accent/30 bg-accent/5">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-accent-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Between-session work</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Your coach has added a supplemental program to support your training between sessions.
          </p>
          <Button size="sm" variant="outline" className="w-full text-xs">
            View program
          </Button>
        </Card>
      </Link>
    );
  }

  // Online members: standard card
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
