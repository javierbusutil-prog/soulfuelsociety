import { Plus, Trash2, Dumbbell, Bike, Heart, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { MovementPicker } from '@/components/movements/MovementPicker';
import type {
  StrengthBlock,
  CardioBlock,
  MobilityBlock,
  StrengthExercise,
  MobilityExercise,
} from '@/lib/workoutBlocks';

/**
 * The block editors only handle strength / cardio / mobility — nutrition
 * blocks are authored via different UI. Consumers that store the broader
 * `Block` union should narrow before passing into <BlockEditor />.
 */
export type EditableBlock = StrengthBlock | CardioBlock | MobilityBlock;
export type EditableBlockType = EditableBlock['type'];

interface BlockEditorProps {
  block: EditableBlock;
  blockIdx: number;
  totalBlocks: number;
  onUpdate: (updater: (b: EditableBlock) => EditableBlock) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}

/* ========= Block Editor (mirrors AdminProgramBuilder) ========= */
export function BlockEditor({
  block, blockIdx, totalBlocks, onUpdate, onRemove, onMove,
}: BlockEditorProps) {
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
  const exercises = block.exercises ?? [];
  const updateExercise = (idx: number, patch: Partial<StrengthExercise>) => {
    const next = exercises.map((e, i) => i === idx ? { ...e, ...patch } : e);
    onUpdate({ ...block, exercises: next });
  };
  const addExercise = () => onUpdate({ ...block, exercises: [...exercises, { name: '', movementId: null, sets: '3', reps: '10', note: '' }] });
  const removeExercise = (idx: number) => {
    if (exercises.length <= 1) return;
    onUpdate({ ...block, exercises: exercises.filter((_, i) => i !== idx) });
  };

  return (
    <div className="space-y-3">
      {exercises.map((ex, idx) => (
        <div key={idx} className="space-y-2 pb-2 border-b border-border/50 last:border-0 last:pb-0">
          <div className="flex gap-2">
            <div className="flex-1">
              <MovementPicker
                value={ex.name ?? ''}
                movementId={ex.movementId}
                onChange={({ name, movementId }) => updateExercise(idx, { name, movementId })}
                placeholder="Exercise name"
              />
            </div>
            {exercises.length > 1 && (
              <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive shrink-0" onClick={() => removeExercise(idx)}>
                <Trash2 className="w-3 h-3" />
              </Button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Sets" value={ex.sets ?? ''} onChange={e => updateExercise(idx, { sets: e.target.value })} className="h-8 text-sm" />
            <Input placeholder="Reps" value={ex.reps ?? ''} onChange={e => updateExercise(idx, { reps: e.target.value })} className="h-8 text-sm" />
          </div>
          <Input placeholder="Coaching note (optional)" value={ex.note ?? ''} onChange={e => updateExercise(idx, { note: e.target.value })} className="h-8 text-sm" />
        </div>
      ))}
      <Button size="sm" variant="default" className="text-xs gap-1 w-full" onClick={addExercise}>
        <Plus className="w-3 h-3" /> Add exercise
      </Button>
    </div>
  );
}

function CardioEditor({ block, onUpdate }: { block: CardioBlock; onUpdate: (b: CardioBlock) => void }) {
  const demos = block.demos ?? [];
  const updateDemo = (idx: number, patch: Partial<{ name: string; movementId: string | null }>) => {
    const next = demos.map((d, i) => (i === idx ? { ...d, ...patch } : d));
    onUpdate({ ...block, demos: next });
  };
  const addDemo = () => onUpdate({ ...block, demos: [...demos, { name: '', movementId: null }] });
  const removeDemo = (idx: number) =>
    onUpdate({ ...block, demos: demos.filter((_, i) => i !== idx) });

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Workout</Label>
        <Textarea
          value={block.workout ?? ''}
          onChange={e => onUpdate({ ...block, workout: e.target.value })}
          rows={5}
          className="text-sm min-h-[120px] whitespace-pre-line"
          placeholder={"For Time:\n3 rounds\n20 Deadlifts\n200 meter row\n15 burpees"}
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Note (optional)</Label>
        <Textarea
          value={block.note ?? ''}
          onChange={e => onUpdate({ ...block, note: e.target.value })}
          rows={3}
          className="text-sm min-h-[72px]"
          placeholder="Coaching cues, scaling options, intent…"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Movement demos (optional)</Label>
        {demos.map((demo, idx) => (
          <div key={idx} className="flex gap-2">
            <div className="flex-1">
              <MovementPicker
                value={demo.name ?? ''}
                movementId={demo.movementId ?? null}
                onChange={({ name, movementId }) => updateDemo(idx, { name, movementId })}
                placeholder="Link a movement demo"
              />
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-destructive shrink-0"
              onClick={() => removeDemo(idx)}
              aria-label="Remove demo"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        ))}
        <Button size="sm" variant="default" className="text-xs gap-1 w-full" onClick={addDemo}>
          <Plus className="w-3 h-3" /> Add demo
        </Button>
      </div>
    </div>
  );
}

function MobilityEditor({ block, onUpdate }: { block: MobilityBlock; onUpdate: (b: MobilityBlock) => void }) {
  const exercises = block.exercises ?? [];
  const updateExercise = (idx: number, patch: Partial<MobilityExercise>) => {
    const next = exercises.map((e, i) => i === idx ? { ...e, ...patch } : e);
    onUpdate({ ...block, exercises: next });
  };
  const addExercise = () => onUpdate({ ...block, exercises: [...exercises, { name: '', movementId: null, duration: '', side: 'both', note: '' }] });
  const removeExercise = (idx: number) => {
    if (exercises.length <= 1) return;
    onUpdate({ ...block, exercises: exercises.filter((_, i) => i !== idx) });
  };

  return (
    <div className="space-y-3">
      {exercises.map((ex, idx) => (
        <div key={idx} className="space-y-2 pb-2 border-b border-border/50 last:border-0 last:pb-0">
          <div className="flex gap-2">
            <div className="flex-1">
              <MovementPicker
                value={ex.name ?? ''}
                movementId={ex.movementId}
                onChange={({ name, movementId }) => updateExercise(idx, { name, movementId })}
                placeholder="Exercise / stretch"
              />
            </div>
            {exercises.length > 1 && (
              <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive shrink-0" onClick={() => removeExercise(idx)}>
                <Trash2 className="w-3 h-3" />
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Input placeholder="Duration/reps" value={ex.duration ?? ''} onChange={e => updateExercise(idx, { duration: e.target.value })} className="flex-1 h-8 text-sm" />
            <select
              value={ex.side ?? 'both'}
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