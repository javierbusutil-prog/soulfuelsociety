import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth } from 'date-fns';

export function InPersonSessionsCard() {
  const { user } = useAuth();
  const [sessionCount, setSessionCount] = useState<number | null>(null);
  const [remaining, setRemaining] = useState<number>(0);
  const [nextSession, setNextSession] = useState<{
    scheduled_at: string;
    coach_name: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      // Get member's plan info
      const { data: prof } = await supabase
        .from('profiles')
        .select('session_count')
        .eq('id', user.id)
        .single();

      const totalSessions = prof?.session_count || 0;
      setSessionCount(totalSessions);

      const now = new Date();
      const monthStart = startOfMonth(now).toISOString();
      const monthEnd = endOfMonth(now).toISOString();

      // Count completed/scheduled sessions this month
      const { count } = await supabase
        .from('session_bookings')
        .select('id', { count: 'exact', head: true })
        .eq('member_id', user.id)
        .in('status', ['scheduled', 'completed'])
        .gte('scheduled_at', monthStart)
        .lte('scheduled_at', monthEnd);

      setRemaining(Math.max(0, totalSessions - (count || 0)));

      // Get next upcoming session
      const { data: next } = await supabase
        .from('session_bookings')
        .select('scheduled_at, coach_id')
        .eq('member_id', user.id)
        .eq('status', 'scheduled')
        .gte('scheduled_at', now.toISOString())
        .order('scheduled_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (next) {
        let coachName: string | null = null;
        if (next.coach_id) {
          const { data: coach } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', next.coach_id)
            .single();
          coachName = coach?.full_name || null;
        }
        setNextSession({ scheduled_at: next.scheduled_at, coach_name: coachName });
      }

      setLoading(false);
    };
    fetch();
  }, [user]);

  if (loading) return null;

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold">Your sessions</h3>
      </div>

      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold text-primary">{remaining}</span>
        <span className="text-sm text-muted-foreground">sessions remaining this month</span>
      </div>

      {nextSession ? (
        <div className="bg-muted/40 rounded-lg p-3 space-y-1">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Next session</p>
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-sm font-medium">
              {format(new Date(nextSession.scheduled_at), 'EEEE, MMM d · h:mm a')}
            </span>
          </div>
          {nextSession.coach_name && (
            <div className="flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">with {nextSession.coach_name}</span>
            </div>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">No sessions booked yet</p>
      )}

      <Button asChild size="sm" variant="outline" className="w-full text-xs">
        <Link to="/book">Book a session</Link>
      </Button>
    </Card>
  );
}
