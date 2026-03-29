import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { CalendarIcon, Save, Trash2, Ban, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 16 }, (_, i) => i + 6); // 6am to 9pm

interface SlotState {
  [key: string]: 'open' | 'booked'; // key: "dayOfWeek-hour"
}

interface BlockedDate {
  id: string;
  blocked_date: string;
  reason: string | null;
}

export default function AdminAvailability() {
  const { user } = useAuth();
  const [slots, setSlots] = useState<SlotState>({});
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [bookedSlots, setBookedSlots] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [blockDate, setBlockDate] = useState<Date>();
  const [blockReason, setBlockReason] = useState('');

  useEffect(() => {
    if (user) fetchAll();
  }, [user]);

  const fetchAll = async () => {
    if (!user) return;
    setLoading(true);

    const [{ data: avail }, { data: blocked }, { data: bookings }] = await Promise.all([
      supabase.from('coach_availability').select('*').eq('coach_id', user.id),
      supabase.from('coach_blocked_dates').select('*').eq('coach_id', user.id).order('blocked_date'),
      supabase.from('session_bookings')
        .select('scheduled_at, coach_id')
        .eq('coach_id', user.id)
        .in('status', ['scheduled', 'pending_group_confirm']),
    ]);

    // Build slot state from availability
    const s: SlotState = {};
    avail?.forEach(a => {
      const hour = parseInt(a.start_time.split(':')[0]);
      const key = `${a.day_of_week}-${hour}`;
      s[key] = 'open';
    });

    // Mark booked slots
    const bSet = new Set<string>();
    bookings?.forEach(b => {
      const d = new Date(b.scheduled_at);
      const key = `${d.getDay()}-${d.getHours()}`;
      bSet.add(key);
    });
    setBookedSlots(bSet);

    setSlots(s);
    setBlockedDates((blocked as BlockedDate[]) || []);
    setLoading(false);
  };

  const toggleSlot = (dayOfWeek: number, hour: number) => {
    const key = `${dayOfWeek}-${hour}`;
    if (bookedSlots.has(key)) return; // can't toggle booked slots
    setSlots(prev => {
      const next = { ...prev };
      if (next[key]) {
        delete next[key];
      } else {
        next[key] = 'open';
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    // Delete all existing and re-insert
    await supabase.from('coach_availability').delete().eq('coach_id', user.id);

    const rows = Object.keys(slots).map(key => {
      const [dow, hour] = key.split('-').map(Number);
      return {
        coach_id: user.id,
        day_of_week: dow,
        start_time: `${hour.toString().padStart(2, '0')}:00:00`,
        end_time: `${(hour + 1).toString().padStart(2, '0')}:00:00`,
        is_active: true,
      };
    });

    if (rows.length > 0) {
      const { error } = await supabase.from('coach_availability').insert(rows as any);
      if (error) {
        toast.error('Failed to save: ' + error.message);
        setSaving(false);
        return;
      }
    }

    toast.success('Availability saved');
    setSaving(false);
  };

  const handleBlockDate = async () => {
    if (!user || !blockDate) return;
    const dateStr = format(blockDate, 'yyyy-MM-dd');

    const { error } = await supabase.from('coach_blocked_dates').insert({
      coach_id: user.id,
      blocked_date: dateStr,
      reason: blockReason || null,
    } as any);

    if (error) {
      if (error.code === '23505') toast.error('Date already blocked');
      else toast.error('Failed to block date');
      return;
    }

    setBlockDate(undefined);
    setBlockReason('');
    fetchAll();
    toast.success('Date blocked');
  };

  const handleRemoveBlock = async (id: string) => {
    await supabase.from('coach_blocked_dates').delete().eq('id', id);
    setBlockedDates(prev => prev.filter(d => d.id !== id));
    toast.success('Block removed');
  };

  const getSlotClass = (dayOfWeek: number, hour: number) => {
    const key = `${dayOfWeek}-${hour}`;
    if (bookedSlots.has(key)) return 'bg-chart-4/30 border-chart-4/50 cursor-not-allowed';
    if (slots[key]) return 'bg-chart-2/30 border-chart-2/50 cursor-pointer hover:bg-chart-2/40';
    return 'bg-muted/30 border-border cursor-pointer hover:bg-muted/50';
  };

  const formatHour = (h: number) => {
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hr = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return `${hr}${ampm}`;
  };

  if (loading) {
    return (
      <AdminLayout title="Availability">
        <div className="flex justify-center py-20">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Availability">
      <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">Your availability</h2>
            <p className="text-sm text-muted-foreground">Click slots to toggle availability. Green = open, orange = booked.</p>
          </div>
          <Button onClick={handleSave} disabled={saving} className="gap-1.5">
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>

        {/* Legend */}
        <div className="flex gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-chart-2/30 border border-chart-2/50" />
            <span className="text-muted-foreground">Available</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-chart-4/30 border border-chart-4/50" />
            <span className="text-muted-foreground">Booked</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-muted/30 border border-border" />
            <span className="text-muted-foreground">Unavailable</span>
          </div>
        </div>

        {/* Weekly Grid */}
        <Card>
          <CardContent className="p-3 md:p-4 overflow-x-auto">
            <div className="min-w-[600px]">
              {/* Header */}
              <div className="grid grid-cols-8 gap-1 mb-1">
                <div className="text-[10px] text-muted-foreground font-medium p-1">Time</div>
                {DAY_NAMES.map((day, i) => (
                  <div key={i} className="text-[10px] text-center font-medium text-muted-foreground p-1">{day}</div>
                ))}
              </div>
              {/* Rows */}
              {HOURS.map(hour => (
                <div key={hour} className="grid grid-cols-8 gap-1 mb-1">
                  <div className="text-[10px] text-muted-foreground flex items-center px-1">
                    {formatHour(hour)}
                  </div>
                  {DAY_NAMES.map((_, dayIdx) => (
                    <button
                      key={dayIdx}
                      onClick={() => toggleSlot(dayIdx, hour)}
                      className={cn(
                        'h-7 rounded border transition-colors text-[9px]',
                        getSlotClass(dayIdx, hour)
                      )}
                    >
                      {bookedSlots.has(`${dayIdx}-${hour}`) && (
                        <Clock className="w-2.5 h-2.5 mx-auto text-chart-4" />
                      )}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Block dates */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Ban className="w-4 h-4 text-muted-foreground" /> Block a date
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-3 items-end">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn('w-48 justify-start text-left text-sm', !blockDate && 'text-muted-foreground')}>
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    {blockDate ? format(blockDate, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={blockDate}
                    onSelect={setBlockDate}
                    disabled={d => d < new Date()}
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
              <Input
                placeholder="Reason (optional)"
                value={blockReason}
                onChange={e => setBlockReason(e.target.value)}
                className="w-48 h-10"
              />
              <Button onClick={handleBlockDate} disabled={!blockDate} size="sm">
                Block date
              </Button>
            </div>

            {blockedDates.length > 0 && (
              <div className="space-y-2 pt-2">
                {blockedDates.map(bd => (
                  <div key={bd.id} className="flex items-center justify-between py-1.5 px-3 bg-destructive/5 rounded-lg border border-destructive/20">
                    <div>
                      <span className="text-sm font-medium">{format(new Date(bd.blocked_date + 'T12:00:00'), 'EEEE, MMM d, yyyy')}</span>
                      {bd.reason && <span className="text-xs text-muted-foreground ml-2">— {bd.reason}</span>}
                    </div>
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => handleRemoveBlock(bd.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
