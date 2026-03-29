import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { CalendarCheck, Clock, User, CheckCircle2 } from 'lucide-react';

export default function BookConfirm() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<any>(null);
  const [coachName, setCoachName] = useState('Coach');
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [alreadyConfirmed, setAlreadyConfirmed] = useState(false);

  useEffect(() => {
    if (bookingId && user) fetchBooking();
  }, [bookingId, user]);

  const fetchBooking = async () => {
    if (!bookingId || !user) return;
    setLoading(true);

    const { data } = await supabase
      .from('session_bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (!data) {
      toast.error('Booking not found');
      navigate('/calendar');
      return;
    }

    setBooking(data);

    // Check if user is in member_ids
    const memberIds = (data as any).member_ids || [];
    if (!memberIds.includes(user.id)) {
      toast.error('You are not part of this booking');
      navigate('/calendar');
      return;
    }

    // Get coach name
    const { data: coach } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', data.coach_id)
      .single();
    if (coach) setCoachName(coach.full_name || 'Coach');

    // For now, status check — if already scheduled means already confirmed
    if (data.status === 'scheduled') {
      setAlreadyConfirmed(true);
    }

    setLoading(false);
  };

  const handleConfirm = async () => {
    if (!booking || !user || !profile) return;
    setConfirming(true);

    // In a real system we'd track individual confirmations.
    // For now, confirming sets the booking to "scheduled" and creates calendar events.
    const scheduledAt = new Date(booking.scheduled_at);

    await supabase
      .from('session_bookings')
      .update({ status: 'scheduled' } as any)
      .eq('id', booking.id);

    // Create calendar events for all members and coach
    const memberIds = (booking as any).member_ids || [booking.member_id];
    const calendarRows = memberIds.map((mid: string) => ({
      user_id: mid,
      title: `Session with ${coachName}`,
      description: `${booking.session_type} session`,
      event_date: format(scheduledAt, 'yyyy-MM-dd'),
      event_type: 'session',
    }));
    calendarRows.push({
      user_id: booking.coach_id,
      title: `Group session`,
      description: `${booking.session_type} session`,
      event_date: format(scheduledAt, 'yyyy-MM-dd'),
      event_type: 'session',
    });

    await supabase.from('calendar_events').insert(calendarRows as any);

    // Notify all members
    for (const mid of memberIds) {
      await supabase.from('notifications').insert({
        user_id: mid,
        type: 'session_booked',
        title: `Session confirmed — ${format(scheduledAt, 'EEEE, MMM d')} at ${format(scheduledAt, 'h:mm a')} with ${coachName}.`,
        body: 'Your session has been added to your calendar.',
      } as any);
    }

    toast.success('Session confirmed!');
    navigate('/calendar');
    setConfirming(false);
  };

  const formatHour = (d: Date) => format(d, 'h:mm a');

  if (loading) {
    return (
      <AppLayout>
        <div className="flex justify-center py-20">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (!booking) return null;

  const scheduledAt = new Date(booking.scheduled_at);

  return (
    <AppLayout>
      <div className="p-4 max-w-lg mx-auto space-y-4 pb-24">
        <h1 className="text-xl font-bold">Confirm group session</h1>

        <Card>
          <CardContent className="p-5 space-y-4">
            {alreadyConfirmed ? (
              <div className="text-center py-6 space-y-3">
                <CheckCircle2 className="w-10 h-10 text-chart-2 mx-auto" />
                <p className="font-medium">This session is already confirmed!</p>
                <p className="text-sm text-muted-foreground">Check your calendar for details.</p>
                <Button onClick={() => navigate('/calendar')}>Go to calendar</Button>
              </div>
            ) : booking.status === 'expired' ? (
              <div className="text-center py-6 space-y-3">
                <p className="font-medium text-destructive">This booking has expired.</p>
                <p className="text-sm text-muted-foreground">The booking wasn't confirmed in time.</p>
                <Button variant="outline" onClick={() => navigate('/book')}>Book a new session</Button>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <CalendarCheck className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium">{format(scheduledAt, 'EEEE, MMMM d, yyyy')}</p>
                      <p className="text-xs text-muted-foreground">{formatHour(scheduledAt)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-muted-foreground" />
                    <p className="text-sm">Coach: <span className="font-medium">{coachName}</span></p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-muted-foreground" />
                    <div className="flex items-center gap-2">
                      <p className="text-sm">Type:</p>
                      <Badge variant="outline">
                        {booking.session_type === 'partner' ? 'Partner' : booking.session_type === 'trio' ? 'Trio' : 'Solo'}
                      </Badge>
                    </div>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground">
                  Your group member has proposed this session. Tap confirm to add it to your calendar.
                </p>

                <Button onClick={handleConfirm} disabled={confirming} className="w-full">
                  {confirming ? 'Confirming...' : 'Confirm my spot'}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
