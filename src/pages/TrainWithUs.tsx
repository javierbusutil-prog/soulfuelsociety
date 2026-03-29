import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { Award, CheckCircle2, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface Coach {
  id: string;
  name: string;
  initials: string;
  title: string;
  years_experience: string;
  bio: string;
  specialties: string[];
  credentials: string[];
  photo_url: string | null;
  sort_order: number;
}

export default function TrainWithUs() {
  const { isPaidMember } = useAuth();
  const navigate = useNavigate();
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCoaches = async () => {
      const { data } = await supabase
        .from('coaches')
        .select('*')
        .order('sort_order', { ascending: true });
      if (data) setCoaches(data as Coach[]);
      setLoading(false);
    };
    fetchCoaches();
  }, []);

  return (
    <AppLayout title="The Team">
      <div className="max-w-lg mx-auto px-4 pb-8 space-y-8">
        {/* Section heading */}
        <div className="pt-6 space-y-2">
          <h1 className="font-display text-2xl font-semibold tracking-editorial text-foreground">
            Your coaches
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            The people behind your program — real coaches, real experience, real results.
          </p>
        </div>

        {/* Coach cards */}
        {loading ? (
          <div className="space-y-6">
            {[1, 2].map((i) => (
              <Card key={i} className="p-8 animate-pulse space-y-4">
                <div className="w-28 h-28 rounded-full bg-muted mx-auto" />
                <div className="h-5 bg-muted rounded w-1/2 mx-auto" />
                <div className="h-3 bg-muted rounded w-1/3 mx-auto" />
                <div className="h-20 bg-muted rounded" />
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {coaches.map((coach) => (
              <Card
                key={coach.id}
                className="p-6 bg-card/60 border-border/40 space-y-6"
              >
                {/* Photo & name */}
                <div className="flex flex-col items-center space-y-3">
                  <Avatar className="w-28 h-28 border-2 border-primary/20">
                    {coach.photo_url ? (
                      <AvatarImage
                        src={coach.photo_url}
                        alt={coach.name}
                        className="object-cover"
                      />
                    ) : null}
                    <AvatarFallback className="text-2xl font-display font-semibold bg-secondary text-secondary-foreground">
                      {coach.initials}
                    </AvatarFallback>
                  </Avatar>

                  <div className="text-center space-y-1">
                    <h2 className="font-display text-xl font-semibold text-foreground">
                      {coach.name}
                    </h2>
                    <p className="text-muted-foreground text-sm">{coach.title}</p>
                  </div>

                  <Badge variant="secondary" className="text-xs font-medium">
                    {coach.years_experience} years experience
                  </Badge>
                </div>

                {/* About */}
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                    About
                  </p>
                  <p className="text-sm text-foreground/90 leading-relaxed">
                    {coach.bio}
                  </p>
                </div>

                {/* Specialties */}
                <div className="space-y-2.5">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Specialties
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {coach.specialties.map((s) => (
                      <Badge
                        key={s}
                        variant="secondary"
                        className="text-xs font-normal bg-secondary/60"
                      >
                        {s}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Credentials */}
                <div className="space-y-2.5">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Credentials
                  </p>
                  <div className="space-y-1.5">
                    {coach.credentials.map((c) => (
                      <div key={c} className="flex items-start gap-2">
                        <Award className="w-3.5 h-3.5 mt-0.5 text-primary/70 shrink-0" />
                        <span className="text-sm text-foreground/80">{c}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* CTA */}
                {!isPaidMember ? (
                  <div className="pt-2 border-t border-border/30 space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Want to train with {coach.name.split(' ')[0]}?
                    </p>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => navigate('/upgrade')}
                    >
                      See coaching plans
                    </Button>
                  </div>
                ) : (
                  <div className="pt-2 border-t border-border/30 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-chart-2" />
                    <p className="text-sm text-chart-2 font-medium">
                      You're currently training with {coach.name.split(' ')[0]}.
                    </p>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
