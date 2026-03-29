import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { Check, MessageCircle, Dumbbell, RefreshCw, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const onlineFeatures = [
  { icon: Dumbbell, text: 'Personalized workout program' },
  { icon: MessageCircle, text: '1:1 messaging with coaches' },
  { icon: RefreshCw, text: 'Weekly program adjustments' },
  { icon: Sparkles, text: 'All free features included' },
];

const inPersonPricing = {
  headers: ['Solo', 'Partner', 'Trio'],
  savings: ['', '20% off', '30% off'],
  rows: [
    { sessions: '4 sessions', prices: ['$200', '$160', '$140'] },
    { sessions: '8 sessions', prices: ['$400', '$320', '$280'] },
    { sessions: '12 sessions', prices: ['$600', '$480', '$420'] },
  ],
  perPerson: [false, true, true],
};

export default function TrainWithUs() {
  const { isPaidMember } = useAuth();
  const navigate = useNavigate();

  return (
    <AppLayout title="Train With Us">
      <div className="max-w-lg mx-auto px-4 pb-8 space-y-8">
        {/* Hero */}
        <div className="text-center pt-4 space-y-2">
          <h1 className="font-display text-2xl font-semibold tracking-editorial text-foreground">
            Train with Javier &amp; Elizabeth
          </h1>
          <p className="text-muted-foreground text-sm">
            Personalized coaching, real results.
          </p>
        </div>

        {/* Trainer Cards */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { name: 'Javier Busutil', initials: 'JB' },
            { name: 'Elizabeth Busutil', initials: 'EB' },
          ].map((trainer) => (
            <Card key={trainer.name} className="flex flex-col items-center py-5 px-3 gap-2.5">
              <Avatar className="w-16 h-16">
                <AvatarFallback className="bg-secondary text-foreground text-lg font-medium">
                  {trainer.initials}
                </AvatarFallback>
              </Avatar>
              <div className="text-center">
                <p className="font-medium text-sm text-foreground">{trainer.name}</p>
                <p className="text-xs text-muted-foreground">Coach</p>
              </div>
            </Card>
          ))}
        </div>

        {/* Online Training */}
        <section className="space-y-3">
          <h2 className="font-display text-lg font-medium tracking-editorial text-foreground">
            Online Training
          </h2>
          <Card className="p-5 space-y-4">
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-semibold text-foreground">$99</span>
              <span className="text-sm text-muted-foreground">/month per person</span>
            </div>
            <ul className="space-y-2.5">
              {onlineFeatures.map((f) => (
                <li key={f.text} className="flex items-center gap-2.5 text-sm text-foreground">
                  <Check className="w-4 h-4 text-accent shrink-0" />
                  {f.text}
                </li>
              ))}
            </ul>
            <Button className="w-full" variant="accent" onClick={() => navigate('/upgrade')}>
              Get started
            </Button>
          </Card>
        </section>

        {/* In-Person Training */}
        <section className="space-y-3">
          <h2 className="font-display text-lg font-medium tracking-editorial text-foreground">
            In-Person Training
          </h2>
          <Card className="p-0 overflow-hidden">
            {/* Header row */}
            <div className="grid grid-cols-4 border-b border-border">
              <div className="p-3" />
              {inPersonPricing.headers.map((h, i) => (
                <div key={h} className="p-3 text-center space-y-1">
                  <p className="text-sm font-medium text-foreground">{h}</p>
                  {inPersonPricing.savings[i] && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 font-normal">
                      {inPersonPricing.savings[i]}
                    </Badge>
                  )}
                </div>
              ))}
            </div>

            {/* Price rows */}
            {inPersonPricing.rows.map((row, ri) => (
              <div
                key={row.sessions}
                className={`grid grid-cols-4 ${ri < inPersonPricing.rows.length - 1 ? 'border-b border-border' : ''}`}
              >
                <div className="p-3 flex items-center">
                  <span className="text-xs font-medium text-muted-foreground">{row.sessions}</span>
                </div>
                {row.prices.map((price, ci) => (
                  <div key={ci} className="p-2.5 text-center space-y-1.5">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{price}</p>
                      <p className="text-[10px] text-muted-foreground">
                        /mo{inPersonPricing.perPerson[ci] ? ' per person' : ''}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-[10px] h-7 px-2"
                      onClick={() => navigate('/upgrade')}
                    >
                      Book a call
                    </Button>
                  </div>
                ))}
              </div>
            ))}
          </Card>
        </section>

        {/* Free user banner */}
        {!isPaidMember && (
          <div className="rounded-xl bg-secondary/60 border border-border px-4 py-3 text-center">
            <p className="text-xs text-muted-foreground">
              You're on the free plan — you keep all your current features when you upgrade.
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
