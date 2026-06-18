import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfWeek, endOfWeek, addDays, isSameDay } from 'date-fns';
import { CalendarDays, List, ChevronLeft, ChevronRight, Clock, CheckCircle2, X, Edit3, CalendarClock } from 'lucide-react';
import { toast } from 'sonner';

interface AttendeeRow {
  user_id: string;
  name: string;
  amount_charged: number | null;
  payment_received: boolean;
}


interface SessionRow {
  id: string;
  scheduled_for: string;
  status: string;
  note: string | null;
  title: string | null;
  attendees: AttendeeRow[];
  attendee_names: string[];
}

interface PaymentDraft {
  user_id: string;
  name: string;
  amount: string; // text input
  paid: boolean;
}


export default function AdminSessions() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selected, setSelected] = useState<SessionRow | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [coachNote, setCoachNote] = useState('');
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [payments, setPayments] = useState<PaymentDraft[]>([]);

  useEffect(() => {
    fetchSessions();
  }, [weekStart]);

  const fetchSessions = async () => {
    setLoading(true);
    const wEnd = endOfWeek(weekStart, { weekStartsOn: 1 });

    const { data, error } = await supabase
      .from('sessions')
      .select('id, scheduled_for, status, note, title, session_attendees(user_id, amount_charged, payment_received, profiles(full_name))')
      .gte('scheduled_for', weekStart.toISOString())
      .lte('scheduled_for', wEnd.toISOString())
      .order('scheduled_for', { ascending: true });

    if (error) {
      console.error('AdminSessions: failed to load sessions', error);
      setSessions([]);
      setLoading(false);
      return;
    }

    const rows: SessionRow[] = (data ?? []).map((s: any) => {
      const attendees: AttendeeRow[] = (s.session_attendees ?? []).map((a: any) => ({
        user_id: a.user_id,
        name: a.profiles?.full_name || 'Unknown',
        amount_charged: a.amount_charged,
        payment_received: !!a.payment_received,
      }));
      return {
        id: s.id,
        scheduled_for: s.scheduled_for,
        status: s.status,
        note: s.note,
        title: s.title,
        attendees,
        attendee_names: attendees.map((a) => a.name),
      };
    });

    setSessions(rows);
    setLoading(false);
  };

  const openDetail = (s: SessionRow) => {
    setSelected(s);
    setCoachNote(s.note || '');
    setRescheduleDate('');
    setPayments(
      s.attendees.map((a) => ({
        user_id: a.user_id,
        name: a.name,
        amount: a.amount_charged == null ? '' : String(a.amount_charged),
        paid: a.payment_received,
      }))
    );
    setDetailOpen(true);
  };

  const writeAttendeePayments = async () => {
    for (const p of payments) {
      const trimmed = p.amount.trim();
      const amt = trimmed === '' ? null : Number(trimmed);
      if (amt != null && (isNaN(amt) || amt < 0)) {
        toast.error(`Invalid amount for ${p.name}`);
        return false;
      }
      const { error } = await (supabase as any)
        .from('session_attendees')
        .update({ amount_charged: amt, payment_received: p.paid })
        .eq('session_id', selected!.id)
        .eq('user_id', p.user_id);
      if (error) {
        console.error('attendee payment update failed', error);
        toast.error(`Failed to save payment for ${p.name}`);
        return false;
      }
    }
    return true;
  };

  const handleComplete = async () => {
    if (!selected) return;
    setSaving(true);
    const ok = await writeAttendeePayments();
    if (!ok) {
      setSaving(false);
      return;
    }
    const { error } = await supabase
      .from('sessions')
      .update({ status: 'completed', note: coachNote || null })
      .eq('id', selected.id);
    if (error) {
      toast.error('Failed to complete session');
    } else {
      toast.success('Session marked as completed');
      setDetailOpen(false);
      fetchSessions();
    }
    setSaving(false);
  };

  const handleSavePayment = async () => {
    if (!selected) return;
    setSaving(true);
    const ok = await writeAttendeePayments();
    setSaving(false);
    if (ok) {
      toast.success('Payment saved');
      setDetailOpen(false);
      fetchSessions();
    }
  };

  const updatePayment = (userId: string, patch: Partial<PaymentDraft>) => {
    setPayments((prev) => prev.map((p) => (p.user_id === userId ? { ...p, ...patch } : p)));
  };

  const handleReschedule = async () => {
    if (!selected || !rescheduleDate) return;
    setSaving(true);
    const { error } = await supabase
      .from('sessions')
      .update({ scheduled_for: new Date(rescheduleDate).toISOString(), note: coachNote || null })
      .eq('id', selected.id);
    if (error) {
      toast.error('Failed to reschedule');
    } else {
      toast.success('Session rescheduled');
      setDetailOpen(false);
      fetchSessions();
    }
    setSaving(false);
  };

  const handleCancel = async () => {
    if (!selected) return;
    setSaving(true);
    const { error } = await supabase
      .from('sessions')
      .update({ status: 'didnt_happen' })
      .eq('id', selected.id);
    if (error) {
      toast.error('Failed to cancel session');
    } else {
      toast.success('Session cancelled');
      setDetailOpen(false);
      fetchSessions();
    }
    setSaving(false);
  };

  const saveNote = async () => {
    if (!selected) return;
    const { error } = await supabase
      .from('sessions')
      .update({ note: coachNote })
      .eq('id', selected.id);
    if (error) toast.error('Failed to save note');
    else toast.success('Note saved');
  };

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const getStatusColor = (status: string) => {
    if (status === 'completed') return 'bg-chart-2/15 text-chart-2 border-chart-2/30';
    if (status === 'didnt_happen') return 'bg-destructive/15 text-destructive border-destructive/30';
    return 'bg-primary/15 text-primary border-primary/30';
  };

  const getStatusLabel = (status: string) =>
    status === 'didnt_happen' ? "didn't happen" : status;

  const getTypeLabel = (count: number) =>
    count >= 3 ? 'Trio' : count === 2 ? 'Partner' : 'Solo';

  const namesLabel = (names: string[]) =>
    names.length === 0 ? 'No attendees' : names.join(', ');

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
        <Button size="sm" className="gap-1.5" onClick={() => navigate('/admin/sessions/log')}>
          <CalendarClock className="w-4 h-4" /> Log session
        </Button>

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
              weekDays.map((day) => {
                const daySessions = sessions.filter((s) => isSameDay(new Date(s.scheduled_for), day));
                const isToday = isSameDay(day, new Date());
                return (
                  <Card key={day.toISOString()} className={isToday ? 'border-primary/40' : ''}>
                    <CardHeader className="p-3 pb-1">
                      <CardTitle className="text-xs flex items-center gap-2">
                        <span className={isToday ? 'text-primary font-bold' : 'text-muted-foreground'}>
                          {format(day, 'EEEE, MMM d')}
                        </span>
                        {isToday && <Badge variant="default" className="text-[9px] px-1.5 py-0">Today</Badge>}
                        {daySessions.length > 0 && (
                          <Badge variant="secondary" className="text-[9px] px-1.5 py-0">{daySessions.length}</Badge>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-1">
                      {daySessions.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-1">No sessions</p>
                      ) : (
                        <div className="space-y-2">
                          {daySessions.map((s) => (
                            <button
                              key={s.id}
                              onClick={() => openDetail(s)}
                              className="w-full text-left flex items-center gap-3 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                            >
                              <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{namesLabel(s.attendee_names)}</p>
                                <p className="text-[11px] text-muted-foreground">
                                  {format(new Date(s.scheduled_for), 'h:mm a')}
                                  {s.title ? ` · ${s.title}` : ''}
                                </p>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                  {getTypeLabel(s.attendee_names.length)}
                                </Badge>
                                <Badge className={`text-[10px] px-1.5 py-0 ${getStatusColor(s.status)}`}>
                                  {getStatusLabel(s.status)}
                                </Badge>
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
            ) : sessions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">No sessions this week.</p>
            ) : (
              <div className="space-y-2">
                {sessions.map((s) => (
                  <Card key={s.id} className="p-3 cursor-pointer hover:bg-muted/40 transition-colors" onClick={() => openDetail(s)}>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{namesLabel(s.attendee_names)}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(s.scheduled_for), 'EEE, MMM d · h:mm a')}
                          {s.title ? ` · ${s.title}` : ''}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[10px]">{getTypeLabel(s.attendee_names.length)}</Badge>
                      <Badge className={`text-[10px] ${getStatusColor(s.status)}`}>{getStatusLabel(s.status)}</Badge>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Session Details</DialogTitle>
            </DialogHeader>
            {selected && (
              <Tabs defaultValue="details" className="w-full">
                <TabsList className="grid grid-cols-2 w-full">
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="payment" disabled={payments.length === 0}>Payment</TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="space-y-4 mt-4">
                  <div className="rounded-lg border bg-card divide-y">
                    <div className="flex items-center justify-between px-3 py-2">
                      <span className="text-sm text-muted-foreground">Attendees</span>
                      <span className="text-sm font-medium text-right">{namesLabel(selected.attendee_names)}</span>
                    </div>
                    <div className="flex items-center justify-between px-3 py-2">
                      <span className="text-sm text-muted-foreground">Date & time</span>
                      <span className="text-sm">{format(new Date(selected.scheduled_for), 'MMM d, yyyy · h:mm a')}</span>
                    </div>
                    <div className="flex items-center justify-between px-3 py-2">
                      <span className="text-sm text-muted-foreground">Type</span>
                      <Badge variant="outline">{getTypeLabel(selected.attendee_names.length)}</Badge>
                    </div>
                    <div className="flex items-center justify-between px-3 py-2">
                      <span className="text-sm text-muted-foreground">Status</span>
                      <Badge className={getStatusColor(selected.status)}>{getStatusLabel(selected.status)}</Badge>
                    </div>
                  </div>

                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground mb-1.5">Note</p>
                    <Textarea
                      value={coachNote}
                      onChange={(e) => setCoachNote(e.target.value)}
                      placeholder="Add a note..."
                      className="min-h-[70px] text-sm"
                    />
                    <Button size="sm" variant="outline" className="text-xs mt-2" onClick={saveNote}>
                      <Edit3 className="w-3 h-3 mr-1" /> Save note
                    </Button>
                  </div>

                  {selected.status === 'scheduled' && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1.5">Reschedule</p>
                      <div className="flex gap-2">
                        <Input
                          type="datetime-local"
                          value={rescheduleDate}
                          onChange={(e) => setRescheduleDate(e.target.value)}
                          className="text-sm"
                        />
                        <Button size="sm" onClick={handleReschedule} disabled={!rescheduleDate || saving}>
                          Move
                        </Button>
                      </div>
                    </div>
                  )}

                  <DialogFooter className="flex-col sm:flex-row gap-2 pt-2">
                    <Button variant="outline" size="sm" onClick={() => navigate(`/admin/sessions/${selected.id}/edit`)} className="gap-1">
                      <Edit3 className="w-3 h-3" /> Edit
                    </Button>
                    {selected.status === 'scheduled' && (
                      <Button variant="destructive" size="sm" onClick={handleCancel} disabled={saving} className="gap-1">
                        <X className="w-3 h-3" /> Cancel session
                      </Button>
                    )}
                  </DialogFooter>
                </TabsContent>

                <TabsContent value="payment" className="space-y-4 mt-4">
                  <p className="text-xs text-muted-foreground">Optional — can be added later.</p>
                  <div className="space-y-2">
                    {payments.map((p) => (
                      <div key={p.user_id} className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-secondary/50">
                        <p className="flex-1 min-w-0 text-sm font-medium truncate">{p.name}</p>
                        <div className="relative shrink-0">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">$</span>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0"
                            value={p.amount}
                            onChange={(e) => updatePayment(p.user_id, { amount: e.target.value })}
                            className="h-8 pl-5 pr-2 text-sm w-[72px]"
                          />
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 pl-1">
                          <Switch
                            id={`paid-${p.user_id}`}
                            checked={p.paid}
                            onCheckedChange={(v) => updatePayment(p.user_id, { paid: v })}
                          />
                          <Label htmlFor={`paid-${p.user_id}`} className="text-xs">Paid</Label>
                        </div>
                      </div>
                    ))}
                  </div>

                  <DialogFooter className="pt-2">
                    {selected.status === 'scheduled' ? (
                      <Button size="sm" onClick={handleComplete} disabled={saving} className="gap-1 w-full sm:w-auto">
                        <CheckCircle2 className="w-3 h-3" /> Complete & save payment
                      </Button>
                    ) : (
                      <Button size="sm" onClick={handleSavePayment} disabled={saving} className="w-full sm:w-auto">
                        Save payment
                      </Button>
                    )}
                  </DialogFooter>
                </TabsContent>
              </Tabs>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
