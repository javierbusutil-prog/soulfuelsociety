import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  ArrowLeft, Plus, Trash2, GripVertical, Dumbbell, Heart, Bike,
  Apple, Eye, Send, ChevronDown, ChevronUp, AlertTriangle
} from 'lucide-react';

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

type BlockType = 'strength' | 'cardio' | 'mobility' | 'nutrition';

interface StrengthExercise {
  name: string;
  sets: string;
  reps: string;
  weight: string;
  note: string;
}

interface StrengthBlock {
  type: 'strength';
  exercises: StrengthExercise[];
}

interface CardioBlock {
  type: 'cardio';
  activity: string;
  duration: string;
  intensity: string;
  note: string;
}

interface MobilityBlock {
  type: 'mobility';
  exercises: { name: string; duration: string; note: string }[];
}

interface NutritionBlock {
  type: 'nutrition';
  content: string;
}

type Block = StrengthBlock | CardioBlock | MobilityBlock | NutritionBlock;

interface DayPlan {
  isRest: boolean;
  blocks: Block[];
}

interface MemberContext {
  full_name: string | null;
  fitness_level: string;
  primary_goal: string;
  training_days_per_week: number;
  injuries_limitations: string | null;
  preferred_days: string[] | null;
}

export default function AdminProgramBuilder() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [context, setContext] = useState<MemberContext | null>(null);
  const [days, setDays] = useState<DayPlan[]>(
    DAY_NAMES.map(() => ({ isRest: true, blocks: [] }))
  );
  const [loading, setLoading] = useState(true);
  const [delivering, setDelivering] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set());
  const [existingVersion, setExistingVersion] = useState(0);
  const [isUpdate, setIsUpdate] = useState(false);

  useEffect(() => {
    if (id) fetchContext(id);
  }, [id]);

  const fetchContext = async (userId: string) => {
    setLoading(true);
    const [{ data: prof }, { data: mp }, { data: existing }] = await Promise.all([
      supabase.from('profiles').select('full_name').eq('id', userId).single(),
      supabase.from('member_profiles').select('fitness_level, primary_goal, training_days_per_week, injuries_limitations, preferred_days').eq('user_id', userId).single(),
      supabase.from('coaching_programs').select('version, program_data').eq('user_id', userId).eq('is_active', true).order('version', { ascending: false }).limit(1).maybeSingle(),
    ]);

    if (prof && mp) {
      setContext({ full_name: prof.full_name, ...(mp as any) });
    }

    if (existing) {
      setExistingVersion(existing.version);
      setIsUpdate(true);
      // Load existing program data
      const pd = existing.program_data as any;
      if (pd?.days && Array.isArray(pd.days)) {
        setDays(pd.days);
        // Expand non-rest days
        const expanded = new Set<number>();
        pd.days.forEach((d: DayPlan, i: number) => { if (!d.isRest) expanded.add(i); });
        setExpandedDays(expanded);
      }
    }

    setLoading(false);
  };

  const toggleDay = (idx: number) => {
    setExpandedDays(prev => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  const setDayRest = (idx: number, isRest: boolean) => {
    setDays(prev => prev.map((d, i) => i === idx ? { isRest, blocks: isRest ? [] : d.blocks } : d));
    if (!isRest) setExpandedDays(prev => new Set(prev).add(idx));
  };

  const addBlock = (dayIdx: number, type: BlockType) => {
    const newBlock: Block = type === 'strength'
      ? { type: 'strength', exercises: [{ name: '', sets: '3', reps: '10', weight: '', note: '' }] }
      : type === 'cardio'
      ? { type: 'cardio', activity: '', duration: '', intensity: '', note: '' }
      : type === 'mobility'
      ? { type: 'mobility', exercises: [{ name: '', duration: '', note: '' }] }
      : { type: 'nutrition', content: '' };

    setDays(prev => prev.map((d, i) => i === dayIdx ? { ...d, blocks: [...d.blocks, newBlock] } : d));
  };

  const removeBlock = (dayIdx: number, blockIdx: number) => {
    setDays(prev => prev.map((d, i) => i === dayIdx ? { ...d, blocks: d.blocks.filter((_, bi) => bi !== blockIdx) } : d));
  };

  const moveBlock = (dayIdx: number, blockIdx: number, dir: -1 | 1) => {
    setDays(prev => prev.map((d, i) => {
      if (i !== dayIdx) return d;
      const blocks = [...d.blocks];
      const target = blockIdx + dir;
      if (target < 0 || target >= blocks.length) return d;
      [blocks[blockIdx], blocks[target]] = [blocks[target], blocks[blockIdx]];
      return { ...d, blocks };
    }));
  };

  const updateBlock = (dayIdx: number, blockIdx: number, updater: (b: Block) => Block) => {
    setDays(prev => prev.map((d, i) => i === dayIdx ? {
      ...d,
      blocks: d.blocks.map((b, bi) => bi === blockIdx ? updater(b) : b)
    } : d));
  };

  const handleDeliver = async () => {
    if (!user || !id) return;
    setDelivering(true);

    try {
      const newVersion = existingVersion + 1;

      // Deactivate previous versions
      if (isUpdate) {
        await supabase
          .from('coaching_programs')
          .update({ is_active: false } as any)
          .eq('user_id', id)
          .eq('is_active', true);
      }

      // Insert new program
      const { error: insertError } = await supabase
        .from('coaching_programs')
        .insert({
          user_id: id,
          coach_id: user.id,
          version: newVersion,
          is_active: true,
          program_data: { days } as any,
        } as any);

      if (insertError) throw insertError;

      // Mark program as delivered
      await supabase
        .from('member_profiles')
        .update({ program_delivered: true } as any)
        .eq('user_id', id);

      // Send notification
      const notifTitle = isUpdate
        ? 'Your coach has updated your program.'
        : 'Your personalized program is ready. Open it in your dashboard.';

      await supabase.from('notifications').insert({
        user_id: id,
        type: 'program_delivered',
        title: notifTitle,
        body: isUpdate ? 'Check your Workouts tab for the latest version.' : 'Head to your Workouts tab to get started.',
      } as any);

      toast.success(isUpdate ? 'Program updated!' : 'Program delivered!');
      setPreviewOpen(false);
      navigate(`/admin/members/${id}`);
    } catch (e: any) {
      console.error(e);
      toast.error('Failed to deliver program: ' + (e.message || 'Unknown error'));
    } finally {
      setDelivering(false);
    }
  };

  const formatGoal = (g: string) => g.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  const hasContent = days.some(d => !d.isRest && d.blocks.length > 0);

  if (loading) {
    return (
      <AdminLayout title="Program Builder">
        <div className="flex justify-center py-20">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Program Builder">
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-5 pb-24">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/members/${id}`)} className="gap-1.5 -ml-2">
          <ArrowLeft className="w-4 h-4" /> Back to member
        </Button>

        {/* Member Context */}
        {context && (
          <Card>
            <CardContent className="p-4 md:p-5">
              <h2 className="text-lg font-bold mb-2">
                {isUpdate ? 'Update' : 'Build'} program for {context.full_name}
              </h2>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{formatGoal(context.fitness_level)}</Badge>
                <Badge variant="secondary">{formatGoal(context.primary_goal)}</Badge>
                <Badge variant="outline">{context.training_days_per_week} days/week</Badge>
                {context.preferred_days && context.preferred_days.length > 0 && (
                  <Badge variant="outline">Prefers: {context.preferred_days.join(', ')}</Badge>
                )}
              </div>
              {context.injuries_limitations && (
                <div className="flex items-start gap-2 mt-3 p-2.5 rounded-lg bg-destructive/10 border border-destructive/20">
                  <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-destructive">Injuries / Limitations</p>
                    <p className="text-sm mt-0.5">{context.injuries_limitations}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Day-by-day builder */}
        {DAY_NAMES.map((dayName, dayIdx) => (
          <Card key={dayName} className={days[dayIdx].isRest ? 'opacity-60' : ''}>
            <CardHeader className="p-3 md:p-4 pb-0">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => toggleDay(dayIdx)}
                  className="flex items-center gap-2 text-left flex-1"
                >
                  {expandedDays.has(dayIdx) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  <CardTitle className="text-sm font-semibold">{dayName}</CardTitle>
                  {days[dayIdx].isRest && <Badge variant="secondary" className="text-[10px]">Rest</Badge>}
                  {!days[dayIdx].isRest && days[dayIdx].blocks.length > 0 && (
                    <Badge variant="outline" className="text-[10px]">{days[dayIdx].blocks.length} block{days[dayIdx].blocks.length > 1 ? 's' : ''}</Badge>
                  )}
                </button>
                <Button
                  size="sm"
                  variant={days[dayIdx].isRest ? 'default' : 'outline'}
                  className="text-xs h-7"
                  onClick={() => setDayRest(dayIdx, !days[dayIdx].isRest)}
                >
                  {days[dayIdx].isRest ? 'Add workout' : 'Set as rest'}
                </Button>
              </div>
            </CardHeader>

            {expandedDays.has(dayIdx) && !days[dayIdx].isRest && (
              <CardContent className="p-3 md:p-4 space-y-3">
                {days[dayIdx].blocks.map((block, blockIdx) => (
                  <BlockEditor
                    key={blockIdx}
                    block={block}
                    blockIdx={blockIdx}
                    totalBlocks={days[dayIdx].blocks.length}
                    onUpdate={(updater) => updateBlock(dayIdx, blockIdx, updater)}
                    onRemove={() => removeBlock(dayIdx, blockIdx)}
                    onMove={(dir) => moveBlock(dayIdx, blockIdx, dir)}
                  />
                ))}

                {/* Add block buttons */}
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => addBlock(dayIdx, 'strength')}>
                    <Dumbbell className="w-3 h-3" /> Strength
                  </Button>
                  <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => addBlock(dayIdx, 'cardio')}>
                    <Bike className="w-3 h-3" /> Cardio
                  </Button>
                  <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => addBlock(dayIdx, 'mobility')}>
                    <Heart className="w-3 h-3" /> Mobility
                  </Button>
                  <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => addBlock(dayIdx, 'nutrition')}>
                    <Apple className="w-3 h-3" /> Nutrition
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>
        ))}

        {/* Preview & deliver */}
        <div className="fixed bottom-0 left-0 right-0 md:left-64 p-4 bg-background/95 backdrop-blur border-t border-border z-10">
          <div className="max-w-4xl mx-auto flex gap-3">
            <Button
              className="flex-1 gap-1.5"
              disabled={!hasContent}
              onClick={() => setPreviewOpen(true)}
            >
              <Eye className="w-4 h-4" /> Preview & deliver
            </Button>
          </div>
        </div>

        {/* Preview Dialog */}
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Program Preview</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {DAY_NAMES.map((dayName, dayIdx) => {
                const day = days[dayIdx];
                if (day.isRest) {
                  return (
                    <div key={dayName} className="flex items-center gap-2 py-2 opacity-50">
                      <p className="text-sm font-medium">{dayName}</p>
                      <Badge variant="secondary" className="text-[10px]">Rest</Badge>
                    </div>
                  );
                }
                return (
                  <Card key={dayName}>
                    <CardHeader className="p-3 pb-1">
                      <CardTitle className="text-sm">{dayName}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 space-y-2">
                      {day.blocks.map((block, bi) => (
                        <PreviewBlock key={bi} block={block} />
                      ))}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPreviewOpen(false)}>Back to edit</Button>
              <Button onClick={handleDeliver} disabled={delivering} className="gap-1.5">
                <Send className="w-4 h-4" />
                {delivering ? 'Delivering...' : isUpdate ? 'Update program' : 'Deliver program'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}

/* ========= Block Editor ========= */
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
  const typeLabel = block.type === 'strength' ? 'Strength' : block.type === 'cardio' ? 'Cardio & Conditioning' : block.type === 'mobility' ? 'Mobility & Stretching' : 'Nutrition Guidance';
  const TypeIcon = block.type === 'strength' ? Dumbbell : block.type === 'cardio' ? Bike : block.type === 'mobility' ? Heart : Apple;

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
              <ChevronUp className="w-3 h-3" />
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

      {block.type === 'strength' && (
        <StrengthEditor
          block={block}
          onUpdate={(b) => onUpdate(() => b)}
        />
      )}

      {block.type === 'cardio' && (
        <CardioEditor
          block={block}
          onUpdate={(b) => onUpdate(() => b)}
        />
      )}

      {block.type === 'mobility' && (
        <MobilityEditor
          block={block}
          onUpdate={(b) => onUpdate(() => b)}
        />
      )}

      {block.type === 'nutrition' && (
        <Textarea
          placeholder="Nutrition guidance, macro targets, meal timing notes..."
          value={block.content}
          onChange={e => onUpdate(() => ({ type: 'nutrition', content: e.target.value }))}
          className="min-h-[80px]"
        />
      )}
    </div>
  );
}

/* ========= Strength Editor ========= */
function StrengthEditor({ block, onUpdate }: { block: StrengthBlock; onUpdate: (b: StrengthBlock) => void }) {
  const updateExercise = (idx: number, field: keyof StrengthExercise, value: string) => {
    const exercises = block.exercises.map((e, i) => i === idx ? { ...e, [field]: value } : e);
    onUpdate({ ...block, exercises });
  };

  const addExercise = () => {
    onUpdate({ ...block, exercises: [...block.exercises, { name: '', sets: '3', reps: '10', weight: '', note: '' }] });
  };

  const removeExercise = (idx: number) => {
    if (block.exercises.length <= 1) return;
    onUpdate({ ...block, exercises: block.exercises.filter((_, i) => i !== idx) });
  };

  return (
    <div className="space-y-3">
      {block.exercises.map((ex, idx) => (
        <div key={idx} className="space-y-2 pb-2 border-b border-border/50 last:border-0 last:pb-0">
          <div className="flex gap-2">
            <Input
              placeholder="Exercise name"
              value={ex.name}
              onChange={e => updateExercise(idx, 'name', e.target.value)}
              className="flex-1 h-8 text-sm"
            />
            {block.exercises.length > 1 && (
              <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive shrink-0" onClick={() => removeExercise(idx)}>
                <Trash2 className="w-3 h-3" />
              </Button>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Input placeholder="Sets" value={ex.sets} onChange={e => updateExercise(idx, 'sets', e.target.value)} className="h-8 text-sm" />
            <Input placeholder="Reps" value={ex.reps} onChange={e => updateExercise(idx, 'reps', e.target.value)} className="h-8 text-sm" />
            <Input placeholder="Weight/guidance" value={ex.weight} onChange={e => updateExercise(idx, 'weight', e.target.value)} className="h-8 text-sm" />
          </div>
          <Input placeholder="Coaching note (optional)" value={ex.note} onChange={e => updateExercise(idx, 'note', e.target.value)} className="h-8 text-sm" />
        </div>
      ))}
      <Button size="sm" variant="ghost" className="text-xs gap-1" onClick={addExercise}>
        <Plus className="w-3 h-3" /> Add exercise
      </Button>
    </div>
  );
}

/* ========= Cardio Editor ========= */
function CardioEditor({ block, onUpdate }: { block: CardioBlock; onUpdate: (b: CardioBlock) => void }) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <Input placeholder="Activity (run, row, AMRAP...)" value={block.activity} onChange={e => onUpdate({ ...block, activity: e.target.value })} className="h-8 text-sm" />
        <Input placeholder="Duration / rounds" value={block.duration} onChange={e => onUpdate({ ...block, duration: e.target.value })} className="h-8 text-sm" />
      </div>
      <Input placeholder="Intensity guidance" value={block.intensity} onChange={e => onUpdate({ ...block, intensity: e.target.value })} className="h-8 text-sm" />
      <Input placeholder="Coaching note (optional)" value={block.note} onChange={e => onUpdate({ ...block, note: e.target.value })} className="h-8 text-sm" />
    </div>
  );
}

/* ========= Mobility Editor ========= */
function MobilityEditor({ block, onUpdate }: { block: MobilityBlock; onUpdate: (b: MobilityBlock) => void }) {
  const updateExercise = (idx: number, field: string, value: string) => {
    const exercises = block.exercises.map((e, i) => i === idx ? { ...e, [field]: value } : e);
    onUpdate({ ...block, exercises });
  };

  const addExercise = () => {
    onUpdate({ ...block, exercises: [...block.exercises, { name: '', duration: '', note: '' }] });
  };

  const removeExercise = (idx: number) => {
    if (block.exercises.length <= 1) return;
    onUpdate({ ...block, exercises: block.exercises.filter((_, i) => i !== idx) });
  };

  return (
    <div className="space-y-3">
      {block.exercises.map((ex, idx) => (
        <div key={idx} className="flex gap-2">
          <Input placeholder="Exercise/stretch" value={ex.name} onChange={e => updateExercise(idx, 'name', e.target.value)} className="flex-1 h-8 text-sm" />
          <Input placeholder="Duration/reps" value={ex.duration} onChange={e => updateExercise(idx, 'duration', e.target.value)} className="w-28 h-8 text-sm" />
          {block.exercises.length > 1 && (
            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive shrink-0" onClick={() => removeExercise(idx)}>
              <Trash2 className="w-3 h-3" />
            </Button>
          )}
        </div>
      ))}
      <Button size="sm" variant="ghost" className="text-xs gap-1" onClick={addExercise}>
        <Plus className="w-3 h-3" /> Add exercise
      </Button>
    </div>
  );
}

/* ========= Preview Block ========= */
function PreviewBlock({ block }: { block: Block }) {
  if (block.type === 'strength') {
    return (
      <div className="space-y-1">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-1">
          <Dumbbell className="w-3 h-3" /> Strength
        </p>
        {block.exercises.map((ex, i) => (
          <div key={i} className="text-sm pl-4">
            <span className="font-medium">{ex.name || 'Unnamed'}</span>
            <span className="text-muted-foreground"> — {ex.sets}×{ex.reps}{ex.weight ? ` @ ${ex.weight}` : ''}</span>
            {ex.note && <p className="text-xs text-muted-foreground italic">{ex.note}</p>}
          </div>
        ))}
      </div>
    );
  }

  if (block.type === 'cardio') {
    return (
      <div className="space-y-1">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-1">
          <Bike className="w-3 h-3" /> Cardio
        </p>
        <div className="text-sm pl-4">
          <span className="font-medium">{block.activity || 'Activity'}</span>
          <span className="text-muted-foreground"> — {block.duration}{block.intensity ? ` · ${block.intensity}` : ''}</span>
          {block.note && <p className="text-xs text-muted-foreground italic">{block.note}</p>}
        </div>
      </div>
    );
  }

  if (block.type === 'mobility') {
    return (
      <div className="space-y-1">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-1">
          <Heart className="w-3 h-3" /> Mobility
        </p>
        {block.exercises.map((ex, i) => (
          <div key={i} className="text-sm pl-4">
            <span className="font-medium">{ex.name || 'Unnamed'}</span>
            {ex.duration && <span className="text-muted-foreground"> — {ex.duration}</span>}
            {ex.note && <p className="text-xs text-muted-foreground italic">{ex.note}</p>}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-1">
        <Apple className="w-3 h-3" /> Nutrition
      </p>
      <p className="text-sm pl-4 whitespace-pre-wrap">{block.content || 'No notes'}</p>
    </div>
  );
}
