import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, PlayCircle, Plus, Trash2, Loader2, CheckCircle2, Pencil, ChevronRight } from 'lucide-react';
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

interface PrevHint {
  weight: number | null;
  reps: number | null;
  rpe: number | null;
}

interface CardioState {
  blockIndex: number;
  activity: string;
  duration: string;
  notes: string;
  completed: boolean;
}

export type SessionSource =
  | { kind: 'coaching_program'; programId: string; week: number; day: number }
  | { kind: 'daily_dose'; postId: string };

interface Props {
  source: SessionSource;
  dayBlocks: Block[];
  onBack: () => void;
  onComplete: () => void;
}

/** Apply the source-specific WHERE filters to a workout_logs query builder. */
function applySourceFilter(query: any, source: SessionSource) {
  if (source.kind === 'coaching_program') {
    return query
      .eq('coaching_program_id', source.programId)
      .eq('program_week', source.week)
      .eq('program_day', source.day);
  }
  return query.eq('daily_dose_post_id', source.postId);
}

/** Build the insert payload for a new workout_log row for this source. */
function buildInsertPayload(source: SessionSource, userId: string) {
  if (source.kind === 'coaching_program') {
    return {
      user_id: userId,
      workout_id: null,
      coaching_program_id: source.programId,
      program_week: source.week,
      program_day: source.day,
    };
  }
  return {
    user_id: userId,
    workout_id: null,
    daily_dose_post_id: source.postId,
  };
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

export function ProgramSessionView({ source, dayBlocks, onBack, onComplete }: Props) {
  const { user } = useAuth();
  const [workoutLogId, setWorkoutLogId] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [exerciseState, setExerciseState] = useState<ExerciseState[]>(() => buildInitialExerciseState(dayBlocks));
  const [cardioState, setCardioState] = useState<CardioState[]>(() => buildInitialCardioState(dayBlocks));
  const [movementCache, setMovementCache] = useState<Record<string, Movement>>({});
  const [openMovement, setOpenMovement] = useState<Movement | null>(null);
  const [prevHints, setPrevHints] = useState<Record<string, PrevHint>>({});
  const [readOnly, setReadOnly] = useState(false);
  const [completedAt, setCompletedAt] = useState<string | null>(null);
  

  // Active set pointer for the "Next"-driven guided flow.
  // Cardio is intentionally excluded — it remains free-form.
  const [activeSet, setActiveSet] = useState<{ exIdx: number; setIdx: number }>({ exIdx: 0, setIdx: 0 });

  // Refs to each set row so we can scrollIntoView when advancing.
  const setRowRefs = useRef<Map<string, HTMLElement>>(new Map());
  const registerSetRow = useCallback((exIdx: number, setIdx: number) => (el: HTMLElement | null) => {
    const key = `${exIdx}:${setIdx}`;
    if (el) setRowRefs.current.set(key, el);
    else setRowRefs.current.delete(key);
  }, []);

  // Ref to the scrollable DialogContent ancestor. Found lazily by walking up
  // from a registered set row until we hit an element with overflowY auto/scroll.
  const scrollContainerRef = useRef<HTMLElement | null>(null);
  const findScrollContainer = useCallback((): HTMLElement | null => {
    if (scrollContainerRef.current && document.body.contains(scrollContainerRef.current)) {
      return scrollContainerRef.current;
    }
    // Seed from any registered set row.
    const seed = setRowRefs.current.values().next().value as HTMLElement | undefined;
    let node: HTMLElement | null = seed ?? null;
    while (node && node !== document.body) {
      const style = window.getComputedStyle(node);
      const oy = style.overflowY;
      if ((oy === 'auto' || oy === 'scroll') && node.scrollHeight > node.clientHeight) {
        scrollContainerRef.current = node;
        return node;
      }
      node = node.parentElement;
    }
    return null;
  }, []);

  // Whenever exerciseState changes (e.g. hydrate), clamp the active pointer to a valid range.
  useEffect(() => {
    if (exerciseState.length === 0) return;
    setActiveSet(prev => {
      const ex = exerciseState[prev.exIdx];
      if (!ex) return { exIdx: 0, setIdx: 0 };
      if (prev.setIdx >= ex.sets.length) return { exIdx: prev.exIdx, setIdx: Math.max(0, ex.sets.length - 1) };
      return prev;
    });
  }, [exerciseState]);

  const isLastSetOfLastExercise = useMemo(() => {
    if (exerciseState.length === 0) return false;
    const lastExIdx = exerciseState.length - 1;
    if (activeSet.exIdx !== lastExIdx) return false;
    return activeSet.setIdx >= exerciseState[lastExIdx].sets.length - 1;
  }, [activeSet, exerciseState]);

  // Scroll the active set into view whenever the pointer changes.
  // Manually scrolls the dialog's scroll container — scrollIntoView is unreliable
  // inside a portaled Radix DialogContent. Double rAF ensures layout settled.
  useEffect(() => {
    if (readOnly) return;
    const { exIdx, setIdx } = activeSet;
    const key = `${exIdx}:${setIdx}`;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const container = findScrollContainer();
        const el = scrollContainerRef.current?.querySelector('[data-setrow="' + key + '"]') as HTMLElement | null;
        if (!container || !el) return;
        const containerRect = container.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();
        const offset = (elRect.top - containerRect.top) - (container.clientHeight / 2) + (el.clientHeight / 2);
        const targetTop = container.scrollTop + offset;
        container.scrollTo({ top: targetTop, behavior: 'smooth' });
      });
    });
  }, [activeSet, readOnly, findScrollContainer]);

  const handleNext = () => {
    if (readOnly || exerciseState.length === 0) return;
    const { exIdx, setIdx } = activeSet;
    const ex = exerciseState[exIdx];
    if (!ex) return;

    // 1) Mark active set complete (local state only).
    updateSet(exIdx, setIdx, { completed: true });

    // 2) Advance pointer.
    if (setIdx < ex.sets.length - 1) {
      setActiveSet({ exIdx, setIdx: setIdx + 1 });
      return;
    }
    if (exIdx < exerciseState.length - 1) {
      setActiveSet({ exIdx: exIdx + 1, setIdx: 0 });
      return;
    }
    // Already on the last set of the last exercise — stay put.
  };

  // Find or create the in-progress workout_log on mount.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const init = async () => {
      // 1) Prefer a COMPLETED log for this source → read-only view
      const completedQuery = applySourceFilter(
        (supabase as any)
          .from('workout_logs')
          .select('id, completed_at')
          .eq('user_id', user.id),
        source,
      )
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      const { data: completed } = await completedQuery;

      if (cancelled) return;

      if (completed?.id) {
        // Clean up any orphan in-progress logs for the same day
        await applySourceFilter(
          (supabase as any)
            .from('workout_logs')
            .delete()
            .eq('user_id', user.id),
          source,
        ).is('completed_at', null);

        if (cancelled) return;
        setWorkoutLogId(completed.id);
        setCompletedAt(completed.completed_at);
        setReadOnly(true);
        await hydrateFromExistingLog(completed.id);
        if (!cancelled) setInitializing(false);
        return;
      }

      // 2) Otherwise resume an in-progress log if one exists
      const { data: existing } = await applySourceFilter(
        (supabase as any)
          .from('workout_logs')
          .select('id')
          .eq('user_id', user.id),
        source,
      )
        .is('completed_at', null)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cancelled) return;

      if (existing?.id) {
        setWorkoutLogId(existing.id);
        await hydrateFromExistingLog(existing.id);
      } else {
        const { data: created, error } = await (supabase as any)
          .from('workout_logs')
          .insert(buildInsertPayload(source, user.id))
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
  }, [user, source.kind, (source as any).programId, (source as any).postId, (source as any).week, (source as any).day]);

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

  // Fetch most recent completed set for each movement (last-time hint)
  useEffect(() => {
    if (!user) return;
    const ids = Array.from(
      new Set(exerciseState.map(e => e.movementId).filter((id): id is string => !!id))
    );
    if (ids.length === 0) return;
    (async () => {
      const { data } = await (supabase as any)
        .from('exercise_logs')
        .select('movement_id, workout_log_id, set_logs(weight, completed_reps, rpe, completed, created_at), workout_logs!inner(user_id, completed_at)')
        .in('movement_id', ids)
        .eq('workout_logs.user_id', user.id)
        .not('workout_logs.completed_at', 'is', null)
        .order('created_at', { ascending: false })
        .limit(50);
      if (!data) return;
      const out: Record<string, PrevHint> = {};
      for (const row of data as any[]) {
        const mid = row.movement_id;
        if (!mid || out[mid]) continue;
        if (workoutLogId && row.workout_log_id === workoutLogId) continue;
        const completedSets = (row.set_logs || []).filter((s: any) => s.completed);
        if (completedSets.length === 0) continue;
        const latest = completedSets.sort((a: any, b: any) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0];
        out[mid] = { weight: latest.weight, reps: latest.completed_reps, rpe: latest.rpe };
      }
      setPrevHints(out);
    })();
  }, [user, exerciseState, workoutLogId]);

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

  // ---------------------------------------------------------------------------
  // Mid-session draft auto-save.
  //
  // Writes the current in-progress exerciseState + cardioState to the existing
  // workout_log WITHOUT stamping completed_at, so the resume path picks it back
  // up if the user backgrounds the app or closes the dialog mid-workout.
  //
  // Safe to write draft sets (completed = false) because the
  // update_personal_records trigger now gates on NEW.completed = true.
  // ---------------------------------------------------------------------------
  const isSavingDraftRef = useRef(false);
  const saveDraftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saveDraft = useCallback(async () => {
    if (readOnly || !workoutLogId || !user) return;
    if (isSavingDraftRef.current) return;
    isSavingDraftRef.current = true;
    try {
      const isSetFilled = (s: SetRow) => {
        const w = parseFloat(s.weight);
        const r = parseFloat(s.rpe);
        return (
          (s.weight.trim() !== '' && !isNaN(w) && w > 0) ||
          (s.rpe.trim() !== '' && !isNaN(r)) ||
          s.completed === true
        );
      };
      const isCardioFilled = (c: CardioState) => {
        const d = parseFloat(c.duration);
        return (
          c.completed === true ||
          (c.duration.trim() !== '' && !isNaN(d) && d > 0) ||
          c.notes.trim() !== ''
        );
      };

      // Clear existing children for this workout_log, then re-insert current state.
      const { data: priorEx } = await (supabase as any)
        .from('exercise_logs')
        .select('id')
        .eq('workout_log_id', workoutLogId);
      if (priorEx && priorEx.length > 0) {
        const priorIds = priorEx.map((p: any) => p.id);
        await (supabase as any).from('set_logs').delete().in('exercise_log_id', priorIds);
        await (supabase as any).from('exercise_logs').delete().in('id', priorIds);
      }

      // Strength + mobility
      for (let i = 0; i < exerciseState.length; i++) {
        const ex = exerciseState[i];
        const movement = ex.movementId ? movementCache[ex.movementId] : undefined;
        const isBodyweight = !!movement?.is_bodyweight;
        const filledSets = ex.sets.filter(isSetFilled);
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
        if (exErr || !exLog) continue;

        const setRows = filledSets.map((s, si) => ({
          exercise_log_id: exLog.id,
          set_number: si + 1,
          target_reps: ex.prescribedReps || null,
          completed_reps: s.reps ? parseInt(s.reps, 10) || null : null,
          weight: isBodyweight ? null : (s.weight ? parseFloat(s.weight) || null : null),
          rpe: s.rpe ? parseFloat(s.rpe) || null : null,
          completed: s.completed, // draft sets remain completed=false; trigger no-ops
        }));
        await (supabase as any).from('set_logs').insert(setRows);
      }

      // Cardio
      for (let i = 0; i < cardioState.length; i++) {
        const c = cardioState[i];
        if (!isCardioFilled(c)) continue;
        const sortOrder = exerciseState.length + i;
        await (supabase as any).from('exercise_logs').insert({
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
      }
      // Intentionally do NOT update workout_logs.completed_at — stays NULL (in-progress).
    } catch (err) {
      console.error('saveDraft failed:', err);
    } finally {
      isSavingDraftRef.current = false;
    }
  }, [readOnly, workoutLogId, user, exerciseState, cardioState, movementCache]);

  // Debounce: ~3s after the last edit to exerciseState/cardioState.
  useEffect(() => {
    if (readOnly || !workoutLogId) return;
    if (saveDraftTimerRef.current) clearTimeout(saveDraftTimerRef.current);
    saveDraftTimerRef.current = setTimeout(() => {
      saveDraft();
    }, 3000);
    return () => {
      if (saveDraftTimerRef.current) clearTimeout(saveDraftTimerRef.current);
    };
  }, [exerciseState, cardioState, readOnly, workoutLogId, saveDraft]);

  // Immediate save when the app is backgrounded / tab hidden / screen locked.
  useEffect(() => {
    if (readOnly || !workoutLogId) return;
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        if (saveDraftTimerRef.current) {
          clearTimeout(saveDraftTimerRef.current);
          saveDraftTimerRef.current = null;
        }
        saveDraft();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [readOnly, workoutLogId, saveDraft]);

  const handleFinish = async () => {
    if (!user || !workoutLogId) return;

    // Guard: any data anywhere?
    // NOTE: `reps` is pre-seeded from the prescription, so it does NOT count
    // as a user-entered signal. Only weight / rpe / completed indicate intent.
    // A weight of "0" is NOT a real entry — require parseFloat > 0.
    const isSetFilled = (s: SetRow) => {
      const w = parseFloat(s.weight);
      const r = parseFloat(s.rpe);
      return (
        (s.weight.trim() !== '' && !isNaN(w) && w > 0) ||
        (s.rpe.trim() !== '' && !isNaN(r)) ||
        s.completed === true
      );
    };
    const isCardioFilled = (c: CardioState) => {
      const d = parseFloat(c.duration);
      return (
        c.completed === true ||
        (c.duration.trim() !== '' && !isNaN(d) && d > 0) ||
        c.notes.trim() !== ''
      );
    };
    const hasStrengthData = exerciseState.some(ex => ex.sets.some(isSetFilled));
    const hasCardioData = cardioState.some(isCardioFilled);
    if (!hasStrengthData && !hasCardioData) {
      toast.error('Nothing to log. Complete at least one set or mark a cardio activity.');
      // Drop the empty stub so we don't leave orphan in-progress logs
      await (supabase as any).from('workout_logs').delete().eq('id', workoutLogId);
      setWorkoutLogId(null);
      onBack();
      return;
    }

    // Validate RPE before any writes
    for (const ex of exerciseState) {
      for (const s of ex.sets) {
        if (!s.rpe) continue;
        const n = parseFloat(s.rpe);
        if (isNaN(n) || n < 1 || n > 10) {
          toast.error('RPE must be between 1 and 10.');
          return;
        }
      }
    }

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
      const movement = ex.movementId ? movementCache[ex.movementId] : undefined;
      const isBodyweight = !!movement?.is_bodyweight;
      const filledSets = ex.sets.filter(isSetFilled);
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
        weight: isBodyweight ? null : (s.weight ? parseFloat(s.weight) || null : null),
        rpe: s.rpe ? parseFloat(s.rpe) || null : null,
        completed: s.completed,
      }));
      const { error: setErr } = await (supabase as any).from('set_logs').insert(setRows);
      if (setErr) console.error('set_logs insert failed:', setErr);
    }

    // Cardio
    for (let i = 0; i < cardioState.length; i++) {
      const c = cardioState[i];
      if (!isCardioFilled(c)) continue;
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

  const hasInvalidRpe = exerciseState.some(ex =>
    ex.sets.some(s => {
      if (!s.rpe) return false;
      const n = parseFloat(s.rpe);
      return isNaN(n) || n < 1 || n > 10;
    })
  );

  return (
    <>
      <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5">
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
        {source.kind === 'coaching_program' ? (
          <Badge variant="outline" className="text-[10px]">
            Week {source.week + 1} · Day {source.day + 1}
          </Badge>
        ) : (
          <Badge variant="outline" className="text-[10px]">Daily Dose</Badge>
        )}
      </div>

      {exerciseState.length === 0 && cardioState.length === 0 && nutritionBlocks.length === 0 && (
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Nothing to log on this day.</p>
        </Card>
      )}

      {readOnly && (
        <div className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-primary" />
          <p className="text-xs text-primary font-medium">
            Completed{completedAt ? ` on ${new Date(completedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}
          </p>
        </div>
      )}

      {/* Strength + Mobility exercises */}
      {exerciseState.map((ex, exIdx) => {
        const movement = ex.movementId ? movementCache[ex.movementId] : undefined;
        const isBodyweight = !!movement?.is_bodyweight;
        const hint = ex.movementId ? prevHints[ex.movementId] : undefined;
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
                  {isBodyweight && (
                    <Badge variant="secondary" className="text-[9px] px-1.5 py-0">Bodyweight</Badge>
                  )}
                </div>
                {ex.prescribedReps && (
                  <p className="text-[11px] text-muted-foreground">Prescribed: {ex.sets.length}×{ex.prescribedReps}</p>
                )}
                {hint && (
                  <p className="text-[11px] text-muted-foreground">
                    Last time:{' '}
                    {hint.weight != null ? `${hint.weight} lb` : 'BW'}
                    {hint.reps != null ? ` × ${hint.reps}` : ''}
                    {hint.rpe != null ? ` @ RPE ${hint.rpe}` : ''}
                  </p>
                )}
              </div>
            </div>

            {/* Desktop / tablet: horizontal table */}
            <div className="hidden sm:block space-y-1.5">
              <div className="grid grid-cols-[24px_1fr_1fr_1fr_28px_28px] gap-1.5 items-center text-[10px] uppercase tracking-wider text-muted-foreground px-1">
                <span>#</span>
                <span>Weight (lb)</span>
                <span>Reps</span>
                <span>RPE</span>
                <span></span>
                <span></span>
              </div>
              {ex.sets.map((s, si) => {
                const rpeNum = s.rpe ? parseFloat(s.rpe) : null;
                const rpeInvalid = s.rpe !== '' && (rpeNum === null || isNaN(rpeNum) || rpeNum < 1 || rpeNum > 10);
                const isActive = !readOnly && activeSet.exIdx === exIdx && activeSet.setIdx === si;
                const focusActive = () => {
                  if (!readOnly) setActiveSet({ exIdx, setIdx: si });
                };
                return (
                  <div
                    key={si}
                    ref={registerSetRow(exIdx, si)}
                    data-setrow={`${exIdx}:${si}`}
                    className={`grid grid-cols-[24px_1fr_1fr_1fr_28px_28px] gap-1.5 items-start rounded-md px-1 py-1 transition-colors ${
                      isActive ? 'ring-2 ring-primary bg-primary/5' : ''
                    }`}
                  >
                    <span className="text-xs text-center pt-2 flex items-center justify-center">
                      {s.completed ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-primary fill-primary/15" />
                      ) : (
                        <span className="text-muted-foreground">{si + 1}</span>
                      )}
                    </span>
                    {isBodyweight ? (
                      <div className="h-8 flex items-center px-2 rounded-md border border-dashed border-border bg-muted/30 text-[11px] text-muted-foreground italic">
                        Bodyweight
                      </div>
                    ) : (
                      <Input
                        type="number"
                        inputMode="decimal"
                        placeholder="0"
                        value={s.weight}
                        onChange={e => updateSet(exIdx, si, { weight: e.target.value })}
                        onFocus={focusActive}
                        className="h-8 text-sm"
                        disabled={readOnly}
                      />
                    )}
                    <Input
                      type="number"
                      inputMode="numeric"
                      placeholder={ex.prescribedReps || '0'}
                      value={s.reps}
                      onChange={e => updateSet(exIdx, si, { reps: e.target.value })}
                      onFocus={focusActive}
                      className="h-8 text-sm"
                      disabled={readOnly}
                    />
                    <div>
                      <Input
                        type="number"
                        inputMode="decimal"
                        placeholder="—"
                        min={1}
                        max={10}
                        step={0.5}
                        value={s.rpe}
                        onChange={e => updateSet(exIdx, si, { rpe: e.target.value })}
                        onFocus={focusActive}
                        className={`h-8 text-sm ${rpeInvalid ? 'border-destructive' : ''}`}
                        disabled={readOnly}
                        aria-invalid={rpeInvalid}
                      />
                      {rpeInvalid && <p className="text-[10px] text-destructive mt-0.5">1–10</p>}
                    </div>
                    <div className="flex items-center justify-center pt-2">
                      <Checkbox
                        checked={s.completed}
                        onCheckedChange={v => updateSet(exIdx, si, { completed: !!v })}
                        disabled={readOnly}
                      />
                    </div>
                    {readOnly ? (
                      <span />
                    ) : (
                      <button
                        type="button"
                        onClick={() => removeSet(exIdx, si)}
                        disabled={ex.sets.length <= 1}
                        className="text-muted-foreground hover:text-destructive disabled:opacity-30 pt-2"
                        aria-label="Remove set"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Mobile: stacked compact cards */}
            <div className="sm:hidden space-y-2">
              {ex.sets.map((s, si) => {
                const rpeNum = s.rpe ? parseFloat(s.rpe) : null;
                const rpeInvalid = s.rpe !== '' && (rpeNum === null || isNaN(rpeNum) || rpeNum < 1 || rpeNum > 10);
                const isActive = !readOnly && activeSet.exIdx === exIdx && activeSet.setIdx === si;
                const focusActive = () => {
                  if (!readOnly) setActiveSet({ exIdx, setIdx: si });
                };
                return (
                  <div
                    key={si}
                    ref={registerSetRow(exIdx, si)}
                    data-setrow={`${exIdx}:${si}`}
                    className={`rounded-md border p-2 space-y-2 bg-card transition-colors ${
                      isActive ? 'border-primary ring-2 ring-primary bg-primary/5' : 'border-border'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        {s.completed && <CheckCircle2 className="w-3.5 h-3.5 text-primary fill-primary/15" />}
                        Set {si + 1}
                      </span>
                      {!readOnly && (
                        <button
                          type="button"
                          onClick={() => removeSet(exIdx, si)}
                          disabled={ex.sets.length <= 1}
                          className="text-muted-foreground hover:text-destructive disabled:opacity-30"
                          aria-label="Remove set"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-muted-foreground">Weight</label>
                        {isBodyweight ? (
                          <div className="h-8 flex items-center px-2 rounded-md border border-dashed border-border bg-muted/30 text-[11px] text-muted-foreground italic">
                            Bodyweight
                          </div>
                        ) : (
                          <Input
                            type="number"
                            inputMode="decimal"
                            placeholder="0"
                            value={s.weight}
                            onChange={e => updateSet(exIdx, si, { weight: e.target.value })}
                            onFocus={focusActive}
                            className="h-8 text-sm"
                            disabled={readOnly}
                          />
                        )}
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground">Reps</label>
                        <Input
                          type="number"
                          inputMode="numeric"
                          placeholder={ex.prescribedReps || '0'}
                          value={s.reps}
                          onChange={e => updateSet(exIdx, si, { reps: e.target.value })}
                          onFocus={focusActive}
                          className="h-8 text-sm"
                          disabled={readOnly}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 items-end">
                      <div>
                        <label className="text-[10px] text-muted-foreground">RPE (1–10)</label>
                        <Input
                          type="number"
                          inputMode="decimal"
                          placeholder="—"
                          min={1}
                          max={10}
                          step={0.5}
                          value={s.rpe}
                          onChange={e => updateSet(exIdx, si, { rpe: e.target.value })}
                          onFocus={focusActive}
                          className={`h-8 text-sm ${rpeInvalid ? 'border-destructive' : ''}`}
                          disabled={readOnly}
                          aria-invalid={rpeInvalid}
                        />
                        {rpeInvalid && <p className="text-[10px] text-destructive mt-0.5">1–10</p>}
                      </div>
                      <label className="flex items-center gap-2 h-8 px-2 rounded-md bg-muted/40">
                        <Checkbox
                          checked={s.completed}
                          onCheckedChange={v => updateSet(exIdx, si, { completed: !!v })}
                          disabled={readOnly}
                        />
                        <span className="text-xs">Complete</span>
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>

            {!readOnly && (
              <Button variant="outline" size="sm" onClick={() => addSet(exIdx)} className="w-full text-xs gap-1">
                <Plus className="w-3.5 h-3.5" /> Add set
              </Button>
            )}
          </Card>
        );
      })}

      {/* Cardio */}
      {cardioState.map((c, ci) => (
        <Card key={`cardio-${ci}`} className="p-4 space-y-3">
          <div className="space-y-0.5">
            <p className="text-[10px] uppercase tracking-wider text-primary font-medium">Conditioning</p>
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
                disabled={readOnly}
              />
            </div>
            <div className="flex items-center gap-2 pt-4">
              <Checkbox
                id={`cardio-done-${ci}`}
                checked={c.completed}
                onCheckedChange={v => updateCardio(ci, { completed: !!v })}
                disabled={readOnly}
              />
              <label htmlFor={`cardio-done-${ci}`} className="text-xs">Completed</label>
            </div>
          </div>
          <Textarea
            placeholder="Notes (optional)"
            value={c.notes}
            onChange={e => updateCardio(ci, { notes: e.target.value })}
            className="min-h-[60px] text-sm"
            disabled={readOnly}
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

      {readOnly ? (
        <div className="pt-2">
          <Button
            onClick={() => {
              setReadOnly(false);
              setCompletedAt(null);
            }}
            className="w-full gap-1.5"
          >
            <Pencil className="w-4 h-4" />
            Edit log
          </Button>
        </div>
      ) : (
        <>
          {exerciseState.length > 0 && (
            <div className="sticky bottom-2 z-10 pt-2 pointer-events-none">
              <Button
                onClick={handleNext}
                size="lg"
                className="w-full gap-1.5 shadow-lg pointer-events-auto"
              >
                {isLastSetOfLastExercise ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" /> Mark last set complete
                  </>
                ) : (
                  <>
                    Next set <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
          )}
          <div className="pt-2">
            <Button
              onClick={handleFinish}
              disabled={submitting || hasInvalidRpe}
              variant={exerciseState.length > 0 ? 'outline' : 'default'}
              className="w-full gap-1.5"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Finish workout
            </Button>
          </div>
        </>
      )}

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
    </>
  );
}