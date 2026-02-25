import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Check, ChevronDown, ChevronUp, Clock, Timer, Hash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Workout } from '@/types/database';

interface SetData {
  set_number: number;
  target_reps: string;
  completed_reps: number | null;
  weight: number | null;
  completed: boolean;
}

interface ExerciseData {
  template_id: string | null;
  name: string;
  notes: string;
  tracking_type: 'sets_reps' | 'time' | 'total_reps';
  section_type: 'warmup' | 'main';
  sort_order: number;
  completed: boolean;
  time_result: string;
  total_reps_result: number | null;
  sets: SetData[];
  default_rest: string;
}

interface WorkoutSessionViewProps {
  workout: Workout;
  onBack: () => void;
  onComplete: () => void;
}

export function WorkoutSessionView({ workout, onBack, onComplete }: WorkoutSessionViewProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [exercises, setExercises] = useState<ExerciseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [finishing, setFinishing] = useState(false);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [openExercises, setOpenExercises] = useState<Set<number>>(new Set());
  const [workoutLogId, setWorkoutLogId] = useState<string | null>(null);

  useEffect(() => {
    loadWorkoutStructure();
  }, [workout.id]);

  const loadWorkoutStructure = async () => {
    // Fetch sections
    const { data: sectionsData } = await supabase
      .from('workout_sections')
      .select('*')
      .eq('workout_id', workout.id)
      .order('sort_order');

    if (!sectionsData || sectionsData.length === 0) {
      // No structure defined - show empty state
      setExercises([]);
      setLoading(false);
      return;
    }

    const sectionIds = sectionsData.map(s => s.id);
    const { data: templatesData } = await supabase
      .from('exercise_templates')
      .select('*')
      .in('section_id', sectionIds)
      .order('sort_order');

    const exerciseList: ExerciseData[] = [];
    let globalOrder = 0;

    for (const section of sectionsData) {
      const sectionExercises = (templatesData || []).filter(t => t.section_id === section.id);
      for (const ex of sectionExercises) {
        const sets: SetData[] = [];
        if (ex.tracking_type === 'sets_reps') {
          for (let i = 1; i <= (ex.default_sets || 3); i++) {
            sets.push({
              set_number: i,
              target_reps: ex.default_reps || '10',
              completed_reps: null,
              weight: null,
              completed: false,
            });
          }
        }

        exerciseList.push({
          template_id: ex.id,
          name: ex.name,
          notes: ex.notes || '',
          tracking_type: ex.tracking_type as any,
          section_type: section.section_type as 'warmup' | 'main',
          sort_order: globalOrder++,
          completed: false,
          time_result: '',
          total_reps_result: null,
          sets,
          default_rest: ex.default_rest || '',
        });
      }
    }

    setExercises(exerciseList);
    // Auto-open first exercise
    if (exerciseList.length > 0) setOpenExercises(new Set([0]));
    setLoading(false);

    // Create workout log
    if (user) {
      const { data: logData } = await supabase
        .from('workout_logs')
        .insert({ user_id: user.id, workout_id: workout.id })
        .select()
        .single();
      if (logData) setWorkoutLogId(logData.id);
    }
  };

  const toggleExercise = (index: number) => {
    const next = new Set(openExercises);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    setOpenExercises(next);
  };

  const toggleExerciseComplete = (index: number) => {
    const updated = [...exercises];
    updated[index].completed = !updated[index].completed;
    setExercises(updated);
  };

  const updateSet = (exIndex: number, setIndex: number, field: keyof SetData, value: any) => {
    const updated = [...exercises];
    (updated[exIndex].sets[setIndex] as any)[field] = value;
    setExercises(updated);
  };

  const toggleSetComplete = (exIndex: number, setIndex: number) => {
    const updated = [...exercises];
    updated[exIndex].sets[setIndex].completed = !updated[exIndex].sets[setIndex].completed;
    
    // Check if all sets done → auto-complete exercise
    const allDone = updated[exIndex].sets.every(s => s.completed);
    if (allDone) updated[exIndex].completed = true;

    // Auto-advance: open next uncompleted set's exercise
    if (updated[exIndex].sets[setIndex].completed) {
      const nextSetIndex = setIndex + 1;
      if (nextSetIndex < updated[exIndex].sets.length) {
        // Stay on same exercise
      } else {
        // Move to next exercise
        const nextExIndex = exIndex + 1;
        if (nextExIndex < updated.length) {
          setOpenExercises(prev => {
            const next = new Set(prev);
            next.add(nextExIndex);
            return next;
          });
        }
      }
    }

    setExercises(updated);
  };

  const updateTimeResult = (index: number, value: string) => {
    const updated = [...exercises];
    updated[index].time_result = value;
    setExercises(updated);
  };

  const updateTotalReps = (index: number, value: number | null) => {
    const updated = [...exercises];
    updated[index].total_reps_result = value;
    setExercises(updated);
  };

  const handleFinishWorkout = async () => {
    if (!user || !workoutLogId) return;
    setFinishing(true);

    try {
      // Update workout log
      await supabase
        .from('workout_logs')
        .update({ completed_at: new Date().toISOString() })
        .eq('id', workoutLogId);

      // Save exercise logs
      for (const ex of exercises) {
        const { data: exLog } = await supabase
          .from('exercise_logs')
          .insert({
            workout_log_id: workoutLogId,
            exercise_template_id: ex.template_id,
            exercise_name: ex.name,
            tracking_type: ex.tracking_type,
            completed: ex.completed,
            time_result: ex.tracking_type === 'time' ? ex.time_result || null : null,
            total_reps_result: ex.tracking_type === 'total_reps' ? ex.total_reps_result : null,
            section_type: ex.section_type,
            sort_order: ex.sort_order,
          })
          .select()
          .single();

        if (exLog && ex.sets.length > 0) {
          const setInserts = ex.sets.map(s => ({
            exercise_log_id: exLog.id,
            set_number: s.set_number,
            target_reps: s.target_reps,
            completed_reps: s.completed_reps,
            weight: s.weight,
            completed: s.completed,
          }));
          await supabase.from('set_logs').insert(setInserts);
        }
      }

      // Also add to workout_completions for backward compat
      await supabase.from('workout_completions').insert({
        workout_id: workout.id,
        user_id: user.id,
      });

      toast({ title: 'Workout logged! 💪' });
      setShowFinishConfirm(false);
      onComplete();
    } catch (error: any) {
      toast({ title: 'Failed to log workout', description: error.message, variant: 'destructive' });
    } finally {
      setFinishing(false);
    }
  };

  const warmupExercises = exercises.filter(e => e.section_type === 'warmup');
  const mainExercises = exercises.filter(e => e.section_type === 'main');
  const completedCount = exercises.filter(e => e.completed).length;
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <div className="h-8 bg-muted rounded animate-pulse" />
        <div className="h-32 bg-muted rounded animate-pulse" />
        <div className="h-32 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  if (exercises.length === 0) {
    return (
      <div className="p-4 space-y-4">
        <Button variant="ghost" size="sm" onClick={onBack} className="mb-2">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <Card className="p-8 text-center text-muted-foreground">
          <p className="font-medium mb-2">No exercises configured</p>
          <p className="text-sm">An admin needs to add warm-up and main workout exercises to this workout first.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h2 className="font-semibold text-lg">{workout.title}</h2>
          <p className="text-sm text-muted-foreground">{today}</p>
        </div>
        <Badge variant="secondary">
          {completedCount}/{exercises.length}
        </Badge>
      </div>

      {/* Warm-Up Section */}
      {warmupExercises.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
            🔥 Warm-Up
          </h3>
          <div className="space-y-2">
            {warmupExercises.map((ex) => {
              const globalIndex = exercises.indexOf(ex);
              return (
                <Card
                  key={globalIndex}
                  className={`p-3 transition-colors ${ex.completed ? 'bg-success/10 border-success/30' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={ex.completed}
                      onCheckedChange={() => toggleExerciseComplete(globalIndex)}
                    />
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${ex.completed ? 'line-through text-muted-foreground' : ''}`}>
                        {ex.name}
                      </p>
                      {ex.notes && (
                        <p className="text-xs text-muted-foreground mt-0.5">{ex.notes}</p>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Workout Section */}
      {mainExercises.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
            💪 Main Workout
          </h3>
          <div className="space-y-2">
            {mainExercises.map((ex) => {
              const globalIndex = exercises.indexOf(ex);
              const isOpen = openExercises.has(globalIndex);

              return (
                <Collapsible
                  key={globalIndex}
                  open={isOpen}
                  onOpenChange={() => toggleExercise(globalIndex)}
                >
                  <Card className={`overflow-hidden transition-colors ${ex.completed ? 'bg-success/10 border-success/30' : ''}`}>
                    <CollapsibleTrigger className="w-full p-3 flex items-center gap-3 text-left">
                      <Checkbox
                        checked={ex.completed}
                        onCheckedChange={() => toggleExerciseComplete(globalIndex)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${ex.completed ? 'line-through text-muted-foreground' : ''}`}>
                          {ex.name}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {ex.tracking_type === 'sets_reps' && (
                            <span className="text-xs text-muted-foreground">
                              {ex.sets.length} sets × {ex.sets[0]?.target_reps} reps
                            </span>
                          )}
                          {ex.tracking_type === 'time' && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Timer className="w-3 h-3" /> For Time
                            </span>
                          )}
                          {ex.tracking_type === 'total_reps' && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Hash className="w-3 h-3" /> Total Reps
                            </span>
                          )}
                          {ex.default_rest && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {ex.default_rest}
                            </span>
                          )}
                        </div>
                      </div>
                      {isOpen ? (
                        <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                      )}
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <div className="px-3 pb-3 space-y-2">
                        {ex.notes && (
                          <p className="text-xs text-muted-foreground bg-secondary/50 p-2 rounded-lg">
                            💡 {ex.notes}
                          </p>
                        )}

                        {/* Sets × Reps Tracking */}
                        {ex.tracking_type === 'sets_reps' && (
                          <div className="space-y-1.5">
                            <div className="grid grid-cols-[2rem_1fr_1fr_1fr_2rem] gap-1.5 text-[10px] font-semibold text-muted-foreground uppercase px-1">
                              <span>Set</span>
                              <span>Target</span>
                              <span>Reps</span>
                              <span>Weight</span>
                              <span></span>
                            </div>
                            {ex.sets.map((set, setIdx) => (
                              <div
                                key={setIdx}
                                className={`grid grid-cols-[2rem_1fr_1fr_1fr_2rem] gap-1.5 items-center ${
                                  set.completed ? 'opacity-60' : ''
                                }`}
                              >
                                <span className="text-xs text-center font-medium text-muted-foreground">
                                  {set.set_number}
                                </span>
                                <span className="text-xs text-center text-muted-foreground">
                                  {set.target_reps}
                                </span>
                                <Input
                                  type="number"
                                  placeholder="—"
                                  className="h-8 text-xs text-center px-1"
                                  value={set.completed_reps ?? ''}
                                  onChange={(e) =>
                                    updateSet(globalIndex, setIdx, 'completed_reps', e.target.value ? parseInt(e.target.value) : null)
                                  }
                                />
                                <Input
                                  type="number"
                                  placeholder="lbs"
                                  className="h-8 text-xs text-center px-1"
                                  value={set.weight ?? ''}
                                  onChange={(e) =>
                                    updateSet(globalIndex, setIdx, 'weight', e.target.value ? parseFloat(e.target.value) : null)
                                  }
                                />
                                <Checkbox
                                  checked={set.completed}
                                  onCheckedChange={() => toggleSetComplete(globalIndex, setIdx)}
                                />
                              </div>
                            ))}
                          </div>
                        )}

                        {/* For Time Tracking */}
                        {ex.tracking_type === 'time' && (
                          <div className="flex items-center gap-2">
                            <Timer className="w-4 h-4 text-muted-foreground" />
                            <Input
                              placeholder="mm:ss"
                              className="h-9 text-sm w-32"
                              value={ex.time_result}
                              onChange={(e) => updateTimeResult(globalIndex, e.target.value)}
                            />
                            <Button
                              size="sm"
                              variant={ex.completed ? 'success' : 'outline'}
                              onClick={() => toggleExerciseComplete(globalIndex)}
                            >
                              {ex.completed ? 'Done' : 'Save'}
                            </Button>
                          </div>
                        )}

                        {/* Total Reps Tracking */}
                        {ex.tracking_type === 'total_reps' && (
                          <div className="flex items-center gap-2">
                            <Hash className="w-4 h-4 text-muted-foreground" />
                            <Input
                              type="number"
                              placeholder="Total reps"
                              className="h-9 text-sm w-32"
                              value={ex.total_reps_result ?? ''}
                              onChange={(e) =>
                                updateTotalReps(globalIndex, e.target.value ? parseInt(e.target.value) : null)
                              }
                            />
                            <Button
                              size="sm"
                              variant={ex.completed ? 'success' : 'outline'}
                              onClick={() => toggleExerciseComplete(globalIndex)}
                            >
                              {ex.completed ? 'Done' : 'Save'}
                            </Button>
                          </div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              );
            })}
          </div>
        </div>
      )}

      {/* Finish Button */}
      <div className="fixed bottom-20 left-0 right-0 p-4 bg-background/95 backdrop-blur border-t border-border">
        <Button
          className="w-full max-w-lg mx-auto block"
          size="lg"
          onClick={() => setShowFinishConfirm(true)}
        >
          <Check className="w-5 h-5 mr-2" />
          Finish & Log Workout
        </Button>
      </div>

      {/* Finish Confirmation */}
      <AlertDialog open={showFinishConfirm} onOpenChange={setShowFinishConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finish Workout?</AlertDialogTitle>
            <AlertDialogDescription>
              You completed {completedCount} of {exercises.length} exercises. This will save your workout log.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Going</AlertDialogCancel>
            <AlertDialogAction onClick={handleFinishWorkout} disabled={finishing}>
              {finishing ? 'Saving...' : 'Log Workout'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
