import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { CalendarIcon, X, Check, Dumbbell } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface PaidClient {
  id: string;
  full_name: string | null;
  selected_plan: string | null;
}

interface AttendeeDetails {
  amount: string;
  paid: boolean;
}

function roundTo15(d: Date) {
  const r = new Date(d);
  const m = r.getMinutes();
  const rounded = Math.round(m / 15) * 15;
  r.setMinutes(rounded, 0, 0);
  return r;
}

function timeStr(d: Date) {
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

export default function AdminLogSession() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  const initial = roundTo15(new Date());
  const [date, setDate] = useState<Date>(initial);
  const [time, setTime] = useState<string>(timeStr(initial));
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const [clients, setClients] = useState<PaidClient[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [details, setDetails] = useState<Record<string, AttendeeDetails>>({});
  const [pickerOpen, setPickerOpen] = useState(false);

  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'paid');
      const ids = (roles ?? []).map((r: any) => r.user_id);
      if (ids.length === 0) {
        setClients([]);
        return;
      }
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, full_name, selected_plan')
        .in('id', ids);
      setClients(((profs ?? []) as PaidClient[]).sort((a, b) =>
        (a.full_name || '').localeCompare(b.full_name || '')
      ));
    })();
  }, []);

  // Pre-select from URL
  useEffect(() => {
    const param = searchParams.get('attendees');
    if (!param) return;
    const ids = param.split(',').map((s) => s.trim()).filter(Boolean);
    if (ids.length === 0) return;
    setSelectedIds((prev) => Array.from(new Set([...prev, ...ids])));
    setDetails((prev) => {
      const next = { ...prev };
      ids.forEach((id) => {
        if (!next[id]) next[id] = { amount: '', paid: false };
      });
      return next;
    });
  }, [searchParams]);

  const selectedClients = useMemo(
    () => selectedIds.map((id) => clients.find((c) => c.id === id)).filter(Boolean) as PaidClient[],
    [selectedIds, clients]
  );

  const toggleClient = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      return [...prev, id];
    });
    setDetails((prev) => {
      if (prev[id]) return prev;
      return { ...prev, [id]: { amount: '', paid: false } };
    });
  };

  const removeClient = (id: string) => {
    setSelectedIds((prev) => prev.filter((x) => x !== id));
  };

  const updateDetail = (id: string, patch: Partial<AttendeeDetails>) => {
    setDetails((prev) => ({ ...prev, [id]: { ...(prev[id] || { amount: '', paid: false }), ...patch } }));
  };

  const handleSubmit = async () => {
    if (selectedIds.length === 0) {
      toast.error('Add at least one attendee.');
      return;
    }
    if (!date || !time) {
      toast.error('Pick a date and time.');
      return;
    }
    if (!user) {
      toast.error('Not signed in.');
      return;
    }

    const [hh, mm] = time.split(':').map(Number);
    const combined = new Date(date);
    combined.setHours(hh || 0, mm || 0, 0, 0);

    setSaving(true);
    try {
      const { data: created, error } = await supabase
        .from('sessions')
        .insert({
          scheduled_for: combined.toISOString(),
          status: 'completed',
          note: note.trim() || null,
          created_by: user.id,
        })
        .select('id')
        .single();

      if (error || !created) throw error || new Error('Could not create session');

      const rows = selectedIds.map((uid) => {
        const d = details[uid] || { amount: '', paid: false };
        const amt = d.amount.trim();
        return {
          session_id: created.id,
          user_id: uid,
          amount_charged: amt === '' ? null : Number(amt),
          payment_received: d.paid,
        };
      });

      const { error: aErr } = await supabase.from('session_attendees').insert(rows);
      if (aErr) {
        // Roll back the orphaned session
        await supabase.from('sessions').delete().eq('id', created.id);
        throw aErr;
      }

      toast.success('Session logged.');
      // Reset form
      const fresh = roundTo15(new Date());
      setDate(fresh);
      setTime(timeStr(fresh));
      setSelectedIds([]);
      setDetails({});
      setNote('');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to log session.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout title="Log session">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Date & time */}
        <div className="space-y-1.5">
          <Label>Date & time *</Label>
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn('w-full justify-start text-left font-normal', !date && 'text-muted-foreground')}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, 'EEE, MMM d, yyyy') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => {
                    if (d) setDate(d);
                    setDatePickerOpen(false);
                  }}
                  initialFocus
                  className={cn('p-3 pointer-events-auto')}
                />
              </PopoverContent>
            </Popover>
            <Input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-32"
              required
            />
          </div>
        </div>

        {/* Attendees */}
        <div className="space-y-1.5">
          <Label>Attendees *</Label>

          {selectedClients.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {selectedClients.map((c) => (
                <Badge key={c.id} variant="secondary" className="gap-1.5 pl-2.5 pr-1.5 py-1">
                  {c.full_name || 'Unknown'}
                  <button
                    type="button"
                    onClick={() => removeClient(c.id)}
                    className="hover:bg-background/60 rounded p-0.5"
                    aria-label={`Remove ${c.full_name}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}

          <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start text-left font-normal text-muted-foreground">
                Add attendee…
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
              <Command>
                <CommandInput placeholder="Search clients…" />
                <CommandList>
                  <CommandEmpty>No paid clients found.</CommandEmpty>
                  <CommandGroup>
                    {clients.map((c) => {
                      const checked = selectedIds.includes(c.id);
                      return (
                        <CommandItem
                          key={c.id}
                          value={c.full_name || c.id}
                          onSelect={() => toggleClient(c.id)}
                          className="flex items-center gap-2"
                        >
                          <div className={cn(
                            'flex h-4 w-4 items-center justify-center rounded border',
                            checked ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground/40'
                          )}>
                            {checked && <Check className="h-3 w-3" />}
                          </div>
                          <span className="flex-1">{c.full_name || 'Unnamed'}</span>
                          {c.selected_plan && (
                            <span className="text-xs text-muted-foreground">{c.selected_plan}</span>
                          )}
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Per-attendee details */}
        {selectedClients.length > 0 && (
          <div className="space-y-3">
            {selectedClients.map((c) => {
              const d = details[c.id] || { amount: '', paid: false };
              return (
                <Card key={c.id}>
                  <CardContent className="p-4 space-y-3">
                    <div className="font-medium text-sm">{c.full_name || 'Unnamed'}</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Amount charged</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            className="pl-7"
                            value={d.amount}
                            onChange={(e) => updateDetail(c.id, { amount: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="flex items-end">
                        <label className="flex items-center gap-2 cursor-pointer text-sm">
                          <Checkbox
                            checked={d.paid}
                            onCheckedChange={(v) => updateDetail(c.id, { paid: v === true })}
                          />
                          Already paid
                        </label>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Note */}
        <div className="space-y-1.5">
          <Label>Note</Label>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="What did you work on? Anything notable?"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => navigate(-1)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving} className="gap-1.5">
            <Dumbbell className="h-4 w-4" />
            {saving ? 'Logging…' : 'Log session'}
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}