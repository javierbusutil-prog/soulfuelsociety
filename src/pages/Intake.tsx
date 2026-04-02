import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Dumbbell, Heart, Zap, Activity, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

const FITNESS_GOALS = [
  { value: 'build_muscle', label: 'Build Muscle', icon: Dumbbell },
  { value: 'lose_weight', label: 'Lose Weight', icon: Activity },
  { value: 'improve_endurance', label: 'Improve Endurance', icon: Zap },
  { value: 'general_fitness', label: 'General Fitness', icon: Heart },
];

const FITNESS_LEVELS = ['Beginner', 'Intermediate', 'Advanced'];

const WORKOUT_STYLES = [
  { value: 'weightlifting', label: 'Weightlifting' },
  { value: 'crossfit', label: 'CrossFit' },
  { value: 'cardio', label: 'Cardio' },
  { value: 'mixed', label: 'Mixed' },
];

export default function Intake() {
  const { user, profile, isPaidMember, loading: authLoading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [fullName, setFullName] = useState('');
  const [goal, setGoal] = useState('');
  const [level, setLevel] = useState('');
  const [trainingDays, setTrainingDays] = useState(3);
  const [injuries, setInjuries] = useState('');
  const [workoutStyles, setWorkoutStyles] = useState<string[]>([]);
  const [extraNotes, setExtraNotes] = useState('');

  useEffect(() => {
    if (profile?.full_name) setFullName(profile.full_name);
  }, [profile]);

  // Gate: redirect if not paid or already submitted
  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/login', { replace: true }); return; }
    if (!isPaidMember) { navigate('/community', { replace: true }); return; }
    if ((profile as any)?.intake_submitted) { navigate('/community', { replace: true }); return; }
  }, [authLoading, user, isPaidMember, profile, navigate]);

  const toggleStyle = (val: string) => {
    setWorkoutStyles(prev =>
      prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]
    );
  };

  const handleSubmit = async () => {
    if (!goal || !level) {
      toast.error('Please select your fitness goal and level.');
      return;
    }
    setSubmitting(true);
    try {
      const responses = {
        full_name: fullName,
        primary_goal: goal,
        fitness_level: level,
        training_days_per_week: trainingDays,
        injuries_limitations: injuries || null,
        preferred_workout_styles: workoutStyles,
        coach_notes: extraNotes || null,
      };

      const { error: insertError } = await supabase
        .from('intake_forms')
        .insert({ user_id: user!.id, responses });

      if (insertError) throw insertError;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ intake_submitted: true } as any)
        .eq('id', user!.id);

      if (updateError) throw updateError;

      await refreshProfile();
      toast.success('Intake form submitted! Welcome aboard.');
      navigate('/community', { replace: true });
    } catch (e: any) {
      toast.error(e.message || 'Failed to submit intake form.');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8 md:py-16">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
            Welcome to Your Coaching Journey
          </h1>
          <p className="text-muted-foreground mt-2 text-base">
            Help your coach build the perfect program for you.
          </p>
        </div>

        <div className="space-y-8">
          {/* Full Name */}
          <section>
            <label className="block text-sm font-medium text-foreground mb-2">Full Name</label>
            <input
              className="flex h-11 w-full rounded-xl border border-input bg-background px-4 py-2.5 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 md:text-sm transition-colors duration-200"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
            />
          </section>

          {/* Primary Fitness Goal */}
          <section>
            <label className="block text-sm font-medium text-foreground mb-3">Primary Fitness Goal</label>
            <div className="grid grid-cols-2 gap-3">
              {FITNESS_GOALS.map(g => {
                const Icon = g.icon;
                const selected = goal === g.value;
                return (
                  <button
                    key={g.value}
                    type="button"
                    onClick={() => setGoal(g.value)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 ${
                      selected
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-border bg-card hover:border-primary/40'
                    }`}
                  >
                    <Icon className={`w-6 h-6 ${selected ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className={`text-sm font-medium ${selected ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {g.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Fitness Level */}
          <section>
            <label className="block text-sm font-medium text-foreground mb-3">Current Fitness Level</label>
            <div className="flex rounded-xl border border-border overflow-hidden">
              {FITNESS_LEVELS.map(l => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLevel(l)}
                  className={`flex-1 py-2.5 text-sm font-medium transition-all duration-200 ${
                    level === l
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card text-muted-foreground hover:bg-secondary'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </section>

          {/* Training Days */}
          <section>
            <label className="block text-sm font-medium text-foreground mb-3">
              Training Days Per Week: <span className="text-primary font-bold">{trainingDays}</span>
            </label>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setTrainingDays(d => Math.max(1, d - 1))}
                disabled={trainingDays <= 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="flex-1 flex gap-1">
                {[1, 2, 3, 4, 5, 6, 7].map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setTrainingDays(n)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      n === trainingDays
                        ? 'bg-primary text-primary-foreground'
                        : n <= trainingDays
                          ? 'bg-primary/10 text-primary'
                          : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setTrainingDays(d => Math.min(7, d + 1))}
                disabled={trainingDays >= 7}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </section>

          {/* Injuries */}
          <section>
            <label className="block text-sm font-medium text-foreground mb-2">
              Any Injuries or Physical Limitations <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <Textarea
              value={injuries}
              onChange={e => setInjuries(e.target.value)}
              placeholder="E.g. lower back pain, knee surgery in 2023..."
              className="min-h-[80px]"
            />
          </section>

          {/* Workout Styles */}
          <section>
            <label className="block text-sm font-medium text-foreground mb-3">
              Preferred Workout Style <span className="text-muted-foreground font-normal">(select all that apply)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {WORKOUT_STYLES.map(s => {
                const selected = workoutStyles.includes(s.value);
                return (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => toggleStyle(s.value)}
                    className={`px-4 py-2 rounded-full text-sm font-medium border transition-all duration-200 ${
                      selected
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-card text-muted-foreground hover:border-primary/40'
                    }`}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Extra Notes */}
          <section>
            <label className="block text-sm font-medium text-foreground mb-2">
              Anything Else Your Coach Should Know <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <Textarea
              value={extraNotes}
              onChange={e => setExtraNotes(e.target.value)}
              placeholder="Schedule preferences, past training experience, goals timeline..."
              className="min-h-[100px]"
            />
          </section>

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full h-12 text-base font-semibold"
          >
            {submitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
            {submitting ? 'Submitting...' : 'Submit & Start Training'}
          </Button>
        </div>
      </div>
    </div>
  );
}
