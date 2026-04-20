import { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  Pencil, 
  Bell, 
  BellOff, 
  List, 
  LayoutGrid,
  Calendar as CalendarIcon,
  Dumbbell,
  CheckCircle,
  Flame,
  Droplet,
  Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Event, EventType } from '@/types/database';
import { CalendarEvent } from '@/types/workoutPrograms';
import { CreateEventDialog } from '@/components/calendar/CreateEventDialog';
import { EditEventDialog } from '@/components/calendar/EditEventDialog';
import { CalendarEventDetailDialog } from '@/components/calendar/CalendarEventDetailDialog';
import { DayEventsDialog } from '@/components/calendar/DayEventsDialog';
import { LogWorkoutDialog, WorkoutLog } from '@/components/calendar/LogWorkoutDialog';
import { DayActionDialog } from '@/components/calendar/DayActionDialog';

import { FastSessionEntry } from '@/components/calendar/FastSessionEntry';
import { LogPeriodDialog } from '@/components/calendar/LogPeriodDialog';
import { CycleSettingsDialog } from '@/components/calendar/CycleSettingsDialog';
import { CycleAnalytics } from '@/components/calendar/CycleAnalytics';
import { ConsistencyRing } from '@/components/nutrition/ConsistencyRing';
import { CyclePhaseGuidance } from '@/components/nutrition/CyclePhaseGuidance';
import { DailyHabits } from '@/components/nutrition/DailyHabits';
import { useEventReminders, requestNotificationPermission } from '@/hooks/useEventReminders';
import { useCalendarEvents } from '@/hooks/useWorkoutPrograms';
import { useFastingSessions } from '@/hooks/useFastingSessions';
import { useCycleTracker } from '@/hooks/useCycleTracker';
import { useNutrition } from '@/hooks/useNutrition';
import { useUserSettings } from '@/hooks/useUserSettings';
import { DEFAULT_RING_HABITS } from '@/types/workoutPrograms';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, addDays, addWeeks, getDay, isAfter, isBefore, startOfDay, endOfDay, parseISO, isToday, isPast, isFuture } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { useEffect, useCallback } from 'react';
import { useNutritionDisclaimer } from '@/hooks/useNutritionDisclaimer';
import { NutritionDisclaimerDialog } from '@/components/nutrition/NutritionDisclaimerDialog';

export interface ExpandedEvent extends Event {
  occurrenceDate: Date;
}

// Generate all occurrences of a recurring event within a date range
const expandRecurringEvent = (event: Event, rangeStart: Date, rangeEnd: Date): ExpandedEvent[] => {
  const occurrences: ExpandedEvent[] = [];
  const eventStart = startOfDay(new Date(event.start_datetime));
  
  if (!event.recurrence_rule) {
    if (!isBefore(eventStart, rangeStart) && !isAfter(eventStart, rangeEnd)) {
      occurrences.push({ ...event, occurrenceDate: eventStart });
    }
    return occurrences;
  }

  let currentDate = eventStart;
  const maxIterations = 366;
  let iterations = 0;

  while (!isAfter(currentDate, rangeEnd) && iterations < maxIterations) {
    iterations++;
    
    if (!isBefore(currentDate, rangeStart) && !isAfter(currentDate, rangeEnd)) {
      if (event.recurrence_rule === 'weekdays') {
        const dayOfWeek = getDay(currentDate);
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          occurrences.push({ ...event, occurrenceDate: new Date(currentDate) });
        }
      } else {
        occurrences.push({ ...event, occurrenceDate: new Date(currentDate) });
      }
    }

    switch (event.recurrence_rule) {
      case 'daily':
        currentDate = addDays(currentDate, 1);
        break;
      case 'weekly':
        currentDate = addWeeks(currentDate, 1);
        break;
      case 'weekdays':
        currentDate = addDays(currentDate, 1);
        break;
      case 'monthly':
        currentDate = addMonths(currentDate, 1);
        break;
      default:
        return occurrences;
    }
  }

  return occurrences;
};

export default function Calendar() {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [viewMode, setViewMode] = useState<'month' | 'agenda'>('month');
  const [selectedCalendarEvent, setSelectedCalendarEvent] = useState<CalendarEvent | null>(null);
  const [calendarFilter, setCalendarFilter] = useState<'all' | 'workouts' | 'cycle'>('all');
  const [showPeriodLog, setShowPeriodLog] = useState(false);
  const [showDayEvents, setShowDayEvents] = useState(false);
  const [showWorkoutLog, setShowWorkoutLog] = useState(false);
  const [showDayAction, setShowDayAction] = useState(false);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission === 'granted';
    }
    return false;
  });

  // Track click timing for double-click detection
  const lastClickRef = useRef<{ date: string; time: number } | null>(null);

  // Workout program calendar events
  const { events: calendarEvents, loading: calendarLoading, toggleComplete, rescheduleEvent, refetch: refetchCalendarEvents } = useCalendarEvents();

  // Fasting sessions
  const { getSessionsForDate, deleteFastSession, completedSessions, refetch: refetchFastingSessions } = useFastingSessions();

  // Cycle tracker
  const {
    entries: cycleEntries,
    settings: cycleSettings,
    getEntriesForDate,
    isPredictedPeriodDay,
    isFertileDay,
    isOvulationDay,
    togglePeriodDay,
    updateEntry: updateCycleEntry,
    updateSettings: updateCycleSettings,
    analytics: cycleAnalytics,
    periodClusters,
    prediction: cyclePrediction,
  } = useCycleTracker();

  const hideCycleMarkers = cycleSettings?.hide_cycle_markers ?? false;
  const showCycleLegend = !hideCycleMarkers && (calendarFilter === 'all' || calendarFilter === 'cycle');

  // Nutrition + ring data for selected date
  const nutrition = useNutrition(selectedDate);
  const { settings: userSettings } = useUserSettings();
  const ringHabits = userSettings?.ring_habits || DEFAULT_RING_HABITS;
  const { needsDisclaimer } = useNutritionDisclaimer();
  const [disclaimerDismissed, setDisclaimerDismissed] = useState(false);

  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const fastCompletedForRing = getSessionsForDate(selectedDate).length > 0;
  const cycleLoggedForRing = cycleEntries.some(e => e.date === dateStr);
  const proteinMet = (nutrition.entry?.protein_logged || 0) >= (nutrition.entry?.protein_goal || 120);
  const hydrationMet = (nutrition.entry?.hydration_logged || 0) >= (nutrition.entry?.hydration_goal || 64);

  // Check if user has logged a workout for the selected date
  const [workoutCompletedForRing, setWorkoutCompletedForRing] = useState(false);

  const checkWorkoutCompletion = useCallback(async () => {
    if (!user) return;
    // Check weekly plan logs
    const { data: planLogs } = await supabase
      .from('weekly_plan_logs')
      .select('id')
      .eq('user_id', user.id)
      .gte('completed_at', format(selectedDate, 'yyyy-MM-dd') + 'T00:00:00')
      .lt('completed_at', format(selectedDate, 'yyyy-MM-dd') + 'T23:59:59.999')
      .limit(1);

    // Also check calendar event completions
    const calEventsForDay = calendarEvents.filter(e => e.event_date === dateStr && e.completed);

    // Also check workout_completions table
    const { data: workoutLogs } = await supabase
      .from('workout_completions')
      .select('id')
      .eq('user_id', user.id)
      .gte('completed_at', format(selectedDate, 'yyyy-MM-dd') + 'T00:00:00')
      .lt('completed_at', format(selectedDate, 'yyyy-MM-dd') + 'T23:59:59.999')
      .limit(1);

    setWorkoutCompletedForRing(
      (planLogs && planLogs.length > 0) ||
      calEventsForDay.length > 0 ||
      (workoutLogs && workoutLogs.length > 0)
    );
  }, [user, selectedDate, dateStr, calendarEvents]);

  useEffect(() => {
    checkWorkoutCompletion();
  }, [checkWorkoutCompletion]);

  const habitStatus = {
    workout: workoutCompletedForRing,
    protein: proteinMet,
    hydration: hydrationMet,
    fasting: fastCompletedForRing,
    cycle_logging: cycleLoggedForRing,
    whole_foods: nutrition.entry?.whole_foods_focus || false,
  };

  const fetchEvents = useCallback(async () => {
    const start = startOfMonth(subMonths(currentDate, 1));
    const end = endOfMonth(addMonths(currentDate, 2));

    const { data } = await supabase
      .from('events')
      .select('*')
      .gte('start_datetime', start.toISOString())
      .lte('start_datetime', end.toISOString())
      .order('start_datetime');

    if (data) {
      setEvents(data as Event[]);
    }
    setLoading(false);
  }, [currentDate]);

  // event_completions table removed - completion tracking handled via calendar_events
  const completions: { id: string; event_id: string; user_id: string; completed_at: string }[] = [];

  const fetchWorkoutLogs = useCallback(async () => {
    if (!user) return;
    const start = format(startOfMonth(subMonths(currentDate, 1)), 'yyyy-MM-dd');
    const end = format(endOfMonth(addMonths(currentDate, 2)), 'yyyy-MM-dd');
    const { data } = await supabase
      .from('calendar_events')
      .select('id, title, description, event_date')
      .eq('user_id', user.id)
      .eq('event_type', 'workout_log')
      .gte('event_date', start)
      .lte('event_date', end);
    if (data) setWorkoutLogs(data as WorkoutLog[]);
  }, [user, currentDate]);

  useEffect(() => {
    fetchEvents();
    if (user) {
      fetchWorkoutLogs();
    }
  }, [user, fetchEvents, fetchWorkoutLogs]);

  // Completion toggling for global events removed (event_completions table dropped)
  const handleComplete = async (_eventId: string) => {
    // no-op
  };

  const days = eachDayOfInterval({
    start: startOfMonth(currentDate),
    end: endOfMonth(currentDate),
  });

  // Expand all recurring events for the current month
  const expandedEvents = useMemo(() => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    return events.flatMap(event => expandRecurringEvent(event, start, end));
  }, [events, currentDate]);

  // Get today's events for reminders
  const todayEvents = useMemo(() => {
    const today = new Date();
    const todayStart = startOfDay(today);
    const todayEnd = endOfDay(today);
    return events.flatMap(event => expandRecurringEvent(event, todayStart, todayEnd));
  }, [events]);

  useEventReminders(todayEvents);

  const getEventsForDay = (day: Date) => {
    return expandedEvents.filter(event => isSameDay(event.occurrenceDate, day));
  };

  const getCalendarEventsForDay = (day: Date) => {
    return calendarEvents.filter(event => {
      const eventDate = parseISO(event.event_date);
      return isSameDay(eventDate, day);
    });
  };

  const getFastSessionsForDay = (day: Date) => {
    return getSessionsForDate(day);
  };

  const getWorkoutLogForDay = (day: Date) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    return workoutLogs.find(l => l.event_date === dayStr) || null;
  };

  const selectedDayWorkoutLog = getWorkoutLogForDay(selectedDate);

  // Data for the day events dialog
  const selectedDayEvents = getEventsForDay(selectedDate);
  const selectedDayCalendarEvents = getCalendarEventsForDay(selectedDate);
  const selectedDayFastSessions = getFastSessionsForDay(selectedDate);

  // Agenda view: upcoming events
  const upcomingCalendarEvents = useMemo(() => {
    const today = startOfDay(new Date());
    return calendarEvents
      .filter(e => {
        const eventDate = parseISO(e.event_date);
        return !isBefore(eventDate, today);
      })
      .sort((a, b) => parseISO(a.event_date).getTime() - parseISO(b.event_date).getTime())
      .slice(0, 20);
  }, [calendarEvents]);

  const handleToggleNotifications = async () => {
    if (notificationsEnabled) {
      toast({
        title: 'Notifications disabled',
        description: 'You will no longer receive event reminders.',
      });
      setNotificationsEnabled(false);
    } else {
      const granted = await requestNotificationPermission();
      if (granted) {
        setNotificationsEnabled(true);
        toast({
          title: 'Notifications enabled',
          description: 'You will receive reminders 15 minutes before events.',
        });
      } else {
        toast({
          title: 'Permission denied',
          description: 'Please enable notifications in your browser settings.',
          variant: 'destructive',
        });
      }
    }
  };

  const handleCalendarEventComplete = async (eventId: string) => {
    await toggleComplete(eventId);
  };

  const handleDayClick = (day: Date) => {
    const now = Date.now();
    const dayKey = format(day, 'yyyy-MM-dd');
    
    if (lastClickRef.current && lastClickRef.current.date === dayKey && now - lastClickRef.current.time < 400) {
      // Double click detected
      setSelectedDate(day);
      setShowDayEvents(true);
      lastClickRef.current = null;
    } else {
      lastClickRef.current = { date: dayKey, time: now };
      setSelectedDate(day);
      // Single click opens action chooser after a brief delay
      setTimeout(() => {
        if (lastClickRef.current && lastClickRef.current.date === dayKey) {
          setShowDayAction(true);
        }
      }, 420);
    }
  };

  const handleSaveWorkoutLog = async (title: string, details: string) => {
    if (!user) return;
    const dayStr = format(selectedDate, 'yyyy-MM-dd');
    const existing = getWorkoutLogForDay(selectedDate);

    if (existing) {
      await supabase
        .from('calendar_events')
        .update({ title, description: details || null })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('calendar_events')
        .insert({
          user_id: user.id,
          event_date: dayStr,
          event_type: 'workout_log',
          title,
          description: details || null,
        });
    }
    fetchWorkoutLogs();
    checkWorkoutCompletion();
    toast({ title: existing ? 'Workout updated' : 'Workout logged' });
  };

  const handleDeleteWorkoutLog = async (id: string) => {
    await supabase.from('calendar_events').delete().eq('id', id);
    fetchWorkoutLogs();
    checkWorkoutCompletion();
    toast({ title: 'Workout deleted' });
  };

  return (
    <AppLayout title="Calendar">
      <NutritionDisclaimerDialog
        open={needsDisclaimer && !disclaimerDismissed}
        onAccepted={() => setDisclaimerDismissed(true)}
      />
      <div className="max-w-lg mx-auto p-4">
        {/* Cycle Phase Guidance + Log Period below */}
        <div className="mb-6 space-y-3">
          <CyclePhaseGuidance
            cycleEntries={cycleEntries}
            cycleSettings={cycleSettings}
            selectedDate={selectedDate}
            settingsSlot={<CycleSettingsDialog settings={cycleSettings} onUpdateSettings={updateCycleSettings} />}
          />
          <Button
            variant={getEntriesForDate(selectedDate) ? 'default' : 'outline'}
            className="w-full gap-2"
            onClick={() => setShowPeriodLog(true)}
          >
            <Droplet className="w-4 h-4" />
            {getEntriesForDate(selectedDate) ? 'Edit Period Log' : 'Log Period'}
          </Button>
        </div>

        {/* View Toggle & Month navigation */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" size="icon" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h2 className="text-lg font-semibold">
            {format(currentDate, 'MMMM yyyy')}
          </h2>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleToggleNotifications}
              title={notificationsEnabled ? 'Disable reminders' : 'Enable reminders'}
            >
              {notificationsEnabled ? (
                <Bell className="w-5 h-5 text-primary" />
              ) : (
                <BellOff className="w-5 h-5 text-muted-foreground" />
              )}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
              <ChevronRight className="w-5 h-5" />
            </Button>
            <Button size="icon" className="rounded-full" onClick={() => setShowDayAction(true)}>
              <Plus className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* View Mode Tabs */}
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'month' | 'agenda')} className="mb-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="month" className="flex items-center gap-2">
              <LayoutGrid className="w-4 h-4" />
              Month
            </TabsTrigger>
            <TabsTrigger value="agenda" className="flex items-center gap-2">
              <List className="w-4 h-4" />
              Agenda
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {viewMode === 'month' ? (
          <>
            {/* Filter Chips */}
            <div className="flex gap-2 mb-4">
              {(['all', 'workouts', 'cycle'] as const).map(filter => (
                <Badge
                  key={filter}
                  variant={calendarFilter === filter ? 'default' : 'outline'}
                  className="cursor-pointer capitalize"
                  onClick={() => setCalendarFilter(filter)}
                >
                  {filter === 'all' ? 'All' : filter === 'workouts' ? 'Workouts' : 'Cycle'}
                </Badge>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="mb-6">
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                  <div key={i} className="text-center text-xs text-muted-foreground font-medium py-2">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: days[0].getDay() }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}
                
                {days.map((day, index) => {
                  const dayEvents = getEventsForDay(day);
                  const dayCalendarEvents = getCalendarEventsForDay(day);
                  const dayFastSessions = getFastSessionsForDay(day);
                  const hasWorkout = dayCalendarEvents.length > 0;
                  const hasFast = dayFastSessions.length > 0;
                  const completedWorkouts = dayCalendarEvents.filter(e => e.completed).length;
                  const isSelected = isSameDay(day, selectedDate);
                  const isTodayDate = isSameDay(day, new Date());
                  const cycleEntry = getEntriesForDate(day);
                  const hasPeriod = !!cycleEntry;
                  const isPredicted = isPredictedPeriodDay(day);
                  const isFertile = isFertileDay(day);
                  const isOvulation = isOvulationDay(day);
                  const showCycle = !hideCycleMarkers && (calendarFilter === 'all' || calendarFilter === 'cycle');
                  const dayWorkoutLog = getWorkoutLogForDay(day);
                  const hasWorkoutLog = !!dayWorkoutLog;

                  return (
                    <motion.button
                      key={day.toISOString()}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.01 }}
                      onClick={() => handleDayClick(day)}
                      className={`
                        aspect-square rounded-lg flex flex-col items-center justify-center relative transition-colors overflow-hidden
                        ${isSelected ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'}
                        ${isTodayDate && !isSelected ? 'ring-2 ring-primary bg-primary/10' : ''}
                        ${!isSameMonth(day, currentDate) ? 'opacity-30' : ''}
                        ${hasWorkoutLog && !isSelected && !isTodayDate ? 'bg-accent/60' : ''}
                        ${showCycle && hasPeriod && !isSelected ? 'bg-rose-100 dark:bg-rose-900/30' : ''}
                        ${showCycle && isPredicted && !hasPeriod && !isSelected ? 'bg-rose-50 dark:bg-rose-900/15 ring-1 ring-rose-300/50 ring-inset' : ''}
                        ${showCycle && isOvulation && !hasPeriod && !isPredicted && !isSelected ? 'bg-violet-100 dark:bg-violet-900/30' : ''}
                        ${showCycle && isFertile && !isOvulation && !hasPeriod && !isPredicted && !isSelected ? 'bg-teal-50 dark:bg-teal-900/15' : ''}
                      `}
                    >
                      <span className="text-sm font-medium">{format(day, 'd')}</span>
                      {hasWorkoutLog && (
                        <span className={`text-[7px] leading-tight truncate max-w-full px-0.5 ${
                          isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'
                        }`}>
                          {dayWorkoutLog.title}
                        </span>
                      )}
                      <div className="flex gap-0.5 mt-0.5">
                        {(calendarFilter === 'all' || calendarFilter === 'workouts') && (
                          <>
                            {dayEvents.slice(0, 2).map((event, i) => (
                              <div
                                key={`${event.id}-${i}`}
                                className={`w-1.5 h-1.5 rounded-full ${
                                  event.event_type === 'fast' ? 'bg-success' :
                                  event.event_type === 'workout' ? 'bg-primary' :
                                  'bg-muted-foreground'
                                }`}
                              />
                            ))}
                            {hasWorkout && (
                              <div className={`w-1.5 h-1.5 rounded-full ${
                                completedWorkouts === dayCalendarEvents.length ? 'bg-success' : 'bg-warning'
                              }`} />
                            )}
                            {hasFast && (
                              <div className="w-1.5 h-1.5 rounded-full bg-success" />
                            )}
                          </>
                        )}
                        {showCycle && hasPeriod && (
                          <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                        )}
                        {showCycle && isPredicted && !hasPeriod && (
                          <div className="w-1.5 h-1.5 rounded-full bg-rose-300 border border-rose-400" />
                        )}
                        {showCycle && isOvulation && !hasPeriod && !isPredicted && (
                          <div className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                        )}
                        {showCycle && isFertile && !isOvulation && !hasPeriod && !isPredicted && (
                          <div className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                        )}
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Calendar Legend */}
            {showCycleLegend && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-4 px-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  Period
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-300 border border-rose-400" />
                  Predicted
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-400" />
                  Fertile
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-violet-500" />
                  Ovulation
                </span>
              </div>
            )}

            {/* Consistency Ring - below calendar */}
            <div className="mb-6">
              <ConsistencyRing
                habitStatus={habitStatus}
                ringHabits={ringHabits}
                streak={nutrition.streak}
              />
            </div>

            {/* Cycle Analytics - shown when cycle filter active */}
            {calendarFilter === 'cycle' && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-muted-foreground mb-3">Cycle Insights</h3>
                <CycleAnalytics
                  analytics={cycleAnalytics}
                  periodClusters={periodClusters}
                  prediction={cyclePrediction}
                />
              </div>
            )}

            {/* Hint for double-click */}
            <p className="text-xs text-muted-foreground mb-4">Tap a day to log a workout · Double-tap to view all events</p>

            {/* Today's Habits */}
            <div className="mb-6">
              <DailyHabits
                entry={nutrition.entry}
                toggleHabit={nutrition.toggleHabit}
                fastCompleted={fastCompletedForRing}
                cycleLogged={cycleLoggedForRing}
                cycleEnabled={!!cycleSettings && !cycleSettings.hide_cycle_markers}
                proteinMet={proteinMet}
                hydrationMet={hydrationMet}
                workoutCompleted={workoutCompletedForRing}
                ringHabits={ringHabits}
              />
            </div>
          </>
        ) : (
          /* Agenda View */
          <div className="space-y-3">
            <h3 className="font-semibold">Upcoming Workouts</h3>
            {upcomingCalendarEvents.length === 0 ? (
              <Card className="p-6 text-center text-muted-foreground">
                <CalendarIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No upcoming workouts</p>
                <p className="text-sm mt-1">Add a program to get started!</p>
              </Card>
            ) : (
              <div className="space-y-2">
                {upcomingCalendarEvents.map((event, index) => {
                  const eventDate = parseISO(event.event_date);
                  const isTodayEvent = isToday(eventDate);
                  
                  return (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                    >
                      <Card 
                        className={`p-4 border cursor-pointer hover:bg-card/70 transition-colors ${
                          event.completed ? 'bg-success/10 border-success/30' : 
                          isTodayEvent ? 'bg-primary/10 border-primary/30' : 
                          'bg-card/50 border-border/50'
                        }`}
                        onClick={() => setSelectedCalendarEvent(event)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="text-center min-w-[50px]">
                            <div className="text-xs text-muted-foreground uppercase">
                              {format(eventDate, 'MMM')}
                            </div>
                            <div className={`text-xl font-bold ${isTodayEvent ? 'text-primary' : ''}`}>
                              {format(eventDate, 'd')}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {format(eventDate, 'EEE')}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              {isTodayEvent && (
                                <Badge className="bg-primary/20 text-primary text-xs">Today</Badge>
                              )}
                              {event.completed && (
                                <Badge className="bg-success/20 text-success text-xs">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Done
                                </Badge>
                              )}
                            </div>
                            <h4 className="font-medium text-sm truncate">{event.title}</h4>
                            {event.description && (
                              <p className="text-xs text-muted-foreground truncate">{event.description}</p>
                            )}
                          </div>
                          <Button
                            variant={event.completed ? 'success' : 'outline'}
                            size="icon"
                            className="shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCalendarEventComplete(event.id);
                            }}
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                        </div>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {editingEvent && (
        <EditEventDialog
          event={editingEvent}
          open={!!editingEvent}
          onOpenChange={(open) => !open && setEditingEvent(null)}
          onEventUpdated={fetchEvents}
        />
      )}

      {selectedCalendarEvent && (
        <CalendarEventDetailDialog
          event={selectedCalendarEvent}
          open={!!selectedCalendarEvent}
          onOpenChange={(open) => !open && setSelectedCalendarEvent(null)}
          onComplete={() => {
            handleCalendarEventComplete(selectedCalendarEvent.id);
            refetchCalendarEvents();
          }}
          onReschedule={async (eventId, newDate) => {
            await rescheduleEvent(eventId, newDate);
            refetchCalendarEvents();
            setSelectedCalendarEvent(null);
          }}
        />
      )}

      {/* Day Events Dialog (double-click) */}
      <DayEventsDialog
        open={showDayEvents}
        onOpenChange={setShowDayEvents}
        date={selectedDate}
        events={selectedDayEvents}
        calendarEvents={selectedDayCalendarEvents}
        fastSessions={selectedDayFastSessions}
        completions={completions}
        onComplete={handleComplete}
        onCalendarEventComplete={handleCalendarEventComplete}
        onEditEvent={setEditingEvent}
        onViewCalendarEvent={setSelectedCalendarEvent}
        onDeleteFastSession={deleteFastSession}
        isAdmin={isAdmin}
        userId={user?.id}
        cycleEntry={getEntriesForDate(selectedDate)}
        hideCycleMarkers={hideCycleMarkers}
      />

      <LogPeriodDialog
        open={showPeriodLog}
        onOpenChange={setShowPeriodLog}
        date={selectedDate}
        existingEntry={getEntriesForDate(selectedDate)}
        onTogglePeriod={togglePeriodDay}
        onUpdateEntry={updateCycleEntry}
      />

      <LogWorkoutDialog
        open={showWorkoutLog}
        onOpenChange={setShowWorkoutLog}
        date={selectedDate}
        existingLog={selectedDayWorkoutLog}
        onSave={handleSaveWorkoutLog}
        onDelete={handleDeleteWorkoutLog}
      />

      <DayActionDialog
        open={showDayAction}
        onOpenChange={setShowDayAction}
        date={selectedDate}
        onAddEvent={() => setShowCreateEvent(true)}
        onLogWorkout={() => setShowWorkoutLog(true)}
      />

      <CreateEventDialog
        onEventCreated={fetchEvents}
        selectedDate={selectedDate}
        externalOpen={showCreateEvent}
        onExternalOpenChange={setShowCreateEvent}
      />
    </AppLayout>
  );
}