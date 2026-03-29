import { useState, useEffect } from 'react';
import { 
  Dumbbell, 
  Calendar as CalendarIcon, 
  CheckCircle, 
  X,
  Save,
  ArrowRightLeft,
  XCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { CalendarEvent, WorkoutSessionTemplate, WorkoutProgram, SessionContent } from '@/types/workoutPrograms';
import { format, parseISO, differenceInHours } from 'date-fns';
import { toast } from '@/hooks/use-toast';

interface CalendarEventDetailDialogProps {
  event: CalendarEvent;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
  onReschedule?: (eventId: string, newDate: string) => Promise<void>;
}

export function CalendarEventDetailDialog({ 
  event, 
  open, 
  onOpenChange, 
  onComplete,
  onReschedule,
}: CalendarEventDetailDialogProps) {
  const { user } = useAuth();
  const [session, setSession] = useState<WorkoutSessionTemplate | null>(null);
  const [program, setProgram] = useState<WorkoutProgram | null>(null);
  const [loading, setLoading] = useState(true);
  const [userNotes, setUserNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const isSessionEvent = event.event_type === 'session';
  const bookingId = (event as any).booking_id as string | null;

  useEffect(() => {
    if (open && event) {
      fetchDetails();
      setUserNotes((event as any).user_notes || '');
      setRescheduleOpen(false);
    }
  }, [open, event]);

  const fetchDetails = async () => {
    setLoading(true);
    
    if (event.linked_session_id) {
      const { data: sessionData } = await supabase
        .from('workout_session_templates')
        .select('*')
        .eq('id', event.linked_session_id)
        .single();
      
      if (sessionData) {
        setSession({
          ...sessionData,
          content_json: sessionData.content_json as SessionContent || {}
        } as WorkoutSessionTemplate);
      }
    }

    if (event.linked_program_id) {
      const { data: programData } = await supabase
        .from('workout_programs')
        .select('*')
        .eq('id', event.linked_program_id)
        .single();
      
      if (programData) {
        setProgram(programData as unknown as WorkoutProgram);
      }
    }

    setLoading(false);
  };

  const handleSaveNotes = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('calendar_events')
        .update({ user_notes: userNotes.trim() || null } as any)
        .eq('id', event.id);
      
      if (error) throw error;
      toast({ title: 'Results saved! ✅' });
    } catch {
      toast({ title: 'Failed to save', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleReschedule = async (newDate: Date | undefined) => {
    if (!newDate || !onReschedule) return;
    const newDateStr = format(newDate, 'yyyy-MM-dd');
    if (newDateStr === event.event_date) return;

    setRescheduling(true);
    try {
      await onReschedule(event.id, newDateStr);
      toast({ title: `Moved to ${format(newDate, 'EEEE, MMM d')} ✅` });
      setRescheduleOpen(false);
      onOpenChange(false);
    } catch {
      toast({ title: 'Failed to reschedule', variant: 'destructive' });
    } finally {
      setRescheduling(false);
    }
  };

  const handleCancelSession = async () => {
    if (!bookingId || !user) return;
    setCancelling(true);
    try {
      // Check 24-hour policy
      const eventDateObj = parseISO(event.event_date);
      const hoursUntil = differenceInHours(eventDateObj, new Date());
      const isLate = hoursUntil < 24;
      const newStatus = isLate ? 'cancelled_late' : 'cancelled';

      await supabase
        .from('session_bookings')
        .update({ status: newStatus, updated_at: new Date().toISOString() } as any)
        .eq('id', bookingId);

      // Remove all calendar events for this booking
      await supabase
        .from('calendar_events')
        .delete()
        .eq('booking_id', bookingId);

      // Notify coach
      const { data: booking } = await supabase
        .from('session_bookings')
        .select('coach_id')
        .eq('id', bookingId)
        .single();

      if (booking?.coach_id) {
        const { data: memberProf } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();
        await supabase.from('notifications').insert({
          user_id: booking.coach_id,
          type: 'session_cancelled',
          title: `${memberProf?.full_name || 'A member'} has cancelled their session on ${format(eventDateObj, 'MMM d')} at ${format(eventDateObj, 'h:mm a')}.`,
          body: isLate ? 'Late cancellation — counts as a used session.' : 'Cancelled more than 24 hours in advance.',
        } as any);
      }

      toast({ title: isLate ? 'Session cancelled (late — counts as used)' : 'Session cancelled' });
      onOpenChange(false);
    } catch {
      toast({ title: 'Failed to cancel session', variant: 'destructive' });
    } finally {
      setCancelling(false);
    }
  };

  const eventDate = parseISO(event.event_date);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto overflow-x-hidden w-[calc(100vw-2rem)]">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 ${
              event.completed ? 'bg-success/20' : 'bg-primary/20'
            }`}>
              {event.completed ? (
                <CheckCircle className="w-6 h-6 text-success" />
              ) : (
                <Dumbbell className="w-6 h-6 text-primary" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-left break-words">{event.title}</DialogTitle>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge variant="outline" className="text-xs">
                  <CalendarIcon className="w-3 h-3 mr-1" />
                  {format(eventDate, 'EEEE, MMM d, yyyy')}
                </Badge>
                {event.completed && (
                  <Badge className="bg-success/20 text-success text-xs">
                    Completed
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Reschedule */}
          {onReschedule && !event.completed && (
            <Popover open={rescheduleOpen} onOpenChange={setRescheduleOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="w-full gap-2">
                  <ArrowRightLeft className="w-4 h-4" />
                  Reschedule to Another Day
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="center">
                <Calendar
                  mode="single"
                  selected={eventDate}
                  onSelect={handleReschedule}
                  disabled={rescheduling}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          )}

          {/* Description (for workout logs without linked program) */}
          {event.description && !program && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Workout Details</h4>
              <div className="p-3 bg-card border border-border rounded-lg">
                <p className="text-sm whitespace-pre-wrap break-words">{event.description}</p>
              </div>
            </div>
          )}

          {/* Program Info */}
          {program && (
            <div className="p-3 bg-secondary/50 rounded-lg">
              <p className="text-sm font-medium break-words">{program.title}</p>
              {event.description && (
                <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap break-words">{event.description}</p>
              )}
            </div>
          )}

          {/* Session Content */}
          {loading ? (
            <div className="animate-pulse space-y-2">
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-4 bg-muted rounded w-1/2" />
            </div>
          ) : null}

          {/* User Results / Notes */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm">My Results</h4>
            <Textarea
              value={userNotes}
              onChange={(e) => setUserNotes(e.target.value)}
              placeholder="Log your weights, reps, how you felt..."
              rows={3}
              className="resize-none"
            />
            <Button
              size="sm"
              variant="outline"
              className="w-full gap-2"
              onClick={handleSaveNotes}
              disabled={saving}
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Results'}
            </Button>
          </div>

          {/* Completed timestamp */}
          {event.completed && event.completed_at && (
            <p className="text-xs text-muted-foreground">
              Completed on {format(parseISO(event.completed_at), 'MMM d, yyyy at h:mm a')}
            </p>
          )}

          {/* Cancel session button — only for session events */}
          {isSessionEvent && bookingId && !event.completed && (
            <Button
              variant="destructive"
              size="sm"
              className="w-full gap-2"
              onClick={handleCancelSession}
              disabled={cancelling}
            >
              <XCircle className="w-4 h-4" />
              {cancelling ? 'Cancelling...' : 'Cancel session'}
            </Button>
          )}

          {/* Complete Button */}
          <Button
            className="w-full"
            variant={event.completed ? 'outline' : 'default'}
            onClick={() => {
              onComplete();
              onOpenChange(false);
            }}
          >
            {event.completed ? (
              <>
                <X className="w-4 h-4 mr-2" />
                Mark as Incomplete
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Mark as Complete
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
