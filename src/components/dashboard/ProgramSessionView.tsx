import { useEffect, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, PlayCircle, Plus, Trash2, Loader2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { MovementDetailView } from '@/components/movements/MovementDetailView';
import { NutritionDisclaimerLabel } from '@/components/nutrition/NutritionDisclaimerLabel';
import type { Movement } from '@/types/movements';

interface Block {
  type: string;
  exercises?: any[];
  activity?: string;
  duration?: string;
  intensity?: string;
  content?: string;
  note?: string;
}

interface SetRow {
  weight: string;
  reps: string;
  rpe: string;
  completed: boolean;
}

interface ExerciseState {
  blockIndex: number;
  exerciseIndex: number;
  blockType: string;
  name: string;
  movementId?: string;
  prescribedReps: string;
  sets: SetRow[];
}

interface CardioState {
  blockIndex: number;
  activity: string;
  duration: string;
  notes: string;
  completed: boolean;
}

interface Props {
  programId: string;
  week: number;
  day: number; // 0-6, Monday=0
  dayBlocks: Block[];
  onBack: () => void;
  onComplete: () => void;
}

function makeEmptyRow(reps: string): SetRow {
  return { weight: '', reps: reps || '', rpe: '', completed: false };
}

function buildInitialExerciseState(blocks: Block[]): ExerciseState[] {
  const out: ExerciseState[] = [];
  blocks.forEach((block, bi) => {
    if (block.type !== 'strength' && block.type !== 'mobility') return;
    block.exercises?.forEach((ex: any, ei: number) => {
      const setCount = Math.max(1, parseInt(String(ex.sets ?? '1'), 10) || 1);
      const reps = String(ex.reps ?? '');
      out.push({
        blockIndex: bi,
        exerciseIndex: ei,
        blockType: block.type,
        name: ex.name || 'Exercise',
        movementId: ex.movementId || undefined,
        prescribedReps: reps,
        sets: Array.from({ length: setCount }, () => makeEmptyRow(reps)),
      });
    });
  });
  return out;
}

function buildInitialCardioState(blocks: Block[]): CardioState[] {
  const out: CardioState[] = [];
  blocks.forEach((block, bi) => {
    if (block.type !== 'cardio') return;
    out.push({
      blockIndex: bi,
      activity: block.activity || 'Cardio',
      duration: '',
      notes: '',
      completed: false,
    });
  });
  return out;
}

export function ProgramSessionView({ programId, week, day, dayBlocks, onBack, onComplete }: Props) {
  const { user } = useAuth();
  const [workoutLogId, setWorkoutLogId] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [exerciseState, setExerciseState] = useState<ExerciseState[]>(() => buildInitialExerciseState(dayBlocks));
  const [cardioState, setCardioState] = useState<CardioState[]>(() => buildInitialCardioState(dayBlocks));
  const [movementCache, setMovementCache] = useState<Record<string, Movement>>({});
  const [openMovement, setOpenMovement] = useState<Movement | null>(null);

  // Find or create the in-progress workout_log on mount.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const init = async () => {
      // Resume in-progress log if one exists
      const { data: existing } = await (supabase as any)
        .from('workout_logs')
        .select('id')
        .eq('user_id', user.id)
        .eq('coaching_program_id', programId)
        .eq('program_week', week)
        .eq('program_day', day)
        .is('completed_at', null)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cancelled) return;

      if (existing?.id) {
        setWorkoutLogId(existing.id);
        // Try to hydrate any previously saved set_logs (in case Finish was hit then user came back)
        await hydrateFromExistingLog(existing.id);
      } else {
        const { data: created, error } = await (supabase as any)
          .from('workout_logs')
          .insert({
            user_id: user.id,
            workout_id: null,
            coaching_program_id: programId,
            program_week: week,
            program_day: day,
          })
          .select('id')
          .single();

        if (error) {
          console.error('Failed to start workout log:', error);
          toast.error('Could not start workout session.');
        } else if (!cancelled && created) {
          setWorkoutLogId(created.id);
        }
      }
      if (!cancelled) setInitializing(false);
    };
    init();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, programId, week, day]);

  // Preload referenced movements for the play-icon links + detail dialog
  useEffect(() => {
    const ids = Array.from(
      new Set(
        exerciseState
          .map(e => e.movementId)
          .filter((id): id is string => !!id)
      )
    );
    if (ids.length === 0) return;
    (async () => {
      const { data } = await supabase.from('movements').select('*').in('id', ids);
      if (data) {
        const map: Record<string, Movement> = {};
        for (const m of data as Movement[]) map[m.id] = m;
        setMovementCache(map);
      }
    })();
  }, [exerciseState]);

  const hydrateFromExistingLog = async (logId: string) => {
    const { data: exLogs } = await (supabase as any)
      .from('exercise_logs')
      .select('id, exercise_name, sort_order, section_type, time_result, notes, completed')
      .eq('workout_log_id', logId)
      .order('sort_order');
    if (!exLogs || exLogs.length === 0) return;

    const setLogIds = exLogs.map((e: any) => e.id);
    const { data: setLogs } = await (supabase as any)
      .from('set_logs')
      .select('exercise_log_id, set_number, target_reps, completed_reps, weight, rpe, completed')
      .in('exercise_log_id', setLogIds)
      .order('set_number');

    // Match exercise logs back to current state by name + sort_order
    setExerciseState(prev => {
      const next = prev.map(p => ({ ...p, sets: p.sets.map(s => ({ ...s })) }));
      exLogs.forEach((el: any) => {
        const target = next.find(
          (e, idx) => idx === el.sort_order && e.name === el.exercise_name
        );
        if (!target) return;
        const matched = (setLogs || []).filter((s: any) => s.exercise_log_id === el.id);
        if (matched.length === 0) return;
        target.sets = matched.map((s: any) => ({
          weight: s.weight != null ? String(s.weight) : '',
          reps: s.completed_reps != null ? String(s.completed_reps) : (s.target_reps || ''),
          rpe: s.rpe != null ? String(s.rpe) : '',
          completed: !!s.completed,
        }));
      });
      return next;
    });

    setCardioState(prev =>
      prev.map(c => {
        const match = exLogs.find((el: any) => el.section_type === 'cardio' && el.exercise_name === c.activity);
        if (!match) return c;
        const dur = match.time_result?.replace(/\D/g, '') || '';
        return { ...c, duration: dur, notes: match.notes || '', completed: !!match.completed };
      })
    );
  };

  const updateSet = (exIdx: number, setIdx: number, patch: Partial<SetRow>) => {
    setExerciseState(prev =>
      prev.map((e, i) =>
        i === exIdx ? { ...e, sets: e.sets.map((s, si) => (si === setIdx ? { ...s, ...patch } : s)) } : e
      )
    );
  };

  const addSet = (exIdx: number) => {
    setExerciseState(prev =>
      prev.map((e, i) =>
        i === exIdx ? { ...e, sets: [...e.sets, makeEmptyRow(e.prescribedReps)] } : e
      )
    );
  };

  const removeSet = (exIdx: number, setIdx: number) => {
    setExerciseState(prev =>
      prev.map((e, i) =>
        i === exIdx ? { ...e, sets: e.sets.filter((_, si) => si !== setIdx) } : e
      )
    );
  };

  const updateCardio = (idx: number, patch: Partial<CardioState>) => {
    setCardioState(prev => prev.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  };

  const handleFinish = async () => {
    if (!user || !workoutLogId) return;
    setSubmitting(true);

    // Clear any previously saved logs for this workout_log so re-finishes don't duplicate
    const { data: priorEx } = await (supabase as any)
      .from('exercise_logs')
      .select('id')
      .eq('workout_log_id', workoutLogId);
    if (priorEx && priorEx.length > 0) {
      const priorIds = priorEx.map((p: any) => p.id);
      await (supabase as any).from('set_logs').delete().in('exercise_log_id', priorIds);
      await (supabase as any).from('exercise_logs').delete().in('id', priorIds);
    }

    // Strength + mobility exercises
    for (let i = 0; i < exerciseState.length; i++) {
      const ex = exerciseState[i];
      const filledSets = ex.sets.filter(s => s.weight || s.reps || s.rpe || s.completed);
      if (filledSets.length === 0) continue;

      const anyCompleted = filledSets.some(s => s.completed);
      const { data: exLog, error: exErr } = await (supabase as any)
        .from('exercise_logs')
        .insert({
          workout_log_id: workoutLogId,
          exercise_name: ex.name,
          movement_id: ex.movementId || null,
          exercise_template_id: null,
          tracking_type: 'sets_reps',
          section_type: ex.blockType,
          sort_order: i,
          completed: anyCompleted,
        })
        .select('id')
        .single();

      if (exErr || !exLog) {
        console.error('exercise_logs insert failed:', exErr);
        continue;
      }

      const setRows = filledSets.map((s, si) => ({
        exercise_log_id: exLog.id,
        set_number: si + 1,
        target_reps: ex.prescribedReps || null,
        completed_reps: s.reps ? parseInt(s.reps, 10) || null : null,
        weight: s.weight ? parseFloat(s.weight) || null : null,
        rpe: s.rpe ? parseFloat(s.rpe) || null : null,
        completed: s.completed,
      }));
      const { error: setErr } = await (supabase as any).from('set_logs').insert(setRows);
      if (setErr) console.error('set_logs insert failed:', setErr);
    }

    // Cardio
    for (let i = 0; i < cardioState.length; i++) {
      const c = cardioState[i];
      if (!c.completed && !c.duration && !c.notes) continue;
      const sortOrder = exerciseState.length + i;
      const { error: cErr } = await (supabase as any).from('exercise_logs').insert({
        workout_log_id: workoutLogId,
        exercise_name: c.activity,
        movement_id: null,
        exercise_template_id: null,
        tracking_type: 'time',
        section_type: 'cardio',
        sort_order: sortOrder,
        completed: c.completed,
        time_result: c.duration ? `${c.duration} min` : null,
        notes: c.notes || null,
      });
      if (cErr) console.error('cardio exercise_logs insert failed:', cErr);
    }

    // Mark workout complete
    const { error: updErr } = await (supabase as any)
      .from('workout_logs')
      .update({ completed_at: new Date().toISOString() })
      .eq('id', workoutLogId);
    if (updErr) console.error('workout_logs update failed:', updErr);

    setSubmitting(false);
    toast.success('Workout logged.');
    onComplete();
  };

  if (initializing) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const nutritionBlocks = dayBlocks
    .map((b, bi) => ({ block: b, bi }))
    .filter(x => x.block.type === 'nutrition');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5">
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
        <Badge variant="outline" className="text-[10px]">
          Week {week + 1} · Day {day + 1}
        </Badge>
      </div>

      {exerciseState.length === 0 && cardioState.length === 0 && nutritionBlocks.length === 0 && (
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Nothing to log on this day.</p>
        </Card>
      )}

      {/* Strength + Mobility exercises */}
      {exerciseState.map((ex, exIdx) => {
        const movement = ex.movementId ? movementCache[ex.movementId] : undefined;
        return (
          <Card key={`ex-${exIdx}`} className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-0.5">
                <p className="text-[10px] uppercase tracking-wider text-primary font-medium">{ex.blockType}</p>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold">{ex.name}</h4>
                  {movement && (
                    <button
                      type="button"
                      onClick={() => setOpenMovement(movement)}
                      className="text-primary hover:text-primary/80"
                      aria-label="View movement details"
                    >
                      <PlayCircle className="w-4 h-4" />
                    </button>
                  )}
                </div>
                {ex.prescribedReps && (
                  <p className="text-[11px] text-muted-foreground">Prescribed: {ex.sets.length}×{ex.prescribedReps}</p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="grid grid-cols-[24px_1fr_1fr_1fr_28px_28px] gap-1.5 items-center text-[10px] uppercase tracking-wider text-muted-foreground px-1">
                <span>#</span>
                <span>Weight</span>
                <span>Reps</span>
                <span>RPE</span>
                <span></span>
                <span></span>
              </div>
              {ex.sets.map((s, si) => (
                <div key={si} className="grid grid-cols-[24px_1fr_1fr_1fr_28px_28px] gap-1.5 items-center">
                  <span className="text-xs text-muted-foreground text-center">{si + 1}</span>
                  <Input
                    type="number"
                    inputMode="decimal"
                    placeholder="0"
                    value={s.weight}
                    onChange={e => updateSet(exIdx, si, { weight: e.target.value })}
                    className="h-8 text-sm"
                  />
                  <Input
                    type="number"
                    inputMode="numeric"
                    placeholder={ex.prescribedReps || '0'}
                    value={s.reps}
                    onChange={e => updateSet(exIdx, si, { reps: e.target.value })}
                    className="h-8 text-sm"
                  />
                  <Input
                    type="number"
                    inputMode="decimal"
                    placeholder="—"
                    min="1"
                    max="10"
                    value={s.rpe}
                    onChange={e => updateSet(exIdx, si, { rpe: e.target.value })}
                    className="h-8 text-sm"
                  />
                  <div className="flex items-center justify-center">
                    <Checkbox
                      checked={s.completed}
                      onCheckedChange={v => updateSet(exIdx, si, { completed: !!v })}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeSet(exIdx, si)}
                    disabled={ex.sets.length <= 1}
                    className="text-muted-foreground hover:text-destructive disabled:opacity-30"
                    aria-label="Remove set"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <Button variant="outline" size="sm" onClick={() => addSet(exIdx)} className="w-full text-xs gap-1">
              <Plus className="w-3.5 h-3.5" /> Add set
            </Button>
          </Card>
        );
      })}

      {/* Cardio */}
      {cardioState.map((c, ci) => (
        <Card key={`cardio-${ci}`} className="p-4 space-y-3">
          <div className="space-y-0.5">
            <p className="text-[10px] uppercase tracking-wider text-primary font-medium">Cardio</p>
            <h4 className="text-sm font-semibold">{c.activity}</h4>
          </div>
          <div className="grid grid-cols-[1fr_auto] gap-3 items-center">
            <div className="space-y-1">
              <label className="text-[11px] text-muted-foreground">Duration (minutes)</label>
              <Input
                type="number"
                inputMode="numeric"
                placeholder="0"
                value={c.duration}
                onChange={e => updateCardio(ci, { duration: e.target.value })}
                className="h-8 text-sm"
              />
            </div>
            <div className="flex items-center gap-2 pt-4">
              <Checkbox
                id={`cardio-done-${ci}`}
                checked={c.completed}
                onCheckedChange={v => updateCardio(ci, { completed: !!v })}
              />
              <label htmlFor={`cardio-done-${ci}`} className="text-xs">Completed</label>
            </div>
          </div>
          <Textarea
            placeholder="Notes (optional)"
            value={c.notes}
            onChange={e => updateCardio(ci, { notes: e.target.value })}
            className="min-h-[60px] text-sm"
          />
        </Card>
      ))}

      {/* Nutrition (read-only) */}
      {nutritionBlocks.map(({ block, bi }) => (
        <Card key={`nut-${bi}`} className="p-4 space-y-2 bg-muted/30">
          <p className="text-[10px] uppercase tracking-wider text-primary font-medium">Nutrition</p>
          {block.content && <p className="text-xs whitespace-pre-wrap">{block.content}</p>}
          {block.note && <p className="text-[11px] text-muted-foreground italic">{block.note}</p>}
          <NutritionDisclaimerLabel variant="coach-note" />
        </Card>
      ))}

      <div className="flex gap-2 pt-2">
        <Button variant="outline" onClick={onBack} disabled={submitting} className="flex-1">
          Save & exit
        </Button>
        <Button onClick={handleFinish} disabled={submitting} className="flex-1 gap-1.5">
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          Finish workout
        </Button>
      </div>

      {openMovement && (
        <Dialog open={!!openMovement} onOpenChange={o => !o && setOpenMovement(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
            <MovementDetailView
              movement={openMovement}
              isFavorite={false}
              onClose={() => setOpenMovement(null)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}