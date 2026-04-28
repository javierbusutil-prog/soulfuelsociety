import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, ArrowRight, MessageCircle, Dumbbell } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { OnlineProgramCard } from '@/components/dashboard/OnlineProgramCard';
import type { WorkoutProgram } from '@/types/workoutPrograms';

interface DailyDosePost {
  id: string;
  title: string;
  coach_note: string | null;
  cover_image_url: string | null;
  published_date: string;
}

export default function Home() {
  const navigate = useNavigate();
  const { user, profile, isPaidMember } = useAuth();

  const [dailyDose, setDailyDose] = useState<DailyDosePost | null>(null);
  const [freePrograms, setFreePrograms] = useState<WorkoutProgram[]>([]);

  const firstName = (profile?.full_name || '').trim().split(' ')[0] || 'there';

  useEffect(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    supabase
      .from('daily_dose_posts')
      .select('id, title, coach_note, cover_image_url, published_date')
      .eq('is_published', true)
      .lte('published_date', today)
      .order('published_date', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setDailyDose(data as DailyDosePost | null));
  }, []);

  useEffect(() => {
    if (isPaidMember) return;
    supabase
      .from('workout_programs')
      .select('*')
      .eq('published', true)
      .eq('access_type', 'free' as any)
      .order('created_at', { ascending: false })
      .then(({ data }) => setFreePrograms((data || []) as unknown as WorkoutProgram[]));
  }, [isPaidMember]);

  const previewText = (() => {
    if (!dailyDose?.coach_note) return null;
    const stripped = dailyDose.coach_note.replace(/\s+/g, ' ').trim();
    return stripped.length > 100 ? stripped.slice(0, 100) + '…' : stripped;
  })();

  return (
    <AppLayout title="Home">
      <div className="px-4 pt-6 pb-8 max-w-2xl mx-auto space-y-8">
        {/* Welcome header */}
        <header>
          <h1 className="font-display text-3xl tracking-editorial leading-tight">
            Hey {firstName} <span aria-hidden>👋</span>
          </h1>
          <p className="text-muted-foreground mt-1">Here's your Soul Fuel dashboard.</p>
        </header>

        {/* Today's Daily Dose */}
        <section aria-labelledby="daily-dose-heading">
          <h2 id="daily-dose-heading" className="font-display text-xl tracking-editorial mb-3">
            Today's Daily Dose
          </h2>
          <Card>
            {dailyDose ? (
              <>
                <CardHeader>
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="w-4 h-4 text-accent" />
                    <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">
                      {format(new Date(dailyDose.published_date), 'MMM d')}
                    </Badge>
                  </div>
                  <CardTitle>{dailyDose.title}</CardTitle>
                  {previewText && (
                    <CardDescription className="pt-1">{previewText}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <Button onClick={() => navigate('/daily-dose')} className="w-full sm:w-auto">
                    View Today's Dose
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </CardContent>
              </>
            ) : (
              <CardContent className="py-8 text-center text-muted-foreground">
                Check back soon for today's dose.
              </CardContent>
            )}
          </Card>
        </section>

        {/* Programs section: paid vs free */}
        {isPaidMember ? (
          <section aria-labelledby="my-program-heading">
            <div className="flex items-center justify-between mb-3">
              <h2 id="my-program-heading" className="font-display text-xl tracking-editorial">
                My Program
              </h2>
              <Button variant="ghost" size="sm" onClick={() => navigate('/workouts')}>
                Continue Training
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
            <OnlineProgramCard />
          </section>
        ) : (
          freePrograms.length > 0 && (
            <section aria-labelledby="free-programs-heading">
              <h2 id="free-programs-heading" className="font-display text-xl tracking-editorial mb-3">
                Free Programs
              </h2>
              <div className="space-y-3">
                {freePrograms.map((p) => (
                  <Card key={p.id}>
                    <CardHeader>
                      <CardTitle className="text-lg">{p.title}</CardTitle>
                      {p.description && (
                        <CardDescription>{p.description}</CardDescription>
                      )}
                      <div className="flex items-center gap-2 pt-2 text-xs text-muted-foreground">
                        <Dumbbell className="w-3.5 h-3.5" />
                        <span>{p.weeks} weeks · {p.frequency_per_week}x / week</span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Button onClick={() => navigate('/workouts')} variant="outline" className="w-full sm:w-auto">
                        Start Program
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )
        )}

        {/* Coach card for paid, upgrade nudge for free */}
        {isPaidMember ? (
          <section aria-labelledby="coach-heading">
            <h2 id="coach-heading" className="sr-only">Your Coach</h2>
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-primary" />
                  <CardTitle className="text-lg">Message your coach</CardTitle>
                </div>
                <CardDescription>Questions, check-ins, or wins to share — your coach is here.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => navigate('/coach')} variant="outline" className="w-full sm:w-auto">
                  Open Coach Chat
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          </section>
        ) : (
          <section aria-labelledby="upgrade-heading">
            <h2 id="upgrade-heading" className="sr-only">Upgrade</h2>
            <Card className="bg-secondary/40 border-secondary">
              <CardContent className="py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <p className="text-sm sm:text-base text-foreground">
                  Ready for a custom program built just for you?
                </p>
                <Button onClick={() => navigate('/upgrade')} variant="accent">
                  Learn more
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          </section>
        )}
      </div>
    </AppLayout>
  );
}