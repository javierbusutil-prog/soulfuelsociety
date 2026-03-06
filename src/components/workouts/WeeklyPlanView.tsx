import { useState } from 'react';
import { format, startOfWeek, addWeeks, subWeeks, addDays, getISOWeek } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, Pencil, Trash2, Dumbbell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { useWeeklyPlan, PlanDay, PlanExercise } from '@/hooks/useWeeklyPlan';
import { EditDayDialog } from './EditDayDialog';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function WeeklyPlanView() {
  const { isAdmin } = useAuth();
  const [weekOffset, setWeekOffset] = useState(0);
  const baseWeek = startOfWeek(new Date(), { weekStartsOn: 1 });
  const currentWeekStart = weekOffset === 0 ? baseWeek : weekOffset > 0 ? addWeeks(baseWeek, weekOffset) : subWeeks(baseWeek, Math.abs(weekOffset));

  const { days, loading, upsertDay, deleteDay, getDayData } = useWeeklyPlan(currentWeekStart);

  const [editingDay, setEditingDay] = useState<number | null>(null);

  const weekNum = getISOWeek(currentWeekStart);
  const weekLabel = `${format(currentWeekStart, 'MMM d')} – ${format(addDays(currentWeekStart, 6), 'MMM d, yyyy')}`;

  const handleSaveDay = async (dayOfWeek: number, title: string, exercises: PlanExercise[], notes: string | null) => {
    await upsertDay(dayOfWeek, { title, exercises, notes });
    setEditingDay(null);
  };

  const handleClearDay = async (dayOfWeek: number) => {
    await deleteDay(dayOfWeek);
    setEditingDay(null);
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

      {/* Horizontal day columns */}
      <ScrollArea className="w-full">
        <div className="flex gap-2 pb-4" style={{ minWidth: 'max-content' }}>
          {loading
            ? Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="w-[160px] shrink-0 rounded-lg border border-border bg-card p-3 animate-pulse">
                  <div className="h-4 bg-muted rounded w-2/3 mb-2" />
                  <div className="h-3 bg-muted rounded w-full mb-1" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              ))
            : DAY_LABELS.map((label, i) => {
                const day = getDayData(i);
                const date = addDays(currentWeekStart, i);
                const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                const hasWorkout = day.exercises.length > 0 || (day.notes && day.title !== 'Rest Day');
                const isRest = !hasWorkout && (day.title === 'Rest Day' || !day.id);

                return (
                  <div
                    key={i}
                    className={`w-[160px] shrink-0 rounded-lg border bg-card flex flex-col overflow-hidden transition-colors ${
                      isToday ? 'border-primary/50 bg-primary/5' : 'border-border'
                    }`}
                  >
                    {/* Day header */}
                    <div className="flex items-center justify-between px-2.5 py-2 border-b border-border/50">
                      <div className="flex flex-col">
                        <span className={`text-xs font-bold uppercase ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>
                          {label}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {format(date, 'MMM d')}
                        </span>
                      </div>
                      <div className="flex items-center gap-0.5">
                        {isToday && (
                          <Badge variant="default" className="text-[9px] px-1 py-0 mr-1">Today</Badge>
                        )}
                        {isAdmin && (
                          <>
                            <button
                              onClick={() => setEditingDay(i)}
                              className="text-muted-foreground hover:text-foreground p-1 transition-colors"
                            >
                              {hasWorkout ? <Pencil className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                            </button>
                            {hasWorkout && (
                              <button
                                onClick={() => handleClearDay(i)}
                                className="text-muted-foreground hover:text-destructive p-1 transition-colors"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Day content */}
                    <div className="px-2.5 py-2 flex-1 min-h-[100px]">
                      {hasWorkout ? (
                        <div>
                          <p className="text-xs font-semibold mb-1.5 flex items-center gap-1">
                            <Dumbbell className="w-3 h-3 text-primary" />
                            <span className="truncate">{day.title}</span>
                          </p>
                          <div className="space-y-0.5">
                            {day.exercises.map((ex, j) => (
                              <div key={j} className="text-[10px] leading-tight">
                                <span className="text-primary font-semibold">{ex.label}</span>{' '}
                                <span className="font-medium">{ex.name}</span>
                                {ex.details && (
                                  <span className="text-muted-foreground block truncate">
                                    {ex.details}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                          {day.notes && (
                            <p className="text-[10px] text-muted-foreground mt-1.5 italic line-clamp-2">{day.notes}</p>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground py-1">
                          {isRest ? '🌙 Rest' : day.title}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

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
    </div>
  );
}