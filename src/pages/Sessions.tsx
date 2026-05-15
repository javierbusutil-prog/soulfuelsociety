import { useEffect, useState } from 'react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { WorkoutBlocksDisplay } from '@/components/workouts/WorkoutBlocksDisplay';
import { getBlocksFromSource } from '@/lib/workoutBlocks';

interface SessionRow {
  id: string;
  scheduled_for: string;
  completed_at: string | null;
  status: string;
  title: string | null;
  note: string | null;
  workout_data: any;
}

interface AttendeeRow {
  amount_charged: number | null;
  payment_received: boolean | null;
  sessions: SessionRow;
}

export default function Sessions() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [upcoming, setUpcoming] = useState<AttendeeRow[]>([]);
  const [past, setPast] = useState<AttendeeRow[]>([]);
  const [paidThisMonth, setPaidThisMonth] = useState(0);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      const nowIso = new Date().toISOString();
      const monthStart = startOfMonth(new Date()).toISOString();
      const monthEnd = endOfMonth(new Date()).toISOString();

      const [upRes, pastRes, cashRes] = await Promise.all([
        supabase
          .from('session_attendees')
          .select(`amount_charged, payment_received, sessions!inner(id, scheduled_for, completed_at, status, title, note, workout_data)`)
          .eq('user_id', user.id)
          .eq('sessions.status', 'scheduled')
          .gte('sessions.scheduled_for', nowIso)
          .order('sessions(scheduled_for)', { ascending: true }),
        supabase
          .from('session_attendees')
          .select(`amount_charged, payment_received, sessions!inner(id, scheduled_for, completed_at, status, title, note, workout_data)`)
          .eq('user_id', user.id)
          .eq('sessions.status', 'completed')
          .order('sessions(completed_at)', { ascending: false })
          .limit(20),
        supabase
          .from('cash_payments')
          .select('amount, payment_date')
          .eq('user_id', user.id)
          .gte('payment_date', monthStart.slice(0, 10))
          .lte('payment_date', monthEnd.slice(0, 10)),
      ]);

      if (cancelled) return;

      const upData = (upRes.data || []) as unknown as AttendeeRow[];
      const pastData = (pastRes.data || []) as unknown as AttendeeRow[];
      setUpcoming(upData);
      setPast(pastData);

      const cashSum = (cashRes.data || []).reduce((s, r: any) => s + Number(r.amount || 0), 0);
      const sessionsSum = pastData
        .filter((r) => {
          if (!r.payment_received || !r.amount_charged) return false;
          const c = r.sessions.completed_at;
          if (!c) return false;
          return c >= monthStart && c <= monthEnd;
        })
        .reduce((s, r) => s + Number(r.amount_charged || 0), 0);
      setPaidThisMonth(cashSum + sessionsSum);

      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [user]);

  const sessionsThisMonth = past.filter((r) => {
    const c = r.sessions.completed_at;
    if (!c) return false;
    const d = new Date(c);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const nextSession = upcoming[0]?.sessions;

  if (loading) {
    return (
      <AppLayout title="My Sessions">
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="My Sessions">
      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-muted/40 rounded-lg p-3 text-center">
            <p className="text-2xl font-semibold">{sessionsThisMonth}</p>
            <p className="text-xs text-muted-foreground mt-1">Sessions this month</p>
          </div>
          <div className="bg-muted/40 rounded-lg p-3 text-center">
            <p className="text-sm font-semibold leading-tight">
              {nextSession ? format(new Date(nextSession.scheduled_for), 'EEE, MMM d') : '—'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {nextSession ? format(new Date(nextSession.scheduled_for), 'h:mm a') : 'Next session'}
            </p>
          </div>
          <div className="bg-muted/40 rounded-lg p-3 text-center">
            <p className="text-2xl font-semibold">${paidThisMonth.toFixed(0)}</p>
            <p className="text-xs text-muted-foreground mt-1">Paid this month</p>
          </div>
        </div>

        {/* Upcoming */}
        <section className="space-y-3">
          <h2 className="font-display text-lg font-medium">Upcoming</h2>
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No upcoming sessions</p>
          ) : (
            upcoming.map((row) => {
              const s = row.sessions;
              const blocks = getBlocksFromSource(s.workout_data);
              return (
                <Card key={s.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(s.scheduled_for), 'EEE, MMM d · h:mm a')}
                      </p>
                      <p className="font-semibold mt-0.5">{s.title || 'Session'}</p>
                    </div>
                    <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300">
                      Scheduled
                    </Badge>
                  </div>
                  {blocks.length > 0 && <WorkoutBlocksDisplay blocks={blocks} variant="compact" />}
                  {s.note && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{s.note}</p>}
                </Card>
              );
            })
          )}
        </section>

        {/* Past */}
        <section className="space-y-3">
          <h2 className="font-display text-lg font-medium">Past</h2>
          {past.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No sessions yet</p>
          ) : (
            past.map((row) => {
              const s = row.sessions;
              const blocks = getBlocksFromSource(s.workout_data);
              const showPaid = row.amount_charged != null && Number(row.amount_charged) > 0;
              return (
                <Card key={s.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {s.completed_at ? format(new Date(s.completed_at), 'EEE, MMM d') : '—'}
                      </p>
                      <p className="font-semibold mt-0.5">{s.title || 'Session'}</p>
                    </div>
                    {showPaid && (
                      row.payment_received ? (
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-300">
                          Paid · ${Number(row.amount_charged).toFixed(0)}
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300">
                          Unpaid · ${Number(row.amount_charged).toFixed(0)}
                        </Badge>
                      )
                    )}
                  </div>
                  {blocks.length > 0 && <WorkoutBlocksDisplay blocks={blocks} variant="compact" />}
                  {s.note && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{s.note}</p>}
                </Card>
              );
            })
          )}
        </section>
      </div>
    </AppLayout>
  );
}
