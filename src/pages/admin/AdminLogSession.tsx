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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarIcon, X, Check, Dumbbell, CalendarPlus, Bike, Heart } from 'lucide-react';
import { BlockEditor, type EditableBlock, type EditableBlockType } from '@/components/workouts/WorkoutBlocksEditor';
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

type Block = EditableBlock;
type BlockType = EditableBlockType;

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

  const [mode, setMode] = useState<'log_past' | 'schedule_future'>('log_past');

  const initial = roundTo15(new Date());
  const [date, setDate] = useState<Date>(initial);
  const [time, setTime] = useState<string>(timeStr(initial));
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const [clients, setClients] = useState<PaidClient[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [details, setDetails] = useState<Record<string, AttendeeDetails>>({});
  const [pickerOpen, setPickerOpen] = useState(false);

  const [note, setNote] = useState('');
  const [title, setTitle] = useState('');
  const [blocks, setBlocks] = useState<Block[]>([]);
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

  const addBlock = (type: BlockType) => {
    const newBlock: Block =
      type === 'strength'
        ? { type: 'strength', exercises: [{ name: '', movementId: null, sets: '3', reps: '10', weight: '', note: '' }] }
        : type === 'cardio'
        ? { type: 'cardio', format: 'For Time', movements: '', scheme: '', note: '' }
        : { type: 'mobility', exercises: [{ name: '', movementId: null, duration: '', side: 'both', note: '' }] };
    setBlocks((prev) => [...prev, newBlock]);
  };
  const removeBlock = (idx: number) => setBlocks((prev) => prev.filter((_, i) => i !== idx));
  const moveBlock = (idx: number, dir: -1 | 1) => {
    setBlocks((prev) => {
      const out = [...prev];
      const t = idx + dir;
      if (t < 0 || t >= out.length) return prev;
      [out[idx], out[t]] = [out[t], out[idx]];
      return out;
    });
  };
  const updateBlock = (idx: number, updater: (b: Block) => Block) => {
    setBlocks((prev) => prev.map((b, i) => (i === idx ? updater(b) : b)));
  };

  const handleModeChange = (next: 'log_past' | 'schedule_future') => {
    setMode(next);
    if (next === 'schedule_future') {
      setDetails((prev) => {
        const cleared: Record<string, AttendeeDetails> = {};
        Object.keys(prev).forEach((k) => {
          cleared[k] = { amount: '', paid: false };
        });
        return cleared;
      });
    }
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

    const now = new Date();
    if (mode === 'log_past' && combined.getTime() > now.getTime()) {
      toast.error('Past session date must be in the past or now.');
      return;
    }
    if (mode === 'schedule_future' && combined.getTime() <= now.getTime()) {
      toast.error('Scheduled session must be in the future.');
      return;
    }

    const sessionStatus = mode === 'log_past' ? 'completed' : 'scheduled';

    setSaving(true);
    try {
      const { data: created, error } = await supabase
        .from('sessions')
        .insert({
          scheduled_for: combined.toISOString(),
          status: sessionStatus,
          note: note.trim() || null,
          title: title.trim() || null,
          workout_data: blocks.length > 0 ? ({ blocks } as any) : null,
          created_by: user.id,
        })
        .select('id')
        .single();

      if (error || !created) throw error || new Error('Could not create session');

      const rows = selectedIds.map((uid) => {
        const d = details[uid] || { amount: '', paid: false };
        const isSchedule = mode === 'schedule_future';
        return {
          session_id: created.id,
          user_id: uid,
          amount_charged: isSchedule ? null : (d.amount.trim() === '' ? null : Number(d.amount)),
          payment_received: isSchedule ? false : d.paid,
        };
      });

      const { error: aErr } = await supabase.from('session_attendees').insert(rows);
      if (aErr) {
        // Roll back the orphaned session
        await supabase.from('sessions').delete().eq('id', created.id);
        throw aErr;
      }

      toast.success(mode === 'log_past' ? 'Session logged.' : 'Session scheduled.');
      // Reset form
      const fresh = roundTo15(new Date());
      setDate(fresh);
      setTime(timeStr(fresh));
      setSelectedIds([]);
      setDetails({});
      setNote('');
      setTitle('');
      setBlocks([]);
    } catch (err: any) {
      toast.error(err?.message || (mode === 'log_past' ? 'Failed to log session.' : 'Failed to schedule session.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout title={mode === 'log_past' ? 'Log past session' : 'Schedule session'}>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Mode toggle */}
        <Tabs value={mode} onValueChange={(v) => handleModeChange(v as 'log_past' | 'schedule_future')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="log_past">Log past session</TabsTrigger>
            <TabsTrigger value="schedule_future">Schedule future session</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Title */}
        <div className="space-y-1.5">
          <Label>Title (optional)</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
            placeholder="e.g. Lower body strength"
          />
        </div>

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
        {mode === 'log_past' && selectedClients.length > 0 && (
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
        {/* Workout blocks */}
        <div className="space-y-3">
          <Label>Workout (optional)</Label>
          {blocks.length === 0 && (
            <p className="text-sm text-muted-foreground">No blocks yet. Add one below.</p>
          )}
          {blocks.map((block, bi) => (
            <BlockEditor
              key={bi}
              block={block}
              blockIdx={bi}
              totalBlocks={blocks.length}
              onUpdate={(updater) => updateBlock(bi, updater)}
              onRemove={() => removeBlock(bi)}
              onMove={(dir) => moveBlock(bi, dir)}
            />
          ))}
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => addBlock('strength')}>
              <Dumbbell className="h-4 w-4 mr-1.5" /> + Strength
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => addBlock('cardio')}>
              <Bike className="h-4 w-4 mr-1.5" /> + Cardio
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => addBlock('mobility')}>
              <Heart className="h-4 w-4 mr-1.5" /> + Mobility
            </Button>
          </div>
        </div>

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
            {mode === 'log_past' ? <Dumbbell className="h-4 w-4" /> : <CalendarPlus className="h-4 w-4" />}
            {saving
              ? (mode === 'log_past' ? 'Logging…' : 'Scheduling…')
              : (mode === 'log_past' ? 'Log session' : 'Schedule session')}
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}