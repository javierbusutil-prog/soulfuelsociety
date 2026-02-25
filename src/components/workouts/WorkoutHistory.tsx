import { useState, useEffect } from 'react';
import { ArrowLeft, ChevronDown, ChevronUp, Clock, Hash, Dumbbell, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

interface WorkoutLogSummary {
  id: string;
  workout_id: string;
  workout_title: string;
  completed_at: string | null;
  started_at: string;
  exercise_count: number;
  summary: string;
}

interface ExerciseLogDetail {
  id: string;
  exercise_name: string;
  superset_movement_name: string | null;
  tracking_type: string;
  completed: boolean;
  time_result: string | null;
  total_reps_result: number | null;
  section_type: string;
  sort_order: number;
  sets: SetLogDetail[];
}

interface SetLogDetail {
  set_number: number;
  target_reps: string | null;
  completed_reps: number | null;
  weight: number | null;
  completed: boolean;
}

interface WorkoutHistoryProps {
  onBack: () => void;
}

export function WorkoutHistory({ onBack }: WorkoutHistoryProps) {
  const { user } = useAuth();
  const [logs, setLogs] = useState<WorkoutLogSummary[]>([]);
  const [selectedLog, setSelectedLog] = useState<string | null>(null);
  const [logDetail, setLogDetail] = useState<ExerciseLogDetail[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [openExercises, setOpenExercises] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (user) fetchLogs();
  }, [user]);

  const fetchLogs = async () => {
    if (!user) return;

    const { data: logsData } = await supabase
      .from('workout_logs')
      .select('id, workout_id, started_at, completed_at')
      .eq('user_id', user.id)
      .order('started_at', { ascending: false })
      .limit(50);

    if (!logsData || logsData.length === 0) {
      setLogs([]);
      setLoading(false);
      return;
    }

    // Get workout titles
    const workoutIds = [...new Set(logsData.map(l => l.workout_id))];
    const { data: workoutsData } = await supabase
      .from('workouts')
      .select('id, title')
      .in('id', workoutIds);

    const titleMap = new Map((workoutsData || []).map(w => [w.id, w.title]));

    // Get exercise counts per log
    const logIds = logsData.map(l => l.id);
    const { data: exerciseCounts } = await supabase
      .from('exercise_logs')
      .select('workout_log_id, tracking_type, completed, time_result, total_reps_result')
      .in('workout_log_id', logIds);

    const summaries: WorkoutLogSummary[] = logsData.map(log => {
      const exLogs = (exerciseCounts || []).filter(e => e.workout_log_id === log.id);
      const completedEx = exLogs.filter(e => e.completed).length;
      const timeEx = exLogs.find(e => e.tracking_type === 'time' && e.time_result);

      let summary = `${completedEx} exercise${completedEx !== 1 ? 's' : ''} logged`;
      if (timeEx) summary = `Time: ${timeEx.time_result}`;

      return {
        id: log.id,
        workout_id: log.workout_id,
        workout_title: titleMap.get(log.workout_id) || 'Workout',
        completed_at: log.completed_at,
        started_at: log.started_at,
        exercise_count: exLogs.length,
        summary,
      };
    });

    setLogs(summaries);
    setLoading(false);
  };

  const fetchLogDetail = async (logId: string) => {
    if (selectedLog === logId) {
      setSelectedLog(null);
      return;
    }

    setSelectedLog(logId);
    setDetailLoading(true);

    const { data: exercisesData } = await supabase
      .from('exercise_logs')
      .select('*')
      .eq('workout_log_id', logId)
      .order('sort_order');

    if (!exercisesData) {
      setLogDetail([]);
      setDetailLoading(false);
      return;
    }

    const exerciseIds = exercisesData.map(e => e.id);
    const { data: setsData } = await supabase
      .from('set_logs')
      .select('*')
      .in('exercise_log_id', exerciseIds)
      .order('set_number');

    const details: ExerciseLogDetail[] = exercisesData.map(ex => ({
      id: ex.id,
      exercise_name: ex.exercise_name,
      superset_movement_name: ex.superset_movement_name || null,
      tracking_type: ex.tracking_type,
      completed: ex.completed,
      time_result: ex.time_result,
      total_reps_result: ex.total_reps_result,
      section_type: ex.section_type,
      sort_order: ex.sort_order,
      sets: (setsData || [])
        .filter(s => s.exercise_log_id === ex.id)
        .map(s => ({
          set_number: s.set_number,
          target_reps: s.target_reps,
          completed_reps: s.completed_reps,
          weight: s.weight,
          completed: s.completed,
        })),
    }));

    setLogDetail(details);
    setOpenExercises(new Set());
    setDetailLoading(false);
  };

  const toggleExercise = (index: number) => {
    const next = new Set(openExercises);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    setOpenExercises(next);
  };

  if (loading) {
    return (
      <div className="p-4 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="p-4 animate-pulse">
            <div className="h-4 bg-muted rounded w-3/4 mb-2" />
            <div className="h-3 bg-muted rounded w-1/2" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h2 className="font-semibold text-lg">Workout History</h2>
      </div>

      {logs.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          <Dumbbell className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No workouts logged yet</p>
          <p className="text-sm mt-1">Start a workout to build your history!</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <div key={log.id}>
              <Card
                className={`p-4 cursor-pointer hover:bg-secondary/50 transition-colors ${
                  selectedLog === log.id ? 'border-primary/50' : ''
                }`}
                onClick={() => fetchLogDetail(log.id)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-sm">{log.workout_title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {format(new Date(log.started_at), 'EEEE, MMM d · h:mm a')}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{log.summary}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {log.completed_at && (
                      <Badge variant="secondary" className="text-success text-[10px]">
                        <Check className="w-3 h-3 mr-0.5" /> Done
                      </Badge>
                    )}
                    {selectedLog === log.id ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                </div>
              </Card>

              {/* Detail view */}
              {selectedLog === log.id && (
                <div className="mt-1 ml-2 space-y-1.5">
                  {detailLoading ? (
                    <div className="p-3 text-sm text-muted-foreground">Loading...</div>
                  ) : (
                    <>
                      {/* Group by section */}
                      {['warmup', 'main'].map(sectionType => {
                        const sectionExercises = logDetail.filter(e => e.section_type === sectionType);
                        if (sectionExercises.length === 0) return null;
                        return (
                          <div key={sectionType}>
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1 py-1">
                              {sectionType === 'warmup' ? '🔥 Warm-Up' : '💪 Main Workout'}
                            </p>
                            {sectionExercises.map((ex, idx) => {
                              const globalIdx = logDetail.indexOf(ex);
                              return (
                                <Collapsible
                                  key={ex.id}
                                  open={openExercises.has(globalIdx)}
                                  onOpenChange={() => toggleExercise(globalIdx)}
                                >
                                  <Card className={`overflow-hidden ${ex.completed ? 'border-success/30' : 'border-border/50'}`}>
                                    <CollapsibleTrigger className="w-full p-2.5 flex items-center gap-2 text-left text-sm">
                                      {ex.completed ? (
                                        <Check className="w-3.5 h-3.5 text-success shrink-0" />
                                      ) : (
                                        <div className="w-3.5 h-3.5 border border-border rounded-sm shrink-0" />
                                      )}
                                      <span className="flex-1 font-medium text-xs">
                                        {ex.exercise_name}
                                        {ex.superset_movement_name && (
                                          <span className="text-primary"> + {ex.superset_movement_name}</span>
                                        )}
                                      </span>
                                      {ex.tracking_type === 'time' && ex.time_result && (
                                        <Badge variant="secondary" className="text-[10px]">
                                          <Clock className="w-2.5 h-2.5 mr-0.5" /> {ex.time_result}
                                        </Badge>
                                      )}
                                      {ex.tracking_type === 'total_reps' && ex.total_reps_result && (
                                        <Badge variant="secondary" className="text-[10px]">
                                          <Hash className="w-2.5 h-2.5 mr-0.5" /> {ex.total_reps_result}
                                        </Badge>
                                      )}
                                      {ex.sets.length > 0 && (
                                        openExercises.has(globalIdx) ? (
                                          <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                                        ) : (
                                          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                                        )
                                      )}
                                    </CollapsibleTrigger>
                                    {ex.sets.length > 0 && (
                                      <CollapsibleContent>
                                        <div className="px-3 pb-2 space-y-1">
                                          <div className="grid grid-cols-4 gap-1 text-[10px] font-semibold text-muted-foreground uppercase">
                                            <span>Set</span>
                                            <span>Target</span>
                                            <span>Reps</span>
                                            <span>Weight</span>
                                          </div>
                                          {ex.sets.map(set => (
                                            <div
                                              key={set.set_number}
                                              className={`grid grid-cols-4 gap-1 text-xs ${
                                                set.completed ? 'text-foreground' : 'text-muted-foreground'
                                              }`}
                                            >
                                              <span>{set.set_number}</span>
                                              <span>{set.target_reps || '—'}</span>
                                              <span>{set.completed_reps ?? '—'}</span>
                                              <span>{set.weight ? `${set.weight} lbs` : '—'}</span>
                                            </div>
                                          ))}
                                        </div>
                                      </CollapsibleContent>
                                    )}
                                  </Card>
                                </Collapsible>
                              );
                            })}
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
