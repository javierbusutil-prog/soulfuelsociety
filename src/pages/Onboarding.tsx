import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Play, Dumbbell, Target, Calendar, Clock, MapPin, ChevronRight, Sparkles, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const STEPS = ['Welcome', 'Fitness Assessment', 'Schedule', 'All Set'];

const FITNESS_LEVELS = ['Beginner', 'Intermediate', 'Advanced'];
const GOALS = [
  { value: 'build_muscle', label: 'Build Muscle', icon: Dumbbell },
  { value: 'lose_weight', label: 'Lose Weight', icon: Target },
  { value: 'improve_endurance', label: 'Improve Endurance', icon: Clock },
  { value: 'general_fitness', label: 'General Fitness', icon: Sparkles },
];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const TIMES = ['Morning', 'Afternoon', 'Evening'];

export default function Onboarding() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const checkoutSuccess = searchParams.get('checkout') === 'success';

  const [activating, setActivating] = useState(checkoutSuccess);
  const [activationTimedOut, setActivationTimedOut] = useState(false);

  const [step, setStep] = useState(0);
  const [fitnessLevel, setFitnessLevel] = useState('Beginner');
  const [goal, setGoal] = useState('');
  const [trainingDays, setTrainingDays] = useState(3);
  const [injuries, setInjuries] = useState('');
  const [preferredDays, setPreferredDays] = useState<string[]>([]);
  const [preferredTime, setPreferredTime] = useState('');
  const [gymLocation, setGymLocation] = useState('');
  const [saving, setSaving] = useState(false);

  const isInPerson = profile?.selected_plan === 'in-person';

  // Poll user_roles for 'paid' role after checkout success
  useEffect(() => {
    if (!checkoutSuccess || !user) return;

    let cancelled = false;
    const startedAt = Date.now();

    const check = async () => {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'paid')
        .maybeSingle();

      if (cancelled) return;

      if (data) {
        await refreshProfile();
        if (!cancelled) setActivating(false);
        return true;
      }
      return false;
    };

    const interval = setInterval(async () => {
      const found = await check();
      if (found || cancelled) {
        clearInterval(interval);
        return;
      }
      if (Date.now() - startedAt >= 10000) {
        clearInterval(interval);
        if (!cancelled) {
          setActivationTimedOut(true);
          setActivating(false);
        }
      }
    }, 2000);

    // Run an immediate check too
    check().then(found => {
      if (found) clearInterval(interval);
    });

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [checkoutSuccess, user, refreshProfile]);

  // Gate: redirect if already onboarded
  useEffect(() => {
    if (profile && (profile as any).has_completed_onboarding) {
      navigate('/home', { replace: true });
    }
  }, [profile, navigate]);

  // Determine effective steps (skip schedule for online)
  const effectiveSteps = isInPerson ? STEPS : STEPS.filter(s => s !== 'Schedule');
  const totalSteps = effectiveSteps.length;
  const progressPercent = ((step + 1) / totalSteps) * 100;
  const currentStepName = effectiveSteps[step];

  const canContinueStep1 = true;
  const canContinueStep2 = goal !== '';
  const canContinueStep3 = preferredDays.length > 0 && preferredTime !== '';

  const handleNext = () => {
    if (step < totalSteps - 1) setStep(step + 1);
  };

  const toggleDay = (day: string) => {
    setPreferredDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleFinish = async () => {
    if (!user) return;
    setSaving(true);
    try {
      // Save member profile
      const { error: mpError } = await supabase.from('member_profiles' as any).upsert({
        user_id: user.id,
        fitness_level: fitnessLevel.toLowerCase(),
        primary_goal: goal,
        training_days_per_week: trainingDays,
        injuries_limitations: injuries || null,
        preferred_days: isInPerson ? preferredDays : null,
        preferred_time: isInPerson ? preferredTime.toLowerCase() : null,
        gym_location: isInPerson ? gymLocation || null : null,
      } as any, { onConflict: 'user_id' });

      if (mpError) throw mpError;

      // Mark onboarding complete
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ has_completed_onboarding: true } as any)
        .eq('id', user.id);

      if (profileError) throw profileError;

      await refreshProfile();
      navigate('/home', { replace: true });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const slideVariants = {
    enter: { opacity: 0, x: 40 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -40 },
  };

  return (
    activating ? (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
        <p className="text-foreground font-medium">Setting up your account...</p>
      </div>
    ) : (
    <div className="min-h-screen bg-background flex flex-col">
      {activationTimedOut && (
        <div className="px-6 pt-4">
          <Card className="p-3 bg-primary/5 border-primary/20 text-sm text-foreground text-center">
            Welcome! Your account is being activated — this usually takes just a moment.
          </Card>
        </div>
      )}
      {/* Progress bar */}
      <div className="px-6 pt-6 pb-2">
        <div className="flex items-center justify-between mb-2">
          {effectiveSteps.map((s, i) => (
            <div key={s} className="flex items-center gap-1">
              <div className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors",
                i < step ? "bg-primary text-primary-foreground" :
                i === step ? "bg-primary text-primary-foreground" :
                "bg-muted text-muted-foreground"
              )}>
                {i < step ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
              </div>
              {i < effectiveSteps.length - 1 && (
                <div className={cn("h-0.5 w-8 sm:w-12 transition-colors", i < step ? "bg-primary" : "bg-muted")} />
              )}
            </div>
          ))}
        </div>
        <Progress value={progressPercent} className="h-1.5" />
      </div>

      {/* Step content */}
      <div className="flex-1 flex items-start justify-center px-4 py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStepName}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25 }}
            className="w-full max-w-lg"
          >
            {/* STEP 1: Welcome */}
            {currentStepName === 'Welcome' && (
              <div className="space-y-6 text-center">
                <h1 className="text-2xl font-bold text-foreground">Welcome to your coaching program.</h1>
                <p className="text-muted-foreground">
                  "We're excited to work with you. Before we build your program, we need to learn a little about you."
                </p>
                <p className="text-sm text-muted-foreground italic">— Javier & Elizabeth</p>

                {/* Video placeholder */}
                <Card className="aspect-video flex items-center justify-center bg-muted/50 border-dashed">
                  <div className="text-center space-y-2">
                    <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                      <Play className="w-6 h-6 text-primary ml-0.5" />
                    </div>
                    <p className="text-sm text-muted-foreground">Welcome video coming soon</p>
                  </div>
                </Card>

                <Button onClick={handleNext} size="lg" className="w-full">
                  Let's get started <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            )}

            {/* STEP 2: Fitness Assessment */}
            {currentStepName === 'Fitness Assessment' && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-foreground">Fitness Assessment</h2>

                {/* Fitness level */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Current Fitness Level</label>
                  <div className="grid grid-cols-3 gap-2">
                    {FITNESS_LEVELS.map(level => (
                      <button
                        key={level}
                        onClick={() => setFitnessLevel(level)}
                        className={cn(
                          "py-2.5 rounded-xl text-sm font-medium transition-all border",
                          fitnessLevel === level
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-card text-foreground border-border hover:border-primary/50"
                        )}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Primary goal */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Primary Goal</label>
                  <div className="grid grid-cols-2 gap-3">
                    {GOALS.map(g => (
                      <button
                        key={g.value}
                        onClick={() => setGoal(g.value)}
                        className={cn(
                          "p-4 rounded-xl border text-left transition-all space-y-2",
                          goal === g.value
                            ? "bg-primary/10 border-primary ring-1 ring-primary"
                            : "bg-card border-border hover:border-primary/50"
                        )}
                      >
                        <g.icon className={cn("w-5 h-5", goal === g.value ? "text-primary" : "text-muted-foreground")} />
                        <p className="text-sm font-medium text-foreground">{g.label}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Training days */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Training Days Per Week</label>
                  <div className="flex items-center gap-3">
                    {[1, 2, 3, 4, 5, 6, 7].map(n => (
                      <button
                        key={n}
                        onClick={() => setTrainingDays(n)}
                        className={cn(
                          "w-10 h-10 rounded-full text-sm font-medium transition-all border",
                          trainingDays === n
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-card text-foreground border-border hover:border-primary/50"
                        )}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Injuries */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Injuries or Limitations (optional)</label>
                  <Textarea
                    placeholder="E.g. lower back pain, knee surgery in 2022..."
                    value={injuries}
                    onChange={e => setInjuries(e.target.value)}
                    className="resize-none"
                    rows={3}
                  />
                </div>

                <Button onClick={handleNext} size="lg" className="w-full" disabled={!canContinueStep2}>
                  Continue <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            )}

            {/* STEP 3: Schedule (in-person only) */}
            {currentStepName === 'Schedule' && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-foreground">Schedule Preferences</h2>

                {/* Preferred days */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Preferred Days</label>
                  <div className="flex flex-wrap gap-2">
                    {DAYS.map(day => (
                      <button
                        key={day}
                        onClick={() => toggleDay(day)}
                        className={cn(
                          "px-4 py-2 rounded-xl text-sm font-medium transition-all border",
                          preferredDays.includes(day)
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-card text-foreground border-border hover:border-primary/50"
                        )}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Time of day */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Preferred Time of Day</label>
                  <div className="grid grid-cols-3 gap-2">
                    {TIMES.map(time => (
                      <button
                        key={time}
                        onClick={() => setPreferredTime(time)}
                        className={cn(
                          "py-2.5 rounded-xl text-sm font-medium transition-all border",
                          preferredTime === time
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-card text-foreground border-border hover:border-primary/50"
                        )}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Gym location */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Location / Gym Name</label>
                  <Input
                    placeholder="E.g. LA Fitness on Main St"
                    value={gymLocation}
                    onChange={e => setGymLocation(e.target.value)}
                  />
                </div>

                <Button onClick={handleNext} size="lg" className="w-full" disabled={!canContinueStep3}>
                  Continue <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            )}

            {/* STEP 4: All Set */}
            {currentStepName === 'All Set' && (
              <div className="space-y-6 text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-xl font-bold text-foreground">You're all set!</h2>
                <p className="text-muted-foreground">
                  Your coaches will review your profile and deliver your personalized program within 48 hours.
                </p>

                {/* Summary */}
                <Card className="p-5 text-left space-y-3 bg-muted/30">
                  <h3 className="text-sm font-semibold text-foreground">Your Summary</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Fitness Level</span>
                      <span className="font-medium text-foreground">{fitnessLevel}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Goal</span>
                      <span className="font-medium text-foreground">{GOALS.find(g => g.value === goal)?.label || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Training Days</span>
                      <span className="font-medium text-foreground">{trainingDays}x / week</span>
                    </div>
                    {injuries && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Limitations</span>
                        <span className="font-medium text-foreground truncate max-w-[180px]">{injuries}</span>
                      </div>
                    )}
                    {isInPerson && preferredDays.length > 0 && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Preferred Days</span>
                          <span className="font-medium text-foreground">{preferredDays.join(', ')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Time</span>
                          <span className="font-medium text-foreground">{preferredTime}</span>
                        </div>
                        {gymLocation && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Location</span>
                            <span className="font-medium text-foreground truncate max-w-[180px]">{gymLocation}</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </Card>

                <Button onClick={handleFinish} size="lg" className="w-full" disabled={saving}>
                  {saving ? 'Saving...' : 'Go to my dashboard'}
                </Button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
    )
  );
}
