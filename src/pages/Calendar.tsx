import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Check, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Event, EventCompletion, EventType } from '@/types/database';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';

const eventTypeColors: Record<EventType, string> = {
  fast: 'bg-success/20 text-success border-success/30',
  workout: 'bg-primary/20 text-primary border-primary/30',
  live_session: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  challenge: 'bg-warning/20 text-warning border-warning/30',
  other: 'bg-muted text-muted-foreground border-border',
};

export default function Calendar() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [completions, setCompletions] = useState<EventCompletion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, [currentDate]);

  useEffect(() => {
    if (user) {
      fetchCompletions();
    }
  }, [user, currentDate]);

  const fetchEvents = async () => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);

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
  };

  const fetchCompletions = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('event_completions')
      .select('*')
      .eq('user_id', user.id);

    if (data) {
      setCompletions(data as EventCompletion[]);
    }
  };

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

  const getEventsForDay = (day: Date) => {
    return events.filter(event => isSameDay(new Date(event.start_datetime), day));
  };

  const selectedDayEvents = getEventsForDay(selectedDate);

  return (
    <AppLayout title="Calendar">
      <div className="max-w-lg mx-auto p-4">
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" size="icon" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h2 className="text-lg font-semibold">
            {format(currentDate, 'MMMM yyyy')}
          </h2>
          <Button variant="ghost" size="icon" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
            <ChevronRight className="w-5 h-5" />
          </Button>
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
            {/* Empty cells for days before month starts */}
            {Array.from({ length: days[0].getDay() }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            
            {days.map((day, index) => {
              const dayEvents = getEventsForDay(day);
              const isSelected = isSameDay(day, selectedDate);
              const isToday = isSameDay(day, new Date());

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
                    ${isToday && !isSelected ? 'ring-2 ring-primary' : ''}
                    ${!isSameMonth(day, currentDate) ? 'opacity-30' : ''}
                  `}
                >
                  <span className="text-sm font-medium">{format(day, 'd')}</span>
                  {dayEvents.length > 0 && (
                    <div className="flex gap-0.5 mt-0.5">
                      {dayEvents.slice(0, 3).map((event) => (
                        <div
                          key={event.id}
                          className={`w-1.5 h-1.5 rounded-full ${
                            event.event_type === 'fast' ? 'bg-success' :
                            event.event_type === 'workout' ? 'bg-primary' :
                            'bg-muted-foreground'
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Selected day events */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">
              {format(selectedDate, 'EEEE, MMMM d')}
            </h3>
          </div>

          {selectedDayEvents.length === 0 ? (
            <Card className="p-6 text-center text-muted-foreground">
              <p>No events scheduled for this day</p>
            </Card>
          ) : (
            selectedDayEvents.map((event, index) => {
              const isCompleted = completions.some(c => c.event_id === event.id);

              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className={`p-4 border ${eventTypeColors[event.event_type]}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className={eventTypeColors[event.event_type]}>
                            {event.event_type.replace('_', ' ')}
                          </Badge>
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
                  </Card>
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </AppLayout>
  );
}
