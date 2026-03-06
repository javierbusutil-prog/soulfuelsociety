import { useState, useEffect } from 'react';
import { Check, Dumbbell, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { PlanDay, PlanExercise } from '@/hooks/useWeeklyPlan';

interface ExerciseLog {
  label: string;
  name: string;
  details: string;
  completed: boolean;
  sets: { set_number: number; weight: string; reps: string; completed: boolean }[];
  time_result: string;
  notes: string;
}

interface WeeklyWorkoutLogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  day: PlanDay;
  dateLabel: string;
  onLogged: () => void;
}

export function WeeklyWorkoutLogDialog({
  open,
  onOpenChange,
  day,
  dateLabel,
  onLogged,
}: WeeklyWorkoutLogDialogProps) {
  const { user } = useAuth();
  const [exerciseLogs, setExerciseLogs] = useState<ExerciseLog[]>([]);
  const [expandedIdx, setExpandedIdx] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  const [existingLogId, setExistingLogId] = useState<string | null>(null);
  const [workoutNotes, setWorkoutNotes] = useState('');

  useEffect(() => {
    if (open && day) {
      initializeLogs();
      checkExistingLog();
    }
  }, [open, day]);

  const checkExistingLog = async () => {
    if (!user || !day.id) return;
    const { data } = await supabase
      .from('weekly_plan_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('plan_day_id', day.id)
      .maybeSingle();

    if (data) {
      setExistingLogId(data.id);
      setWorkoutNotes(data.notes || '');
      const savedData = data.exercise_data as unknown as ExerciseLog[] | null;
      if (savedData && Array.isArray(savedData) && savedData.length > 0) {
        setExerciseLogs(savedData);
        return;
      }
    }
    // Fall through to initialize fresh logs
  };

  const initializeLogs = () => {
    const logs: ExerciseLog[] = day.exercises.map((ex) => {
      // Parse details to guess number of sets (e.g. "12,8,4,12,8,4" → 6 sets)
      const setsCount = parseSetsCount(ex.details);
      const sets = Array.from({ length: setsCount }, (_, i) => ({
        set_number: i + 1,
        weight: '',
        reps: '',
        completed: false,
      }));

      return {
        label: ex.label,
        name: ex.name,
        details: ex.details,
        completed: false,
        sets,
        time_result: '',
        notes: '',
      };
    });
    setExerciseLogs(logs);
  };

  const parseSetsCount = (details: string): number => {
    if (!details) return 3;
    // Try to find rep schemes like "12,8,4" or "3x10"
    const multiplyMatch = details.match(/(\d+)\s*x\s*\d+/i);
    if (multiplyMatch) return parseInt(multiplyMatch[1]);
    
    // Count comma-separated numbers
    const repNumbers = details.match(/\d+(?:\s*,\s*\d+)+/);
    if (repNumbers) {
      return repNumbers[0].split(',').length;
    }
    return 3;
  };

  const updateSet = (exIdx: number, setIdx: number, field: 'weight' | 'reps', value: string) => {
    setExerciseLogs(prev => {
      const updated = [...prev];
      updated[exIdx] = { ...updated[exIdx], sets: [...updated[exIdx].sets] };
      updated[exIdx].sets[setIdx] = { ...updated[exIdx].sets[setIdx], [field]: value };
      return updated;
    });
  };

  const toggleSetComplete = (exIdx: number, setIdx: number) => {
    setExerciseLogs(prev => {
      const updated = [...prev];
      updated[exIdx] = { ...updated[exIdx], sets: [...updated[exIdx].sets] };
      const set = updated[exIdx].sets[setIdx];
      updated[exIdx].sets[setIdx] = { ...set, completed: !set.completed };
      // Auto-advance to next exercise if all sets done
      const allDone = updated[exIdx].sets.every(s => s.completed);
      if (allDone) {
        updated[exIdx].completed = true;
      }
      return updated;
    });
  };

  const toggleExerciseComplete = (exIdx: number) => {
    setExerciseLogs(prev => {
      const updated = [...prev];
      const ex = updated[exIdx];
      const newCompleted = !ex.completed;
      updated[exIdx] = {
        ...ex,
        completed: newCompleted,
        sets: ex.sets.map(s => ({ ...s, completed: newCompleted })),
      };
      return updated;
    });
  };

  const addSet = (exIdx: number) => {
    setExerciseLogs(prev => {
      const updated = [...prev];
      const ex = updated[exIdx];
      updated[exIdx] = {
        ...ex,
        sets: [...ex.sets, { set_number: ex.sets.length + 1, weight: '', reps: '', completed: false }],
      };
      return updated;
    });
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    try {
      const payload = {
        user_id: user.id,
        plan_day_id: day.id || null,
        week_start: day.week_start,
        day_of_week: day.day_of_week,
        exercise_data: exerciseLogs as any,
        notes: workoutNotes || null,
      };

      if (existingLogId) {
        const { error } = await supabase
          .from('weekly_plan_logs')
          .update({
            exercise_data: payload.exercise_data,
            notes: payload.notes,
            completed_at: new Date().toISOString(),
          })
          .eq('id', existingLogId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('weekly_plan_logs')
          .insert(payload);
        if (error) throw error;
      }

      toast.success('Workout logged! 💪');
      onLogged();
      onOpenChange(false);
    } catch (err: any) {
      toast.error('Failed to save workout log');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const completedCount = exerciseLogs.filter(e => e.completed).length;
  const totalCount = exerciseLogs.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto overflow-x-hidden p-0 w-[calc(100vw-2rem)]">
        {/* Header */}
        <div className="sticky top-0 bg-background z-10 border-b border-border px-4 py-3">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <Dumbbell className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <DialogTitle className="text-left text-base">{day.title}</DialogTitle>
                <p className="text-xs text-muted-foreground">{dateLabel}</p>
              </div>
              <Badge variant={completedCount === totalCount && totalCount > 0 ? 'default' : 'secondary'} className="text-xs">
                {completedCount}/{totalCount}
              </Badge>
            </div>
          </DialogHeader>
        </div>

        <div className="px-4 py-3 space-y-3">
          {/* Instructional note */}
          <div className="rounded-lg bg-primary/10 border border-primary/20 px-3 py-2.5">
            <p className="text-xs font-medium text-primary">📝 Log your results</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Record weight used, rounds, reps, or time for each exercise. Tap a set checkbox when complete.
            </p>
          </div>
          {exerciseLogs.map((ex, exIdx) => {
            const isExpanded = expandedIdx === exIdx;
            return (
              <Card key={exIdx} className={`overflow-hidden transition-colors ${ex.completed ? 'border-success/40 bg-success/5' : ''}`}>
                {/* Exercise header */}
                <button
                  onClick={() => setExpandedIdx(isExpanded ? -1 : exIdx)}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-left"
                >
                  <Checkbox
                    checked={ex.completed}
                    onCheckedChange={() => toggleExerciseComplete(exIdx)}
                    onClick={(e) => e.stopPropagation()}
                    className="shrink-0"
                  />
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <div className="flex items-start gap-1.5">
                      <span className="text-xs font-bold text-primary shrink-0">{ex.label}</span>
                      <span className={`text-sm font-medium break-words ${ex.completed ? 'line-through text-muted-foreground' : ''}`}>
                        {ex.name}
                      </span>
                    </div>
                    {ex.details && (
                      <p className="text-xs text-muted-foreground mt-0.5 whitespace-pre-wrap break-words">{ex.details}</p>
                    )}
                  </div>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
                </button>

                {/* Expanded: free-text notes */}
                {isExpanded && (
                  <div className="px-3 pb-3 border-t border-border/50 pt-2">
                    <Textarea
                      placeholder="e.g. 135x10, 155x8, 175x6 — felt strong"
                      value={ex.notes}
                      onChange={(e) => {
                        setExerciseLogs(prev => {
                          const updated = [...prev];
                          updated[exIdx] = { ...updated[exIdx], notes: e.target.value };
                          return updated;
                        });
                      }}
                      className="text-sm min-h-[60px]"
                    />
                  </div>
                )}
              </Card>
            );
          })}

          {/* Workout notes */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Workout Notes</label>
            <Textarea
              placeholder="How did it feel? Any PRs?"
              value={workoutNotes}
              onChange={(e) => setWorkoutNotes(e.target.value)}
              className="text-sm min-h-[60px]"
            />
          </div>

          {/* Save button */}
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full gap-2"
          >
            <Check className="w-4 h-4" />
            {existingLogId ? 'Update Workout Log' : 'Log Workout'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
