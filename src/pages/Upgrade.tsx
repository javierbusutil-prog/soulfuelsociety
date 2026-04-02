import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Monitor, MapPin, Users, User, Users2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

type PlanType = 'online' | 'in_person';
type GroupSize = 'solo' | 'partner' | 'trio';

const SESSION_RATES: Record<GroupSize, number> = {
  solo: 50,
  partner: 40,
  trio: 35,
};

const GROUP_LABELS: Record<GroupSize, string> = {
  solo: 'Solo',
  partner: 'Partner',
  trio: 'Trio',
};

const GROUP_DESCRIPTIONS: Record<GroupSize, string> = {
  solo: 'Just me',
  partner: '2 people',
  trio: '3 people',
};

const GROUP_ICONS: Record<GroupSize, typeof User> = {
  solo: User,
  partner: Users2,
  trio: Users,
};

export default function Upgrade() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState(1);
  const [plan, setPlan] = useState<PlanType | null>(null);
  const [sessionCount, setSessionCount] = useState<number | null>(null);
  const [groupSize, setGroupSize] = useState<GroupSize | null>(null);
  const [loading, setLoading] = useState(false);

  const pricePerPerson = groupSize && sessionCount
    ? SESSION_RATES[groupSize] * sessionCount
    : null;

  const handleContinueStep1 = () => {
    if (plan === 'online') {
      setStep(3);
    } else {
      setStep(2);
    }
  };

  const handleContinueStep2 = () => {
    setStep(3);
  };

  const handleBack = () => {
    if (step === 3 && plan === 'in_person') {
      setStep(2);
    } else {
      setStep(1);
    }
  };

  const handleCheckout = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          plan,
          sessionCount: plan === 'online' ? null : sessionCount,
          groupSize: plan === 'online' ? null : groupSize,
        },
      });

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Could not start checkout',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const summaryPlan = plan === 'online' ? 'Online Training' : 'In-Person Training';
  const summaryPrice = plan === 'online' ? 99 : pricePerPerson;

  return (
    <AppLayout title="Upgrade">
      <div className="max-w-lg mx-auto p-4 pb-8">
        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors",
                  s === step
                    ? "bg-primary text-primary-foreground"
                    : s < step
                    ? "bg-accent text-accent-foreground"
                    : "bg-secondary text-muted-foreground"
                )}
              >
                {s < step ? <Check className="w-4 h-4" /> : s}
              </div>
              {s < 3 && (
                <div
                  className={cn(
                    "w-8 h-0.5 rounded-full",
                    s < step ? "bg-accent" : "bg-border"
                  )}
                />
              )}
            </div>
          ))}
        </div>

        {step > 1 && (
          <button
            onClick={handleBack}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        )}

        <AnimatePresence mode="wait">
          {/* STEP 1 */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="text-center mb-2">
                <h1 className="font-display text-xl font-semibold tracking-editorial text-foreground">
                  How would you like to train?
                </h1>
              </div>

              {/* Online */}
              <Card
                className={cn(
                  "p-5 cursor-pointer transition-all border-2",
                  plan === 'online'
                    ? "border-primary bg-primary/5"
                    : "border-transparent hover:border-border"
                )}
                onClick={() => setPlan('online')}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Monitor className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-baseline justify-between">
                      <p className="font-medium text-foreground">Online Training</p>
                      <p className="text-sm font-semibold text-foreground">$99/mo</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Personalized program, coach messaging, train anywhere
                    </p>
                  </div>
                </div>
              </Card>

              {/* In-Person */}
              <Card
                className={cn(
                  "p-5 cursor-pointer transition-all border-2",
                  plan === 'in_person'
                    ? "border-primary bg-primary/5"
                    : "border-transparent hover:border-border"
                )}
                onClick={() => setPlan('in_person')}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-baseline justify-between">
                      <p className="font-medium text-foreground">In-Person Training</p>
                      <p className="text-sm font-semibold text-foreground">from $140/mo</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Work side-by-side with a coach who knows you, your goals, your strengths, your limits. Every session is part of a program designed exclusively around you. Group options available.
                    </p>
                  </div>
                </div>
              </Card>

              {plan && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <Button onClick={handleContinueStep1} className="w-full" variant="accent">
                    Continue
                  </Button>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* STEP 2 — In-Person Config */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {/* Session Frequency */}
              <div className="space-y-3">
                <h2 className="font-display text-lg font-medium tracking-editorial text-foreground">
                  How often?
                </h2>
                <div className="grid grid-cols-3 gap-2">
                  {[4, 8, 12].map((count) => (
                    <Card
                      key={count}
                      className={cn(
                        "p-3 text-center cursor-pointer transition-all border-2",
                        sessionCount === count
                          ? "border-primary bg-primary/5"
                          : "border-transparent hover:border-border"
                      )}
                      onClick={() => setSessionCount(count)}
                    >
                      <p className="text-lg font-semibold text-foreground">{count}</p>
                      <p className="text-[10px] text-muted-foreground">sessions/mo</p>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Group Size */}
              <div className="space-y-3">
                <h2 className="font-display text-lg font-medium tracking-editorial text-foreground">
                  Group size
                </h2>
                <div className="grid grid-cols-3 gap-2">
                  {(['solo', 'partner', 'trio'] as GroupSize[]).map((size) => {
                    const Icon = GROUP_ICONS[size];
                    return (
                      <Card
                        key={size}
                        className={cn(
                          "p-3 text-center cursor-pointer transition-all border-2",
                          groupSize === size
                            ? "border-primary bg-primary/5"
                            : "border-transparent hover:border-border"
                        )}
                        onClick={() => setGroupSize(size)}
                      >
                        <Icon className="w-5 h-5 mx-auto mb-1 text-foreground" />
                        <p className="text-sm font-medium text-foreground">
                          {GROUP_LABELS[size]}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {GROUP_DESCRIPTIONS[size]}
                        </p>
                        {size !== 'solo' && (
                          <Badge variant="secondary" className="text-[9px] mt-1.5 px-1.5 py-0 font-normal">
                            {size === 'partner' ? '20% off' : '30% off'}
                          </Badge>
                        )}
                      </Card>
                    );
                  })}
                </div>
              </div>

              {/* Dynamic price */}
              {pricePerPerson !== null && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center"
                >
                  <p className="text-2xl font-semibold text-foreground">
                    ${pricePerPerson}
                    <span className="text-sm font-normal text-muted-foreground">/mo per person</span>
                  </p>
                </motion.div>
              )}

              {(groupSize === 'partner' || groupSize === 'trio') && (
                <p className="text-xs text-center text-muted-foreground">
                  You'll invite your group after checkout.
                </p>
              )}

              {sessionCount && groupSize && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <Button onClick={handleContinueStep2} className="w-full" variant="accent">
                    Continue
                  </Button>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* STEP 3 — Payment */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-5"
            >
              <h2 className="font-display text-lg font-medium tracking-editorial text-foreground text-center">
                Order Summary
              </h2>

              <Card className="p-5 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Plan</span>
                  <span className="font-medium text-foreground">{summaryPlan}</span>
                </div>

                {plan === 'in_person' && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Sessions</span>
                      <span className="font-medium text-foreground">{sessionCount}/month</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Group size</span>
                      <span className="font-medium text-foreground">
                        {groupSize ? GROUP_LABELS[groupSize] : '—'}
                      </span>
                    </div>
                  </>
                )}

                <div className="border-t border-border pt-3 flex justify-between">
                  <span className="font-medium text-foreground">Total</span>
                  <div className="text-right">
                    <p className="text-xl font-semibold text-foreground">
                      ${summaryPrice}
                      <span className="text-xs font-normal text-muted-foreground">/mo</span>
                    </p>
                    {plan === 'in_person' && groupSize !== 'solo' && (
                      <p className="text-[10px] text-muted-foreground">per person</p>
                    )}
                  </div>
                </div>
              </Card>

              <Button
                onClick={handleCheckout}
                className="w-full"
                variant="accent"
                size="lg"
                disabled={loading}
              >
                {loading ? 'Redirecting to checkout…' : 'Proceed to payment'}
              </Button>

              <p className="text-center text-[10px] text-muted-foreground">
                You'll be redirected to Stripe for secure payment. Cancel anytime.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppLayout>
  );
}
