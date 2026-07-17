import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ProgramDetailView } from '@/components/workouts/ProgramDetailView';
import { WorkoutProgram } from '@/types/workoutPrograms';

type ProgramRow = WorkoutProgram;

export function ProgramCatalog() {
  const { user, isPaidMember, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [programs, setPrograms] = useState<ProgramRow[]>([]);
  const [purchasedIds, setPurchasedIds] = useState<Set<string>>(new Set());
  const [enrolledIds, setEnrolledIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [viewingProgram, setViewingProgram] = useState<ProgramRow | null>(null);
  const [buyingId, setBuyingId] = useState<string | null>(null);

  const fetchAll = async () => {
    const { data: progs } = await supabase
      .from('workout_programs')
      .select('*')
      .eq('published', true)
      .order('created_at', { ascending: false });

    let purchased: string[] = [];
    let enrolled: string[] = [];
    if (user) {
      const [{ data: pur }, { data: enr }] = await Promise.all([
        supabase.from('ebook_purchases').select('ebook_id').eq('user_id', user.id),
        supabase.from('user_program_enrollments').select('program_id').eq('user_id', user.id),
      ]);
      purchased = (pur ?? []).map((p: any) => p.ebook_id);
      enrolled = (enr ?? []).map((e: any) => e.program_id);
    }

    setPrograms((progs ?? []) as ProgramRow[]);
    setPurchasedIds(new Set(purchased));
    setEnrolledIds(new Set(enrolled));
    setLoading(false);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!cancelled) await fetchAll();
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const formatPrice = (cents: number | null) =>
    `$${((cents ?? 0) / 100).toFixed(2)}`;

  const getState = (p: ProgramRow) => {
    if (p.access_type === 'free') {
      return { badge: 'Free', variant: 'secondary' as const, action: 'open' as const };
    }
    if (p.access_type === 'one_time_purchase') {
      if (purchasedIds.has(p.id)) {
        return { badge: 'Owned', variant: 'secondary' as const, action: 'open' as const };
      }
      return { badge: formatPrice(p.price_cents), variant: 'default' as const, action: 'buy' as const };
    }
    // membership
    if (isPaidMember) {
      return { badge: 'Included', variant: 'secondary' as const, action: 'open' as const };
    }
    return { badge: 'Members Only', variant: 'outline' as const, action: 'upgrade' as const };
  };

  if (viewingProgram) {
    return (
      <ProgramDetailView
        program={viewingProgram}
        isAdmin={isAdmin}
        isEnrolled={enrolledIds.has(viewingProgram.id)}
        onBack={() => setViewingProgram(null)}
        onUpdate={async (id, updates) => {
          if (!isAdmin) return viewingProgram;
          const { data, error } = await supabase
            .from('workout_programs')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
          if (error) throw error;
          const updated = data as WorkoutProgram;
          setViewingProgram(updated);
          setPrograms((prev) => prev.map((p) => (p.id === id ? updated : p)));
          return updated;
        }}
        onEnrollmentChange={() => {
          fetchAll();
        }}
      />
    );
  }

  if (loading) {
    return <div className="text-sm text-muted-foreground text-center py-8">Loading programs…</div>;
  }

  if (programs.length === 0) {
    return <div className="text-sm text-muted-foreground text-center py-8">No programs available yet.</div>;
  }

  return (
    <div className="space-y-4">
      {programs.map((p) => {
        const state = getState(p);
        return (
          <Card key={p.id} className="overflow-hidden">
            {p.cover_image_url && (
              <img
                src={p.cover_image_url}
                alt={p.title}
                className="w-full h-40 object-cover"
              />
            )}
            <div className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-display text-lg tracking-editorial">{p.title}</h3>
                <Badge variant={state.variant}>{state.badge}</Badge>
              </div>
              {p.description && (
                <p className="text-sm text-muted-foreground line-clamp-3">{p.description}</p>
              )}
              <div className="flex justify-end">
                {state.action === 'open' && (
                  <Button size="sm" onClick={() => setViewingProgram(p)}>
                    Open
                  </Button>
                )}
                {state.action === 'buy' && (
                  <Button
                    size="sm"
                    disabled={buyingId === p.id}
                    onClick={async () => {
                      setBuyingId(p.id);
                      try {
                        const { data, error } = await supabase.functions.invoke('create-ebook-checkout', {
                          body: { ebook_id: p.id },
                        });
                        if (error || data?.error) {
                          toast.error(data?.error || error?.message || 'Checkout failed. Please try again.');
                          setBuyingId(null);
                          return;
                        }
                        if (data?.url) {
                          window.location.href = data.url;
                        } else {
                          toast.error('Checkout URL missing. Please try again.');
                          setBuyingId(null);
                        }
                      } catch (err: any) {
                        toast.error(err?.message || 'Checkout failed. Please try again.');
                        setBuyingId(null);
                      }
                    }}
                  >
                    {buyingId === p.id ? 'Loading…' : 'Buy'}
                  </Button>
                )}
                {state.action === 'upgrade' && (
                  <Button size="sm" onClick={() => navigate('/upgrade')}>
                    Upgrade
                  </Button>
                )}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}