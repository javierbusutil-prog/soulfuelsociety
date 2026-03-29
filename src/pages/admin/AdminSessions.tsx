import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, startOfWeek, endOfWeek, addDays, isSameDay } from 'date-fns';
import { CalendarDays, List, ChevronLeft, ChevronRight, Clock, CheckCircle2, X, Edit3 } from 'lucide-react';
import { toast } from 'sonner';

interface Booking {
  id: string;
  member_id: string;
  member_name: string;
  scheduled_at: string;
  duration_minutes: number;
  session_type: string;
  status: string;
  coach_note: string | null;
  session_count: number | null;
}

export default function AdminSessions() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [coachNote, setCoachNote] = useState('');
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchBookings();
  }, [weekStart]);

  const fetchBookings = async () => {
    setLoading(true);
    const wEnd = endOfWeek(weekStart, { weekStartsOn: 1 });

    const { data } = await supabase
      .from('session_bookings')
      .select('id, member_id, scheduled_at, duration_minutes, session_type, status, coach_note')
      .gte('scheduled_at', weekStart.toISOString())
      .lte('scheduled_at', wEnd.toISOString())
      .order('scheduled_at', { ascending: true });

    if (data && data.length > 0) {
      const memberIds = [...new Set(data.map(d => d.member_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, session_count')
        .in('id', memberIds);
      const profMap = new Map(profiles?.map(p => [p.id, p]) || []);

      setBookings(data.map(d => ({
        ...d,
        member_name: profMap.get(d.member_id)?.full_name || 'Unknown',
        session_count: profMap.get(d.member_id)?.session_count || null,
      })));
    } else {
      setBookings([]);
    }
    setLoading(false);
  };

  const openDetail = (b: Booking) => {
    setSelectedBooking(b);
    setCoachNote(b.coach_note || '');
    setRescheduleDate('');
    setDetailOpen(true);
  };

  const handleComplete = async () => {
    if (!selectedBooking || !user) return;
    setSaving(true);

    await supabase
      .from('session_bookings')
      .update({ status: 'completed', coach_note: coachNote || null, updated_at: new Date().toISOString() } as any)
      .eq('id', selectedBooking.id);

    await supabase.from('session_logs').insert({
      booking_id: selectedBooking.id,
      member_ids: [selectedBooking.member_id],
      coach_id: user.id,
      scheduled_at: selectedBooking.scheduled_at,
      status: 'completed',
      coach_note: coachNote || null,
    } as any);

    if (selectedBooking.session_count && selectedBooking.session_count > 0) {
      await supabase
        .from('profiles')
        .update({ session_count: selectedBooking.session_count - 1 } as any)
        .eq('id', selectedBooking.member_id);
    }

    // Mark calendar events as completed
    await supabase
      .from('calendar_events')
      .update({ completed: true, completed_at: new Date().toISOString() } as any)
      .eq('booking_id', selectedBooking.id);

    toast.success('Session marked as completed');
    setDetailOpen(false);
    fetchBookings();
    setSaving(false);
  };

  const handleReschedule = async () => {
    if (!selectedBooking || !rescheduleDate) return;
    setSaving(true);

    const newDate = new Date(rescheduleDate);
    await supabase
      .from('session_bookings')
      .update({ scheduled_at: newDate.toISOString(), coach_note: coachNote || null, updated_at: new Date().toISOString() } as any)
      .eq('id', selectedBooking.id);

    // Update calendar events to new date
    await supabase
      .from('calendar_events')
      .update({ event_date: format(newDate, 'yyyy-MM-dd') } as any)
      .eq('booking_id', selectedBooking.id);

    toast.success('Session rescheduled');
    setDetailOpen(false);
    fetchBookings();
    setSaving(false);
  };

  const handleCancel = async () => {
    if (!selectedBooking) return;
    setSaving(true);

    await supabase
      .from('session_bookings')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() } as any)
      .eq('id', selectedBooking.id);

    // Remove calendar events for this booking
    await supabase
      .from('calendar_events')
      .delete()
      .eq('booking_id', selectedBooking.id);

    toast.success('Session cancelled');
    setDetailOpen(false);
    fetchBookings();
    setSaving(false);
  };

  const saveNote = async () => {
    if (!selectedBooking) return;
    await supabase
      .from('session_bookings')
      .update({ coach_note: coachNote, updated_at: new Date().toISOString() } as any)
      .eq('id', selectedBooking.id);
    toast.success('Note saved');
  };

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const getStatusColor = (status: string) => {
    if (status === 'completed') return 'bg-chart-2/15 text-chart-2 border-chart-2/30';
    if (status === 'cancelled') return 'bg-destructive/15 text-destructive border-destructive/30';
    return 'bg-primary/15 text-primary border-primary/30';
  };

  const getTypeLabel = (t: string) => t === 'partner' ? 'Partner' : t === 'trio' ? 'Trio' : 'Solo';

  return (
    <AdminLayout title="Sessions">
      <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={() => setWeekStart(addDays(weekStart, -7))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h3 className="text-sm font-semibold">
            {format(weekStart, 'MMM d')} — {format(addDays(weekStart, 6), 'MMM d, yyyy')}
          </h3>
          <Button variant="outline" size="sm" onClick={() => setWeekStart(addDays(weekStart, 7))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <Tabs defaultValue="week">
          <TabsList>
            <TabsTrigger value="week" className="gap-1.5 text-xs">
              <CalendarDays className="w-3.5 h-3.5" /> Week
            </TabsTrigger>
            <TabsTrigger value="list" className="gap-1.5 text-xs">
              <List className="w-3.5 h-3.5" /> List
            </TabsTrigger>
          </TabsList>

          <TabsContent value="week" className="space-y-2 mt-3">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              weekDays.map(day => {
                const dayBookings = bookings.filter(b => isSameDay(new Date(b.scheduled_at), day));
                const isToday = isSameDay(day, new Date());
                return (
                  <Card key={day.toISOString()} className={isToday ? 'border-primary/40' : ''}>
                    <CardHeader className="p-3 pb-1">
                      <CardTitle className="text-xs flex items-center gap-2">
                        <span className={isToday ? 'text-primary font-bold' : 'text-muted-foreground'}>
                          {format(day, 'EEEE, MMM d')}
                        </span>
                        {isToday && <Badge variant="default" className="text-[9px] px-1.5 py-0">Today</Badge>}
                        {dayBookings.length > 0 && (
                          <Badge variant="secondary" className="text-[9px] px-1.5 py-0">{dayBookings.length}</Badge>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-1">
                      {dayBookings.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-1">No sessions</p>
                      ) : (
                        <div className="space-y-2">
                          {dayBookings.map(b => (
                            <button
                              key={b.id}
                              onClick={() => openDetail(b)}
                              className="w-full text-left flex items-center gap-3 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                            >
                              <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{b.member_name}</p>
                                <p className="text-[11px] text-muted-foreground">
                                  {format(new Date(b.scheduled_at), 'h:mm a')} · {b.duration_minutes}min
                                </p>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0">{getTypeLabel(b.session_type)}</Badge>
                                <Badge className={`text-[10px] px-1.5 py-0 ${getStatusColor(b.status)}`}>{b.status}</Badge>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="list" className="mt-3">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : bookings.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">No sessions this week.</p>
            ) : (
              <div className="space-y-2">
                {bookings.map(b => (
                  <Card key={b.id} className="p-3 cursor-pointer hover:bg-muted/40 transition-colors" onClick={() => openDetail(b)}>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{b.member_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(b.scheduled_at), 'EEE, MMM d · h:mm a')} · {b.duration_minutes}min
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[10px]">{getTypeLabel(b.session_type)}</Badge>
                      <Badge className={`text-[10px] ${getStatusColor(b.status)}`}>{b.status}</Badge>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Session Details</DialogTitle>
            </DialogHeader>
            {selectedBooking && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Member</span>
                    <span className="text-sm font-medium">{selectedBooking.member_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Date & time</span>
                    <span className="text-sm">{format(new Date(selectedBooking.scheduled_at), 'MMM d, yyyy · h:mm a')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Type</span>
                    <Badge variant="outline">{getTypeLabel(selectedBooking.session_type)}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Remaining sessions</span>
                    <span className="text-sm font-medium">{selectedBooking.session_count ?? '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Status</span>
                    <Badge className={getStatusColor(selectedBooking.status)}>{selectedBooking.status}</Badge>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-1">Coach note (private)</p>
                  <Textarea
                    value={coachNote}
                    onChange={e => setCoachNote(e.target.value)}
                    placeholder="Add a note..."
                    className="min-h-[60px] text-sm"
                  />
                  <Button size="sm" variant="outline" className="text-xs mt-1.5" onClick={saveNote}>
                    <Edit3 className="w-3 h-3 mr-1" /> Save note
                  </Button>
                </div>

                {selectedBooking.status === 'scheduled' && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Reschedule</p>
                    <div className="flex gap-2">
                      <Input
                        type="datetime-local"
                        value={rescheduleDate}
                        onChange={e => setRescheduleDate(e.target.value)}
                        className="text-sm"
                      />
                      <Button size="sm" onClick={handleReschedule} disabled={!rescheduleDate || saving}>
                        Move
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
            <DialogFooter className="flex-col sm:flex-row gap-2">
              {selectedBooking?.status === 'scheduled' && (
                <>
                  <Button variant="destructive" size="sm" onClick={handleCancel} disabled={saving} className="gap-1">
                    <X className="w-3 h-3" /> Cancel session
                  </Button>
                  <Button size="sm" onClick={handleComplete} disabled={saving} className="gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Mark completed
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
