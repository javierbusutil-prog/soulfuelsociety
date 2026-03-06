import { format } from 'date-fns';
import { Check, CheckCircle, Dumbbell, Pencil, Flame, Droplet } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Event, EventCompletion, EventType } from '@/types/database';
import { CalendarEvent } from '@/types/workoutPrograms';
import { ExpandedEvent } from '@/pages/Calendar';
import { FastSessionEntry } from './FastSessionEntry';

const eventTypeColors: Record<EventType, string> = {
  fast: 'bg-success/20 text-success border-success/30',
  workout: 'bg-primary/20 text-primary border-primary/30',
  live_session: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  challenge: 'bg-warning/20 text-warning border-warning/30',
  other: 'bg-muted text-muted-foreground border-border',
};

interface DayEventsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date;
  events: ExpandedEvent[];
  calendarEvents: CalendarEvent[];
  fastSessions: any[];
  completions: EventCompletion[];
  onComplete: (eventId: string) => void;
  onCalendarEventComplete: (eventId: string) => void;
  onEditEvent: (event: Event) => void;
  onViewCalendarEvent: (event: CalendarEvent) => void;
  onDeleteFastSession: (id: string) => Promise<boolean>;
  isAdmin: boolean;
  userId?: string;
  cycleEntry?: any;
  hideCycleMarkers: boolean;
}

export function DayEventsDialog({
  open,
  onOpenChange,
  date,
  events,
  calendarEvents,
  fastSessions,
  completions,
  onComplete,
  onCalendarEventComplete,
  onEditEvent,
  onViewCalendarEvent,
  onDeleteFastSession,
  isAdmin,
  userId,
  cycleEntry,
  hideCycleMarkers,
}: DayEventsDialogProps) {
  const hasAny = events.length > 0 || calendarEvents.length > 0 || fastSessions.length > 0 || (cycleEntry && !hideCycleMarkers);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{format(date, 'EEEE, MMMM d')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* Cycle entry */}
          {cycleEntry && !hideCycleMarkers && (
            <Card className="p-3 border bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800/30">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center">
                  <Droplet className="w-4 h-4 text-rose-500" fill="currentColor" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm">Period Day</h4>
                  <p className="text-xs text-muted-foreground capitalize">
                    {cycleEntry.flow_level || 'medium'} flow
                    {(cycleEntry.symptoms?.length ?? 0) > 0 && (
                      <> · {cycleEntry.symptoms.join(', ')}</>
                    )}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Program workout events */}
          {calendarEvents.map((event, index) => (
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
                onClick={() => onViewCalendarEvent(event)}
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
                      onCalendarEventComplete(event.id);
                    }}
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            </motion.div>
          ))}

          {/* Fast sessions */}
          {fastSessions.map((session, index) => (
            <FastSessionEntry
              key={session.id}
              session={session}
              index={index}
              onDelete={onDeleteFastSession}
            />
          ))}

          {/* Regular events */}
          {events.map((event, index) => {
            const isCompleted = completions.some(c => c.event_id === event.id);
            const canEdit = userId && (event.user_id === userId || isAdmin);

            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
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
                          onClick={() => onEditEvent(event)}
                          className="h-8 w-8"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                      )}
                      {event.checkoff_enabled && (
                        <Button
                          variant={isCompleted ? 'success' : 'outline'}
                          size="icon"
                          onClick={() => onComplete(event.id)}
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
          })}

          {!hasAny && (
            <p className="text-center text-muted-foreground py-4">No events for this day</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}