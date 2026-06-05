import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { EbookViewer } from './EbookViewer';

interface ProgramRow {
  id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  access_type: 'free' | 'membership' | 'one_time_purchase';
  price_cents: number | null;
  ebook_url: string | null;
}

export function ProgramCatalog() {
  const { user, isPaidMember } = useAuth();
  const navigate = useNavigate();
  const [programs, setPrograms] = useState<ProgramRow[]>([]);
  const [purchasedIds, setPurchasedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [viewingProgram, setViewingProgram] = useState<ProgramRow | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: progs } = await supabase
        .from('workout_programs')
        .select('id, title, description, cover_image_url, access_type, price_cents, ebook_url')
        .eq('published', true)
        .order('created_at', { ascending: false });

      let purchased: string[] = [];
      if (user) {
        const { data: pur } = await supabase
          .from('ebook_purchases')
          .select('ebook_id')
          .eq('user_id', user.id);
        purchased = (pur ?? []).map((p: any) => p.ebook_id);
      }

      if (!cancelled) {
        setPrograms((progs ?? []) as ProgramRow[]);
        setPurchasedIds(new Set(purchased));
        setLoading(false);
      }
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
                  <Button size="sm" onClick={() => console.log('Open program', p.id)}>
                    Open
                  </Button>
                )}
                {state.action === 'buy' && (
                  <Button size="sm" onClick={() => console.log('Buy program', p.id)}>
                    Buy
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