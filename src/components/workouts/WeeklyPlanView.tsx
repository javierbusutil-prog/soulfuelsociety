import { useState, useEffect, useCallback } from 'react';
import { format, startOfWeek, addWeeks, subWeeks, addDays, getISOWeek } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, Pencil, Trash2, Dumbbell, CheckCircle, ChevronDown, ChevronUp, ClipboardEdit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useWeeklyPlan, PlanDay, PlanExercise } from '@/hooks/useWeeklyPlan';
import { EditDayDialog } from './EditDayDialog';
import { WeeklyWorkoutLogDialog } from './WeeklyWorkoutLogDialog';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function WeeklyPlanView() {
  const { user, isAdmin } = useAuth();
  const [weekOffset, setWeekOffset] = useState(0);
  const baseWeek = startOfWeek(new Date(), { weekStartsOn: 1 });
  const currentWeekStart = weekOffset === 0 ? baseWeek : weekOffset > 0 ? addWeeks(baseWeek, weekOffset) : subWeeks(baseWeek, Math.abs(weekOffset));

  const { days, loading, upsertDay, deleteDay, getDayData } = useWeeklyPlan(currentWeekStart);

  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [expandedDay, setExpandedDay] = useState<number | null>(null);
  const [loggingDay, setLoggingDay] = useState<{ dayIndex: number; day: PlanDay } | null>(null);
  const [completedDayIds, setCompletedDayIds] = useState<Set<string>>(new Set());

  const weekNum = getISOWeek(currentWeekStart);
  const weekLabel = `${format(currentWeekStart, 'MMM d')} – ${format(addDays(currentWeekStart, 6), 'MMM d, yyyy')}`;
  const weekStr = format(startOfWeek(currentWeekStart, { weekStartsOn: 1 }), 'yyyy-MM-dd');

  const fetchCompletions = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('weekly_plan_logs')
      .select('plan_day_id')
      .eq('user_id', user.id)
      .eq('week_start', weekStr);
    if (data) {
      setCompletedDayIds(new Set(data.map(d => d.plan_day_id).filter(Boolean) as string[]));
    }
  }, [user, weekStr]);

  useEffect(() => { fetchCompletions(); }, [fetchCompletions]);

  const handleSaveDay = async (dayOfWeek: number, title: string, exercises: PlanExercise[], notes: string | null) => {
    await upsertDay(dayOfWeek, { title, exercises, notes });
    setEditingDay(null);
  };

  const handleClearDay = async (dayOfWeek: number) => {
    await deleteDay(dayOfWeek);
    setEditingDay(null);
  };

  const handleDayClick = (dayIndex: number, day: PlanDay) => {
    const hasWorkout = day.exercises.length > 0 || (day.notes && day.title !== 'Rest Day');
    if (hasWorkout) {
      setExpandedDay(prev => prev === dayIndex ? null : dayIndex);
    }
  };

  return (
    <div className="space-y-4">
      {/* Week navigation */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon-sm" onClick={() => setWeekOffset(o => o - 1)}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div className="text-center">
          <p className="text-sm font-semibold">Week {weekNum}</p>
          <button
            onClick={() => setWeekOffset(0)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {weekLabel}
          </button>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={() => setWeekOffset(o => o + 1)}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Day cards */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <Card key={i} className="p-3 animate-pulse">
              <div className="h-4 bg-muted rounded w-1/3 mb-2" />
              <div className="h-3 bg-muted rounded w-2/3" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {DAY_LABELS.map((label, i) => {
            const day = getDayData(i);
            const date = addDays(currentWeekStart, i);
            const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
            const hasWorkout = day.exercises.length > 0 || (day.notes && day.title !== 'Rest Day');
            const isRest = !hasWorkout && (day.title === 'Rest Day' || !day.id);
            const isCompleted = day.id ? completedDayIds.has(day.id) : false;

            return (
              <Card
                key={i}
                className={`overflow-hidden transition-colors ${
                  isToday ? 'border-primary/50 bg-primary/5' : ''
                } ${isCompleted ? 'border-success/40 bg-success/5' : ''} ${
                  hasWorkout ? 'cursor-pointer hover:bg-secondary/50' : ''
                }`}
                onClick={() => handleDayClick(i, day)}
              >
                {/* Day header */}
                <div className="flex items-center justify-between px-3 py-2 border-b border-border/50">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold uppercase ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>
                      {label}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(date, 'MMM d')}
                    </span>
                    {isToday && (
                      <Badge variant="default" className="text-[10px] px-1.5 py-0">Today</Badge>
                    )}
                    {isCompleted && (
                      <Badge className="bg-success/20 text-success text-[10px] px-1.5 py-0 gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Logged
                      </Badge>
                    )}
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setEditingDay(i)}
                        className="text-muted-foreground hover:text-foreground p-1 transition-colors"
                      >
                        {hasWorkout ? <Pencil className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                      </button>
                      {hasWorkout && (
                        <button
                          onClick={() => handleClearDay(i)}
                          className="text-muted-foreground hover:text-destructive p-1 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Day content */}
                <div className="px-3 py-2">
                  {hasWorkout ? (
                    <div>
                      <p className="text-sm font-semibold mb-1.5 flex items-center gap-1.5">
                        <Dumbbell className="w-3.5 h-3.5 text-primary" />
                        {day.title}
                      </p>
                      <div className="space-y-1">
                        {day.exercises.map((ex, j) => (
                          <div key={j} className="flex gap-2 text-xs">
                            <span className="text-primary font-semibold shrink-0 w-7">{ex.label}</span>
                            <div className="min-w-0">
                              <span className="font-medium">{ex.name}</span>
                              {ex.details && (
                                <span className="text-muted-foreground ml-1 block sm:inline truncate">
                                  {ex.details}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      {day.notes && (
                        <p className="text-xs text-muted-foreground mt-2 italic">{day.notes}</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground py-1">
                      {isRest ? '🌙 Rest Day' : day.title}
                    </p>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit Day Dialog */}
      {editingDay !== null && (
        <EditDayDialog
          open={true}
          onOpenChange={(open) => !open && setEditingDay(null)}
          dayLabel={DAY_LABELS[editingDay]}
          dayDate={format(addDays(currentWeekStart, editingDay), 'MMM d')}
          dayData={getDayData(editingDay)}
          onSave={(title, exercises, notes) => handleSaveDay(editingDay, title, exercises, notes)}
          onClear={() => handleClearDay(editingDay)}
        />
      )}

      {/* Workout Log Dialog */}
      {loggingDay && (
        <WeeklyWorkoutLogDialog
          open={true}
          onOpenChange={(open) => !open && setLoggingDay(null)}
          day={loggingDay.day}
          dateLabel={`${DAY_LABELS[loggingDay.dayIndex]}, ${format(addDays(currentWeekStart, loggingDay.dayIndex), 'MMM d')}`}
          onLogged={() => {
            fetchCompletions();
            setLoggingDay(null);
          }}
        />
      )}
    </div>
  );
}