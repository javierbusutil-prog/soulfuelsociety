import { useEffect, useState } from 'react';
import { format, addDays } from 'date-fns';
import { CalendarIcon, Dumbbell, Bike, Heart, Globe, User as UserIcon, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { BlockEditor, type EditableBlock, type EditableBlockType } from '@/components/workouts/WorkoutBlocksEditor';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

type BlockType = EditableBlockType;
type Block = EditableBlock;

export interface DailyDosePost {
  id: string;
  published_date: string;
  title: string;
  coach_note: string | null;
  workout_data: any;
  cover_image_url: string | null;
  is_published: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  audience_user_id?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post: DailyDosePost | null;
  onSaved: () => void;
  defaultAudienceUserId?: string | null;
}

const isoDate = (d: Date) => format(d, 'yyyy-MM-dd');

export function DailyDoseFormDialog({ open, onOpenChange, post, onSaved, defaultAudienceUserId }: Props) {
  const { user } = useAuth();
  const isEdit = !!post;

  const [date, setDate] = useState<Date>(addDays(new Date(), 1));
  const [title, setTitle] = useState('');
  const [coachNote, setCoachNote] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [publish, setPublish] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dateError, setDateError] = useState<string | null>(null);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [audienceUserId, setAudienceUserId] = useState<string | null>(null);
  const [paidMembers, setPaidMembers] = useState<{ id: string; full_name: string | null }[]>([]);
  const [audiencePopoverOpen, setAudiencePopoverOpen] = useState(false);
  const [memberPickerOpen, setMemberPickerOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (post) {
      setDate(new Date(post.published_date + 'T00:00:00'));
      setTitle(post.title);
      setCoachNote(post.coach_note || '');
      setCoverUrl(post.cover_image_url || '');
      const b = (post.workout_data?.blocks ?? []) as Block[];
      setBlocks(Array.isArray(b) ? b : []);
      setPublish(post.is_published);
      setAudienceUserId(post.audience_user_id ?? null);
    } else {
      setDate(addDays(new Date(), 1));
      setTitle('');
      setCoachNote('');
      setCoverUrl('');
      setBlocks([]);
      setPublish(false);
      setAudienceUserId(defaultAudienceUserId ?? null);
    }
    setDateError(null);
    setTitleError(null);
  }, [open, post, defaultAudienceUserId]);

  // Load paid members for the audience picker
  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'paid');
      const ids = Array.from(new Set((roles ?? []).map((r: any) => r.user_id))).filter(Boolean);
      if (ids.length === 0) {
        setPaidMembers([]);
        return;
      }
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', ids);
      const sorted = ((profs as any[]) ?? []).sort((a, b) =>
        (a.full_name || '').localeCompare(b.full_name || '')
      );
      setPaidMembers(sorted);
    })();
  }, [open]);

  const addBlock = (type: BlockType) => {
    const newBlock: Block = type === 'strength'
      ? { type: 'strength', exercises: [{ name: '', movementId: null, sets: '3', reps: '10', weight: '', note: '' }] }
      : type === 'cardio'
      ? { type: 'cardio', format: 'For Time', movements: '', scheme: '', note: '' }
      : { type: 'mobility', exercises: [{ name: '', movementId: null, duration: '', side: 'both', note: '' }] };
    setBlocks(prev => [...prev, newBlock]);
  };

  const removeBlock = (idx: number) => setBlocks(prev => prev.filter((_, i) => i !== idx));
  const moveBlock = (idx: number, dir: -1 | 1) => {
    setBlocks(prev => {
      const out = [...prev];
      const t = idx + dir;
      if (t < 0 || t >= out.length) return prev;
      [out[idx], out[t]] = [out[t], out[idx]];
      return out;
    });
  };
  const updateBlock = (idx: number, updater: (b: Block) => Block) => {
    setBlocks(prev => prev.map((b, i) => i === idx ? updater(b) : b));
  };

  const handleSave = async () => {
    if (!user) return;

    setDateError(null);
    setTitleError(null);
    let ok = true;

    if (!title.trim()) {
      setTitleError('Title is required');
      ok = false;
    }
    if (title.length > 100) {
      setTitleError('Max 100 characters');
      ok = false;
    }
    if (coachNote.length > 2000) {
      ok = false;
      toast.error('Coach note exceeds 2000 characters');
    }

    // Date collision check — scoped by audience (NULL == public)
    const dateStr = isoDate(date);
    let collisionQuery = supabase
      .from('daily_dose_posts' as any)
      .select('id')
      .eq('published_date', dateStr);
    if (audienceUserId === null) {
      collisionQuery = collisionQuery.is('audience_user_id', null);
    } else {
      collisionQuery = collisionQuery.eq('audience_user_id', audienceUserId);
    }
    if (post?.id) collisionQuery = collisionQuery.neq('id', post.id);
    const { data: collision } = await collisionQuery.maybeSingle();
    if (collision) {
      setDateError(audienceUserId
        ? 'A post already exists for this member on this date.'
        : 'A post already exists for this date');
      ok = false;
    }

    // Workout blocks are optional — a Daily Dose post can be published with zero blocks.

    if (!ok) return;

    setSaving(true);
    try {
      const wasPublished = post?.is_published ?? false;
      const becomingPublished = publish && !wasPublished;

      const payload: any = {
        published_date: dateStr,
        title: title.trim(),
        coach_note: coachNote.trim() || null,
        cover_image_url: coverUrl.trim() || null,
        workout_data: { blocks },
        is_published: publish,
        audience_user_id: audienceUserId,
      };

      if (post?.id) {
        const { error } = await supabase
          .from('daily_dose_posts' as any)
          .update(payload)
          .eq('id', post.id);
        if (error) throw error;
      } else {
        payload.created_by = user.id;
        const { error } = await supabase
          .from('daily_dose_posts' as any)
          .insert(payload);
        if (error) throw error;
      }

      toast.success(publish ? (becomingPublished ? 'Published!' : 'Saved') : 'Draft saved');
      onSaved();
      onOpenChange(false);
    } catch (e: any) {
      console.error(e);
      toast.error('Failed to save: ' + (e.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const selectedMember = audienceUserId
    ? paidMembers.find(m => m.id === audienceUserId)
    : null;
  const selectedMemberLabel = selectedMember?.full_name
    || (audienceUserId ? 'Selected member' : '');

  const dialogTitle = audienceUserId
    ? (isEdit ? 'Edit Personal Post' : 'New Personal Post')
    : (isEdit ? 'Edit Daily Dose' : 'New Daily Dose');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Date */}
          <div className="space-y-1.5">
            <Label>Date *</Label>
            <Popover>
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
                  onSelect={(d) => d && setDate(d)}
                  initialFocus
                  className={cn('p-3 pointer-events-auto')}
                />
              </PopoverContent>
            </Popover>
            {dateError && <p className="text-xs text-destructive">{dateError}</p>}
          </div>

          {/* Audience */}
          <div className="space-y-1.5">
            <Label>Audience</Label>
            <Popover open={audiencePopoverOpen} onOpenChange={setAudiencePopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn('w-full justify-start text-left font-normal')}
                >
                  {audienceUserId ? (
                    <>
                      <UserIcon className="mr-2 h-4 w-4" />
                      {selectedMemberLabel}
                    </>
                  ) : (
                    <>
                      <Globe className="mr-2 h-4 w-4" />
                      Public Daily Dose
                    </>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-1" align="start">
                <button
                  type="button"
                  onClick={() => {
                    setAudienceUserId(null);
                    setAudiencePopoverOpen(false);
                  }}
                  className={cn(
                    'w-full flex items-center gap-2 px-2 py-2 text-sm rounded-md hover:bg-accent text-left',
                    audienceUserId === null && 'bg-accent'
                  )}
                >
                  <Globe className="h-4 w-4" />
                  <span className="flex-1">Public Daily Dose</span>
                  {audienceUserId === null && <Check className="h-4 w-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAudiencePopoverOpen(false);
                    setMemberPickerOpen(true);
                  }}
                  className={cn(
                    'w-full flex items-center gap-2 px-2 py-2 text-sm rounded-md hover:bg-accent text-left',
                    audienceUserId !== null && 'bg-accent'
                  )}
                >
                  <UserIcon className="h-4 w-4" />
                  <span className="flex-1">
                    {audienceUserId ? `Personal program for ${selectedMemberLabel}` : 'Personal program for…'}
                  </span>
                  {audienceUserId !== null && <Check className="h-4 w-4" />}
                </button>
              </PopoverContent>
            </Popover>

            {/* Inline member picker — shown after choosing "Personal program for…" */}
            {memberPickerOpen && (
              <div className="border border-border rounded-md mt-2 overflow-hidden">
                {paidMembers.length === 0 ? (
                  <p className="text-xs text-muted-foreground p-3">No paid members yet.</p>
                ) : (
                  <Command>
                    <CommandInput placeholder="Search paid members..." />
                    <CommandList>
                      <CommandEmpty>No members found.</CommandEmpty>
                      <CommandGroup>
                        {paidMembers.map(m => (
                          <CommandItem
                            key={m.id}
                            value={`${m.full_name || ''} ${m.id}`}
                            onSelect={() => {
                              setAudienceUserId(m.id);
                              setMemberPickerOpen(false);
                            }}
                          >
                            <span className="text-sm">{m.full_name || 'Unnamed'}</span>
                            {audienceUserId === m.id && <Check className="ml-auto h-4 w-4" />}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                )}
              </div>
            )}
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <Label>Title *</Label>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              maxLength={100}
              placeholder="e.g. Push Day"
            />
            {titleError && <p className="text-xs text-destructive">{titleError}</p>}
          </div>

          {/* Coach note */}
          <div className="space-y-1.5">
            <Label>Coach note</Label>
            <Textarea
              value={coachNote}
              onChange={e => setCoachNote(e.target.value)}
              maxLength={2000}
              placeholder="Optional message to members about today's workout"
              rows={6}
              className="min-h-[160px]"
            />
            <p className="text-[10px] text-muted-foreground text-right">{coachNote.length}/2000</p>
          </div>

          {/* Cover image */}
          <div className="space-y-1.5">
            <Label>Cover image URL</Label>
            <Input
              value={coverUrl}
              onChange={e => setCoverUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>

          {/* Blocks */}
          <div className="space-y-2">
            <Label>Workout blocks</Label>
            {blocks.length === 0 && (
              <p className="text-xs text-muted-foreground italic px-1">No blocks yet. Add one below.</p>
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
            <div className="flex flex-wrap gap-2 pt-1">
              <Button size="sm" variant="outline" className="text-xs gap-1 h-7" onClick={() => addBlock('strength')}>
                <Dumbbell className="w-3 h-3" /> + Strength
              </Button>
              <Button size="sm" variant="outline" className="text-xs gap-1 h-7" onClick={() => addBlock('cardio')}>
                <Bike className="w-3 h-3" /> + Cardio
              </Button>
              <Button size="sm" variant="outline" className="text-xs gap-1 h-7" onClick={() => addBlock('mobility')}>
                <Heart className="w-3 h-3" /> + Mobility
              </Button>
            </div>
          </div>

          {/* Publish toggle */}
          <div className="flex items-center justify-between p-3 border border-border rounded-lg bg-muted/20">
            <div>
              <Label className="text-sm font-medium">Publish this post</Label>
              <p className="text-xs text-muted-foreground">When off, saves as a draft.</p>
            </div>
            <Switch checked={publish} onCheckedChange={setPublish} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : publish ? 'Publish' : 'Save draft'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

