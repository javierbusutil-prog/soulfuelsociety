import { useState, useMemo } from 'react';
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
  Droplet
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Event, EventCompletion, EventType } from '@/types/database';
import { CalendarEvent } from '@/types/workoutPrograms';
import { CreateEventDialog } from '@/components/calendar/CreateEventDialog';
import { EditEventDialog } from '@/components/calendar/EditEventDialog';
import { CalendarEventDetailDialog } from '@/components/calendar/CalendarEventDetailDialog';
import { FastingTimer } from '@/components/calendar/FastingTimer';
import { FastSessionEntry } from '@/components/calendar/FastSessionEntry';
import { LogPeriodDialog } from '@/components/calendar/LogPeriodDialog';
import { CycleSettingsDialog } from '@/components/calendar/CycleSettingsDialog';
import { CycleAnalytics } from '@/components/calendar/CycleAnalytics';
import { useEventReminders, requestNotificationPermission } from '@/hooks/useEventReminders';
import { useCalendarEvents } from '@/hooks/useWorkoutPrograms';
import { useFastingSessions } from '@/hooks/useFastingSessions';
import { useCycleTracker } from '@/hooks/useCycleTracker';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, addDays, addWeeks, getDay, isAfter, isBefore, startOfDay, endOfDay, parseISO, isToday, isPast, isFuture } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { useEffect, useCallback } from 'react';

export interface ExpandedEvent extends Event {
  occurrenceDate: Date;
}

// Generate all occurrences of a recurring event within a date range
const expandRecurringEvent = (event: Event, rangeStart: Date, rangeEnd: Date): ExpandedEvent[] => {
  const occurrences: ExpandedEvent[] = [];
  const eventStart = startOfDay(new Date(event.start_datetime));
  
  // If no recurrence, just return the single event if it's in range
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

const eventTypeColors: Record<EventType, string> = {
  fast: 'bg-success/20 text-success border-success/30',
  workout: 'bg-primary/20 text-primary border-primary/30',
  live_session: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  challenge: 'bg-warning/20 text-warning border-warning/30',
  other: 'bg-muted text-muted-foreground border-border',
};

export default function Calendar() {
  const { user, isAdmin } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [completions, setCompletions] = useState<EventCompletion[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [viewMode, setViewMode] = useState<'month' | 'agenda'>('month');
  const [selectedCalendarEvent, setSelectedCalendarEvent] = useState<CalendarEvent | null>(null);
  const [calendarFilter, setCalendarFilter] = useState<'all' | 'workouts' | 'cycle'>('all');
  const [showPeriodLog, setShowPeriodLog] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission === 'granted';
    }
    return false;
  });

  // Workout program calendar events
  const { events: calendarEvents, loading: calendarLoading, toggleComplete, refetch: refetchCalendarEvents } = useCalendarEvents();

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

  const fetchEvents = useCallback(async () => {
    // Fetch events for the entire year to support agenda view
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

  const fetchCompletions = useCallback(async () => {
    if (!user) return;

    const { data } = await supabase
      .from('event_completions')
      .select('*')
      .eq('user_id', user.id);

    if (data) {
      setCompletions(data as EventCompletion[]);
    }
  }, [user]);

  useEffect(() => {
    fetchEvents();
    if (user) {
      fetchCompletions();
    }
  }, [user, fetchEvents, fetchCompletions]);

  const handleComplete = async (eventId: string) => {
    if (!user) return;

    const existing = completions.find(c => c.event_id === eventId);

    if (existing) {
      await supabase.from('event_completions').delete().eq('id', existing.id);
    } else {
      await supabase.from('event_completions').insert({
        event_id: eventId,
        user_id: user.id,
      });
    }

    fetchCompletions();
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

  // Get fast sessions for a specific day
  const getFastSessionsForDay = (day: Date) => {
    return getSessionsForDate(day);
  };

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

  return (
    <AppLayout title="Calendar">
      <div className="max-w-lg mx-auto p-4">
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
            <CreateEventDialog onEventCreated={fetchEvents} selectedDate={selectedDate} />
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
              <div className="ml-auto">
                <CycleSettingsDialog settings={cycleSettings} onUpdateSettings={updateCycleSettings} />
              </div>
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

                  return (
                    <motion.button
                      key={day.toISOString()}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.01 }}
                      onClick={() => setSelectedDate(day)}
                      className={`
                        aspect-square rounded-lg flex flex-col items-center justify-center relative transition-colors
                        ${isSelected ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'}
                        ${isTodayDate && !isSelected ? 'ring-2 ring-primary' : ''}
                        ${!isSameMonth(day, currentDate) ? 'opacity-30' : ''}
                        ${showCycle && hasPeriod && !isSelected ? 'bg-rose-100 dark:bg-rose-900/30' : ''}
                        ${showCycle && isPredicted && !hasPeriod && !isSelected ? 'bg-rose-50 dark:bg-rose-900/15 ring-1 ring-rose-300/50 ring-inset' : ''}
                        ${showCycle && isOvulation && !hasPeriod && !isPredicted && !isSelected ? 'bg-violet-100 dark:bg-violet-900/30' : ''}
                        ${showCycle && isFertile && !isOvulation && !hasPeriod && !isPredicted && !isSelected ? 'bg-teal-50 dark:bg-teal-900/15' : ''}
                      `}
                    >
                      <span className="text-sm font-medium">{format(day, 'd')}</span>
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

            {/* Fasting Timer Module */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Fasting Timer</h3>
              <FastingTimer onFastEnded={refetchFastingSessions} />
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

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">
                  {format(selectedDate, 'EEEE, MMMM d')}
                </h3>
                <Button
                  variant={getEntriesForDate(selectedDate) ? 'default' : 'outline'}
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setShowPeriodLog(true)}
                >
                  <Droplet className="w-3.5 h-3.5" />
                  {getEntriesForDate(selectedDate) ? 'Edit Period' : 'Log Period'}
                </Button>
              </div>

              {/* Cycle entry for selected day */}
              {getEntriesForDate(selectedDate) && !hideCycleMarkers && (calendarFilter === 'all' || calendarFilter === 'cycle') && (
                <Card className="p-3 border bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800/30">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center">
                      <Droplet className="w-4 h-4 text-rose-500" fill="currentColor" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm">Period Day</h4>
                      <p className="text-xs text-muted-foreground capitalize">
                        {getEntriesForDate(selectedDate)?.flow_level || 'medium'} flow
                        {(getEntriesForDate(selectedDate)?.symptoms?.length ?? 0) > 0 && (
                          <> · {getEntriesForDate(selectedDate)!.symptoms.join(', ')}</>
                        )}
                      </p>
                    </div>
                  </div>
                </Card>
              )}

              {/* Fertile window / Ovulation indicator for selected day */}
              {!hideCycleMarkers && (calendarFilter === 'all' || calendarFilter === 'cycle') && (
                <>
                  {isOvulationDay(selectedDate) && (
                    <Card className="p-3 border bg-violet-50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-800/30">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center">
                          <span className="text-sm">🥚</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm">Estimated Ovulation Day</h4>
                          <p className="text-xs text-muted-foreground">Peak fertility — highest chance of conception</p>
                        </div>
                      </div>
                    </Card>
                  )}
                  {isFertileDay(selectedDate) && !isOvulationDay(selectedDate) && (
                    <Card className="p-3 border bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800/30">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center">
                          <span className="text-sm">🌱</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm">Fertile Window</h4>
                          <p className="text-xs text-muted-foreground">Higher chance of conception during this window</p>
                        </div>
                      </div>
                    </Card>
                  )}
                </>
              )}

              {/* Program workout events for selected day */}
              {selectedDayCalendarEvents.length > 0 && (
                <div className="space-y-2">
                  {selectedDayCalendarEvents.map((event, index) => (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card 
                        className={`p-4 border cursor-pointer hover:bg-card/70 transition-colors ${
                          event.completed ? 'bg-success/10 border-success/30' : 'bg-primary/10 border-primary/30'
                        }`}
                        onClick={() => setSelectedCalendarEvent(event)}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            event.completed ? 'bg-success/20' : 'bg-primary/20'
                          }`}>
                            {event.completed ? (
                              <CheckCircle className="w-5 h-5 text-success" />
                            ) : (
                              <Dumbbell className="w-5 h-5 text-primary" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm truncate">{event.title}</h4>
                            {event.description && (
                              <p className="text-xs text-muted-foreground truncate">{event.description}</p>
                            )}
                          </div>
                          <Button
                            variant={event.completed ? 'success' : 'outline'}
                            size="sm"
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
                  ))}
                </div>
              )}

              {/* Fast session entries for selected day */}
              {selectedDayFastSessions.length > 0 && (
                <div className="space-y-2">
                  {selectedDayFastSessions.map((session, index) => (
                    <FastSessionEntry
                      key={session.id}
                      session={session}
                      index={index}
                      onDelete={deleteFastSession}
                    />
                  ))}
                </div>
              )}

              {/* Regular events */}
              {selectedDayEvents.length === 0 && selectedDayCalendarEvents.length === 0 && selectedDayFastSessions.length === 0 ? (
                <Card className="p-6 text-center text-muted-foreground">
                  <p>No events scheduled for this day</p>
                </Card>
              ) : (
                selectedDayEvents.map((event, index) => {
                  const isCompleted = completions.some(c => c.event_id === event.id);
                  const canEdit = user && (event.user_id === user.id || isAdmin);

                  return (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: (index + selectedDayCalendarEvents.length) * 0.1 }}
                    >
                      <Card className={`p-4 border ${eventTypeColors[event.event_type]}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className={eventTypeColors[event.event_type]}>
                                {event.event_type.replace('_', ' ')}
                              </Badge>
                              {event.is_global && (
                                <Badge variant="secondary" className="text-xs">Global</Badge>
                              )}
                            </div>
                            <h4 className="font-semibold">{event.title}</h4>
                            {event.description && (
                              <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-2">
                              {format(new Date(event.start_datetime), 'h:mm a')}
                              {event.end_datetime && ` - ${format(new Date(event.end_datetime), 'h:mm a')}`}
                            </p>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {canEdit && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setEditingEvent(event)}
                                className="h-8 w-8"
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                            )}
                            {event.checkoff_enabled && (
                              <Button
                                variant={isCompleted ? 'success' : 'outline'}
                                size="icon"
                                onClick={() => handleComplete(event.id)}
                                className={isCompleted ? 'bg-success hover:bg-success/90' : ''}
                              >
                                <Check className={`w-5 h-5 ${isCompleted ? 'text-success-foreground' : ''}`} />
                              </Button>
                            )}
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  );
                })
              )}
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
        />
      )}

      <LogPeriodDialog
        open={showPeriodLog}
        onOpenChange={setShowPeriodLog}
        date={selectedDate}
        existingEntry={getEntriesForDate(selectedDate)}
        onTogglePeriod={togglePeriodDay}
        onUpdateEntry={updateCycleEntry}
      />
    </AppLayout>
  );
}
