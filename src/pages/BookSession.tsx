import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  format, startOfMonth, endOfMonth, isSameDay, isBefore, startOfDay,
  addMonths, getDaysInMonth
} from 'date-fns';
import { CalendarCheck, Clock, User, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AvailableSlot {
  coach_id: string;
  coach_name: string;
  start_time: string; // "HH:00"
  hour: number;
}

interface GroupMember {
  user_id: string;
  full_name: string;
}

export default function BookSession() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [availableDays, setAvailableDays] = useState<Set<string>>(new Set());
  const [daySlots, setDaySlots] = useState<AvailableSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [booking, setBooking] = useState(false);
  const [remainingSessions, setRemainingSessions] = useState<number>(0);
  const [totalSessions, setTotalSessions] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // All availability & blocked dates cached
  const [allAvailability, setAllAvailability] = useState<any[]>([]);
  const [allBlockedDates, setAllBlockedDates] = useState<any[]>([]);
  const [allBookings, setAllBookings] = useState<any[]>([]);
  const [coachNames, setCoachNames] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    if (user) fetchAll();
  }, [user]);

  const fetchAll = async () => {
    if (!user || !profile) return;
    setLoading(true);

    const sessionCount = profile.session_count || 0;
    setTotalSessions(sessionCount);

    // Get this month's bookings for this member
    const monthStart = startOfMonth(new Date());
    const monthEnd = endOfMonth(new Date());

    const [
      { data: avail },
      { data: blocked },
      { data: monthBookings },
      { data: allMonthBookings },
    ] = await Promise.all([
      supabase.from('coach_availability').select('*').eq('is_active', true),
      supabase.from('coach_blocked_dates').select('*'),
      supabase.from('session_bookings')
        .select('id, status')
        .eq('member_id', user.id)
        .gte('scheduled_at', monthStart.toISOString())
        .lte('scheduled_at', monthEnd.toISOString())
        .in('status', ['scheduled', 'completed', 'pending_group_confirm']),
      supabase.from('session_bookings')
        .select('id, scheduled_at, coach_id, status')
        .gte('scheduled_at', new Date().toISOString())
        .in('status', ['scheduled', 'pending_group_confirm']),
    ]);

    const usedSessions = monthBookings?.length || 0;
    setRemainingSessions(Math.max(0, sessionCount - usedSessions));

    setAllAvailability(avail || []);
    setAllBlockedDates(blocked || []);
    setAllBookings(allMonthBookings || []);

    // Get coach names
    const coachIds = [...new Set((avail || []).map(a => a.coach_id))];
    if (coachIds.length > 0) {
      const { data: coaches } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', coachIds);
      const nameMap = new Map<string, string>();
      coaches?.forEach(c => nameMap.set(c.id, c.full_name || 'Coach'));
      setCoachNames(nameMap);
    }

    // Get group members for partner/trio
    const groupSize = profile.group_size;
    if (groupSize && (groupSize === '2' || groupSize === '3')) {
      // Find group via group_memberships  
      const { data: myGroups } = await supabase
        .from('group_memberships')
        .select('group_id')
        .eq('user_id', user.id);

      if (myGroups && myGroups.length > 0) {
        const groupIds = myGroups.map(g => g.group_id);
        const { data: members } = await supabase
          .from('group_memberships')
          .select('user_id')
          .in('group_id', groupIds)
          .neq('user_id', user.id);

        if (members && members.length > 0) {
          const memberIds = [...new Set(members.map(m => m.user_id))];
          const { data: memberProfiles } = await supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', memberIds);

          setGroupMembers(
            (memberProfiles || []).map(p => ({ user_id: p.id, full_name: p.full_name || 'Member' }))
          );
        }
      }
    }

    // Calculate available days for calendar
    computeAvailableDays(avail || [], blocked || [], allMonthBookings || []);

    setLoading(false);
  };

  const computeAvailableDays = (avail: any[], blocked: any[], bookings: any[]) => {
    const blockedSet = new Set(blocked.map((b: any) => b.blocked_date));
    const today = startOfDay(new Date());
    const days = new Set<string>();

    // Check next 60 days
    for (let i = 0; i < 60; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const dateStr = format(d, 'yyyy-MM-dd');
      const dayOfWeek = d.getDay();

      // Check if any coach has availability on this day and isn't blocked
      const hasAvail = avail.some(a => {
        if (a.day_of_week !== dayOfWeek) return false;
        // Check if this coach is blocked on this date
        if (blocked.some((b: any) => b.coach_id === a.coach_id && b.blocked_date === dateStr)) return false;
        // Check if this slot is already booked
        const slotTime = new Date(d);
        const hour = parseInt(a.start_time.split(':')[0]);
        slotTime.setHours(hour, 0, 0, 0);
        const isBooked = bookings.some((bk: any) =>
          bk.coach_id === a.coach_id &&
          isSameDay(new Date(bk.scheduled_at), d) &&
          new Date(bk.scheduled_at).getHours() === hour
        );
        return !isBooked;
      });

      if (hasAvail) days.add(dateStr);
    }

    setAvailableDays(days);
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    setSelectedDate(date);
    setSelectedSlot(null);

    const dateStr = format(date, 'yyyy-MM-dd');
    const dayOfWeek = date.getDay();
    const blockedSet = new Set(allBlockedDates.map((b: any) => `${b.coach_id}-${b.blocked_date}`));

    const slots: AvailableSlot[] = [];
    allAvailability
      .filter(a => a.day_of_week === dayOfWeek)
      .forEach(a => {
        if (blockedSet.has(`${a.coach_id}-${dateStr}`)) return;
        const hour = parseInt(a.start_time.split(':')[0]);
        // Check if booked
        const isBooked = allBookings.some(bk =>
          bk.coach_id === a.coach_id &&
          isSameDay(new Date(bk.scheduled_at), date) &&
          new Date(bk.scheduled_at).getHours() === hour
        );
        if (!isBooked) {
          slots.push({
            coach_id: a.coach_id,
            coach_name: coachNames.get(a.coach_id) || 'Coach',
            start_time: a.start_time,
            hour,
          });
        }
      });

    slots.sort((a, b) => a.hour - b.hour);
    setDaySlots(slots);
  };

  const formatHour = (h: number) => {
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hr = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return `${hr}:00 ${ampm}`;
  };

  const sessionType = () => {
    const gs = profile?.group_size;
    if (gs === '2') return 'partner';
    if (gs === '3') return 'trio';
    return 'solo';
  };

  const isGroupBooking = () => {
    const st = sessionType();
    return st === 'partner' || st === 'trio';
  };

  const handleConfirmBooking = async () => {
    if (!user || !selectedDate || !selectedSlot || !profile) return;
    setBooking(true);

    try {
      const scheduledAt = new Date(selectedDate);
      scheduledAt.setHours(selectedSlot.hour, 0, 0, 0);

      const sType = sessionType();
      const isGroup = isGroupBooking();
      const status = isGroup ? 'pending_group_confirm' : 'scheduled';
      const allMemberIds = [user.id, ...groupMembers.map(m => m.user_id)];

      // Create booking
      const { data: newBooking, error } = await supabase
        .from('session_bookings')
        .insert({
          member_id: user.id,
          member_ids: allMemberIds,
          coach_id: selectedSlot.coach_id,
          scheduled_at: scheduledAt.toISOString(),
          session_type: sType,
          status,
          duration_minutes: 60,
        } as any)
        .select('id')
        .single();

      if (error) throw error;

      if (!isGroup) {
        // Solo: Add calendar events for member and coach
        await supabase.from('calendar_events').insert([
          {
            user_id: user.id,
            title: `Session with ${selectedSlot.coach_name}`,
            description: `${sType} session`,
            event_date: format(scheduledAt, 'yyyy-MM-dd'),
            event_type: 'session',
            booking_id: newBooking.id,
          },
          {
            user_id: selectedSlot.coach_id,
            title: `Session with ${profile.full_name || 'Member'}`,
            description: `${sType} session`,
            event_date: format(scheduledAt, 'yyyy-MM-dd'),
            event_type: 'session',
            booking_id: newBooking.id,
          },
        ] as any);

        // Notify member
        await supabase.from('notifications').insert({
          user_id: user.id,
          type: 'session_booked',
          title: `Session confirmed — ${format(scheduledAt, 'EEEE, MMM d')} at ${formatHour(selectedSlot.hour)} with ${selectedSlot.coach_name}.`,
          body: 'Your session has been added to your calendar.',
        } as any);
      }

      // Notify coach
      await supabase.from('notifications').insert({
        user_id: selectedSlot.coach_id,
        type: 'session_booked',
        title: `${profile.full_name || 'A member'} booked a session on ${format(scheduledAt, 'EEEE, MMM d')} at ${formatHour(selectedSlot.hour)}.`,
        body: `${sType} session${isGroup ? ' — awaiting group confirmation' : ''}`,
      } as any);

      // For group booking, notify other members
      if (isGroup) {
        for (const member of groupMembers) {
          await supabase.from('notifications').insert({
            user_id: member.user_id,
            type: 'group_session_confirm',
            title: `${profile.full_name || 'Your group member'} has proposed a session on ${format(scheduledAt, 'EEEE, MMM d')} at ${formatHour(selectedSlot.hour)} — tap to confirm your spot.`,
            body: 'Open to confirm.',
            reference_id: newBooking.id,
          } as any);
        }
      }

      toast.success(isGroup ? 'Session proposed — waiting for group confirmation' : 'Session booked!');
      setConfirmOpen(false);
      navigate('/calendar');
    } catch (e: any) {
      console.error(e);
      toast.error('Failed to book: ' + (e.message || 'Unknown error'));
    } finally {
      setBooking(false);
    }
  };

  const nextMonthReset = format(startOfMonth(addMonths(new Date(), 1)), 'MMMM d');
  const noSessions = remainingSessions <= 0;

  if (loading) {
    return (
      <AppLayout>
        <div className="flex justify-center py-20">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-4 max-w-lg mx-auto space-y-4 pb-24">
        <h1 className="text-xl font-bold">Book a session</h1>

        {/* Remaining sessions */}
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <CalendarCheck className="w-5 h-5 text-primary shrink-0" />
            <div className="flex-1">
              {noSessions ? (
                <>
                  <p className="text-sm font-medium text-destructive">You've used all your sessions this month.</p>
                  <p className="text-xs text-muted-foreground">Your sessions reset on {nextMonthReset}.</p>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium">{remainingSessions} session{remainingSessions !== 1 ? 's' : ''} remaining this month</p>
                  <p className="text-xs text-muted-foreground">of {totalSessions} total</p>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {!noSessions && (
          <>
            {/* Calendar */}
            <Card>
              <CardContent className="p-3 flex justify-center">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  month={currentMonth}
                  onMonthChange={setCurrentMonth}
                  disabled={(date) => {
                    if (isBefore(date, startOfDay(new Date()))) return true;
                    const dateStr = format(date, 'yyyy-MM-dd');
                    return !availableDays.has(dateStr);
                  }}
                  className={cn("p-3 pointer-events-auto")}
                />
              </CardContent>
            </Card>

            {/* Time slots */}
            {selectedDate && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">
                    Available slots — {format(selectedDate, 'EEEE, MMM d')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {daySlots.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">No available slots on this date.</p>
                  ) : (
                    daySlots.map((slot, i) => (
                      <button
                        key={i}
                        onClick={() => { setSelectedSlot(slot); setConfirmOpen(true); }}
                        className={cn(
                          'w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left',
                          selectedSlot === slot
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:bg-muted/40'
                        )}
                      >
                        <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{formatHour(slot.hour)}</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <User className="w-3 h-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">{slot.coach_name}</span>
                        </div>
                      </button>
                    ))
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Confirmation Dialog */}
        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Confirm booking</DialogTitle>
            </DialogHeader>
            {selectedSlot && selectedDate && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Date</span>
                    <span className="font-medium">{format(selectedDate, 'EEEE, MMM d, yyyy')}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Time</span>
                    <span className="font-medium">{formatHour(selectedSlot.hour)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Coach</span>
                    <span className="font-medium">{selectedSlot.coach_name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Type</span>
                    <Badge variant="outline">{sessionType() === 'partner' ? 'Partner' : sessionType() === 'trio' ? 'Trio' : 'Solo'}</Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Remaining after</span>
                    <span className="font-medium">{remainingSessions - 1}</span>
                  </div>
                </div>

                {isGroupBooking() && groupMembers.length > 0 && (
                  <div className="p-2.5 rounded-lg bg-muted/50 border border-border">
                    <p className="text-xs font-medium mb-1">Group members will be notified:</p>
                    {groupMembers.map(m => (
                      <p key={m.user_id} className="text-xs text-muted-foreground">• {m.full_name}</p>
                    ))}
                  </div>
                )}

                <div className="p-2.5 rounded-lg bg-muted/50 border border-border">
                  <div className="flex gap-2">
                    <AlertCircle className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                    <p className="text-xs text-muted-foreground">
                      You can cancel up to 24 hours before your session at no cost. Cancellations within 24 hours count as a used session.
                    </p>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button>
              <Button onClick={handleConfirmBooking} disabled={booking}>
                {booking ? 'Booking...' : 'Confirm booking'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
