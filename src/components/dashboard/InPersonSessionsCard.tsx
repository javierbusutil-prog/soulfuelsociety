import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Calendar, Clock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface AttendeeSessionRow {
  session_id: string;
  sessions: {
    scheduled_for: string | null;
    completed_at: string | null;
    status: string;
    title: string | null;
  } | null;
}

/**
 * Returns the year+month of a UTC timestamp as seen in Miami (America/New_York).
 */
function miamiYearMonth(iso: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(new Date(iso));
  const year = parts.find((p) => p.type === 'year')?.value ?? '';
  const month = parts.find((p) => p.type === 'month')?.value ?? '';
  return `${year}-${month}`;
}

export function InPersonSessionsCard() {
  const { user } = useAuth();
  const [completedThisMonth, setCompletedThisMonth] = useState(0);
  const [nextSession, setNextSession] = useState<{
    scheduled_for: string;
    title: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from('session_attendees')
        .select('session_id, sessions!inner(scheduled_for, completed_at, status, title)')
        .eq('user_id', user.id);

      if (cancelled) return;

      if (error) {
        console.error('InPersonSessionsCard: failed to load sessions', error);
        setCompletedThisMonth(0);
        setNextSession(null);
        setLoading(false);
        return;
      }

      const rows = (data ?? []) as unknown as AttendeeSessionRow[];
      const thisMiamiMonth = miamiYearMonth(new Date().toISOString());
      const now = Date.now();

      const completed = rows.filter((r) => {
        const s = r.sessions;
        return (
          s?.status === 'completed' &&
          s.completed_at != null &&
          miamiYearMonth(s.completed_at) === thisMiamiMonth
        );
      }).length;

      const upcoming = rows
        .map((r) => r.sessions)
        .filter(
          (s): s is NonNullable<AttendeeSessionRow['sessions']> =>
            s != null &&
            s.status === 'scheduled' &&
            s.scheduled_for != null &&
            new Date(s.scheduled_for).getTime() > now,
        )
        .sort(
          (a, b) =>
            new Date(a.scheduled_for!).getTime() -
            new Date(b.scheduled_for!).getTime(),
        );

      setCompletedThisMonth(completed);
      setNextSession(
        upcoming[0]
          ? { scheduled_for: upcoming[0].scheduled_for!, title: upcoming[0].title }
          : null,
      );
      setLoading(false);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (loading) return null;

  const hasActivity = completedThisMonth > 0 || nextSession !== null;

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold">Your sessions</h3>
      </div>

      {hasActivity ? (
        <>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-primary">{completedThisMonth}</span>
            <span className="text-sm text-muted-foreground">
              {completedThisMonth === 1
                ? 'session completed this month'
                : 'sessions completed this month'}
            </span>
          </div>

          {nextSession ? (
            <div className="bg-muted/40 rounded-lg p-3 space-y-1">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                Next session
              </p>
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {format(new Date(nextSession.scheduled_for), 'EEEE, MMM d · h:mm a')}
                </span>
              </div>
              {nextSession.title && (
                <p className="text-xs text-muted-foreground">{nextSession.title}</p>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No upcoming sessions scheduled.</p>
          )}
        </>
      ) : (
        <p className="text-xs text-muted-foreground">
          No sessions yet — your coach will schedule these for you.
        </p>
      )}
    </Card>
  );
}
