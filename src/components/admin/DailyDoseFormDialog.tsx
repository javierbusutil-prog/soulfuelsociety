import { useEffect, useState } from 'react';
import { format, addDays } from 'date-fns';
import { CalendarIcon, Plus, Trash2, Dumbbell, Bike, Heart, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { MovementPicker } from '@/components/movements/MovementPicker';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// NOTE: Block types duplicated from AdminProgramBuilder. Tech debt: extract to shared module.
type BlockType = 'strength' | 'cardio' | 'mobility';

interface StrengthExercise {
  name: string;
  movementId?: string | null;
  sets: string;
  reps: string;
  weight: string;
  note: string;
}
interface StrengthBlock { type: 'strength'; exercises: StrengthExercise[]; }
interface CardioBlock { type: 'cardio'; format: string; movements: string; scheme: string; note: string; }
interface MobilityExercise {
  name: string;
  movementId?: string | null;
  duration: string;
  side: string;
  note: string;
}
interface MobilityBlock { type: 'mobility'; exercises: MobilityExercise[]; }
type Block = StrengthBlock | CardioBlock | MobilityBlock;

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
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post: DailyDosePost | null;
  onSaved: () => void;
}

const isoDate = (d: Date) => format(d, 'yyyy-MM-dd');

export function DailyDoseFormDialog({ open, onOpenChange, post, onSaved }: Props) {
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
  const [blocksError, setBlocksError] = useState<string | null>(null);

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
    } else {
      setDate(addDays(new Date(), 1));
      setTitle('');
      setCoachNote('');
      setCoverUrl('');
      setBlocks([]);
      setPublish(false);
    }
    setDateError(null);
    setTitleError(null);
    setBlocksError(null);
  }, [open, post]);

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

  const blockHasExercise = (b: Block): boolean => {
    if (b.type === 'strength') return b.exercises.some(e => e.name.trim());
    if (b.type === 'mobility') return b.exercises.some(e => e.name.trim());
    if (b.type === 'cardio') return !!b.format?.trim() && !!b.movements?.trim();
    return false;
  };

  const handleSave = async () => {
    if (!user) return;

    setDateError(null);
    setTitleError(null);
    setBlocksError(null);
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

    // Date collision check
    const dateStr = isoDate(date);
    let collisionQuery = supabase
      .from('daily_dose_posts' as any)
      .select('id')
      .eq('published_date', dateStr);
    if (post?.id) collisionQuery = collisionQuery.neq('id', post.id);
    const { data: collision } = await collisionQuery.maybeSingle();
    if (collision) {
      setDateError('A post already exists for this date');
      ok = false;
    }

    if (publish) {
      const hasContent = blocks.length > 0 && blocks.some(blockHasExercise);
      if (!hasContent) {
        setBlocksError('Add at least one block with an exercise before publishing');
        ok = false;
      }
    }

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Daily Dose' : 'New Daily Dose'}</DialogTitle>
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
            {blocksError && <p className="text-xs text-destructive">{blocksError}</p>}
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

/* ========= Block Editor (mirrors AdminProgramBuilder) ========= */
function BlockEditor({
  block, blockIdx, totalBlocks, onUpdate, onRemove, onMove
}: {
  block: Block;
  blockIdx: number;
  totalBlocks: number;
  onUpdate: (updater: (b: Block) => Block) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const typeLabel = block.type === 'strength' ? 'Strength' : block.type === 'cardio' ? 'Cardio & Conditioning' : 'Mobility & Stretching';
  const TypeIcon = block.type === 'strength' ? Dumbbell : block.type === 'cardio' ? Bike : Heart;

  return (
    <div className="border border-border rounded-lg p-3 space-y-3 bg-muted/20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TypeIcon className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">{typeLabel}</span>
        </div>
        <div className="flex items-center gap-1">
          {blockIdx > 0 && (
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onMove(-1)}>
              <ChevronDown className="w-3 h-3 rotate-180" />
            </Button>
          )}
          {blockIdx < totalBlocks - 1 && (
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onMove(1)}>
              <ChevronDown className="w-3 h-3" />
            </Button>
          )}
          <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={onRemove}>
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {block.type === 'strength' && <StrengthEditor block={block} onUpdate={(b) => onUpdate(() => b)} />}
      {block.type === 'cardio' && <CardioEditor block={block} onUpdate={(b) => onUpdate(() => b)} />}
      {block.type === 'mobility' && <MobilityEditor block={block} onUpdate={(b) => onUpdate(() => b)} />}
    </div>
  );
}

function StrengthEditor({ block, onUpdate }: { block: StrengthBlock; onUpdate: (b: StrengthBlock) => void }) {
  const updateExercise = (idx: number, patch: Partial<StrengthExercise>) => {
    const exercises = block.exercises.map((e, i) => i === idx ? { ...e, ...patch } : e);
    onUpdate({ ...block, exercises });
  };
  const addExercise = () => onUpdate({ ...block, exercises: [...block.exercises, { name: '', movementId: null, sets: '3', reps: '10', weight: '', note: '' }] });
  const removeExercise = (idx: number) => {
    if (block.exercises.length <= 1) return;
    onUpdate({ ...block, exercises: block.exercises.filter((_, i) => i !== idx) });
  };

  return (
    <div className="space-y-3">
      {block.exercises.map((ex, idx) => (
        <div key={idx} className="space-y-2 pb-2 border-b border-border/50 last:border-0 last:pb-0">
          <div className="flex gap-2">
            <div className="flex-1">
              <MovementPicker
                value={ex.name}
                movementId={ex.movementId}
                onChange={({ name, movementId }) => updateExercise(idx, { name, movementId })}
                placeholder="Exercise name"
              />
            </div>
            {block.exercises.length > 1 && (
              <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive shrink-0" onClick={() => removeExercise(idx)}>
                <Trash2 className="w-3 h-3" />
              </Button>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Input placeholder="Sets" value={ex.sets} onChange={e => updateExercise(idx, { sets: e.target.value })} className="h-8 text-sm" />
            <Input placeholder="Reps" value={ex.reps} onChange={e => updateExercise(idx, { reps: e.target.value })} className="h-8 text-sm" />
            <Input placeholder="Weight (lb)" value={ex.weight} onChange={e => updateExercise(idx, { weight: e.target.value })} className="h-8 text-sm" />
          </div>
          <Input placeholder="Coaching note (optional)" value={ex.note} onChange={e => updateExercise(idx, { note: e.target.value })} className="h-8 text-sm" />
        </div>
      ))}
      <Button size="sm" variant="default" className="text-xs gap-1 w-full" onClick={addExercise}>
        <Plus className="w-3 h-3" /> Add exercise
      </Button>
    </div>
  );
}

function CardioEditor({ block, onUpdate }: { block: CardioBlock; onUpdate: (b: CardioBlock) => void }) {
  return (
    <div className="space-y-2">
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Format</Label>
        <select
          value={block.format || 'For Time'}
          onChange={e => onUpdate({ ...block, format: e.target.value })}
          className="w-full h-9 text-sm rounded-md border border-input bg-background px-2"
        >
          <option value="For Time">For Time</option>
          <option value="AMRAP">AMRAP</option>
          <option value="EMOM">EMOM</option>
          <option value="Tabata">Tabata</option>
          <option value="Straight Sets">Straight Sets</option>
          <option value="Free Form">Free Form</option>
        </select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Movements</Label>
        <Textarea
          value={block.movements}
          onChange={e => onUpdate({ ...block, movements: e.target.value })}
          rows={4}
          className="text-sm min-h-[100px]"
          placeholder={"One movement per line:\nCalorie Row\nRing Dips\nPush Ups"}
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Reps / Rounds / Time</Label>
        <Input
          placeholder="Rep scheme or time (e.g. 21-15-9, 12 min, Every 2:00)"
          value={block.scheme}
          onChange={e => onUpdate({ ...block, scheme: e.target.value })}
          className="h-8 text-sm"
        />
      </div>
      <Textarea
        value={block.note}
        onChange={e => onUpdate({ ...block, note: e.target.value })}
        rows={3}
        className="text-sm min-h-[72px]"
        placeholder="Coaching note (optional)"
      />
    </div>
  );
}

function MobilityEditor({ block, onUpdate }: { block: MobilityBlock; onUpdate: (b: MobilityBlock) => void }) {
  const updateExercise = (idx: number, patch: Partial<MobilityExercise>) => {
    const exercises = block.exercises.map((e, i) => i === idx ? { ...e, ...patch } : e);
    onUpdate({ ...block, exercises });
  };
  const addExercise = () => onUpdate({ ...block, exercises: [...block.exercises, { name: '', movementId: null, duration: '', side: 'both', note: '' }] });
  const removeExercise = (idx: number) => {
    if (block.exercises.length <= 1) return;
    onUpdate({ ...block, exercises: block.exercises.filter((_, i) => i !== idx) });
  };

  return (
    <div className="space-y-3">
      {block.exercises.map((ex, idx) => (
        <div key={idx} className="space-y-2 pb-2 border-b border-border/50 last:border-0 last:pb-0">
          <div className="flex gap-2">
            <div className="flex-1">
              <MovementPicker
                value={ex.name}
                movementId={ex.movementId}
                onChange={({ name, movementId }) => updateExercise(idx, { name, movementId })}
                placeholder="Exercise / stretch"
              />
            </div>
            {block.exercises.length > 1 && (
              <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive shrink-0" onClick={() => removeExercise(idx)}>
                <Trash2 className="w-3 h-3" />
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Input placeholder="Duration/reps" value={ex.duration} onChange={e => updateExercise(idx, { duration: e.target.value })} className="flex-1 h-8 text-sm" />
            <select
              value={ex.side}
              onChange={e => updateExercise(idx, { side: e.target.value })}
              className="h-8 text-sm rounded-md border border-input bg-background px-2"
            >
              <option value="both">Both</option>
              <option value="left">Left</option>
              <option value="right">Right</option>
            </select>
          </div>
        </div>
      ))}
      <Button size="sm" variant="ghost" className="text-xs gap-1" onClick={addExercise}>
        <Plus className="w-3 h-3" /> Add exercise
      </Button>
    </div>
  );
}
