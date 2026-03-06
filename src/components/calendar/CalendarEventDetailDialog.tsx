import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Dumbbell, 
  Calendar, 
  CheckCircle, 
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { CalendarEvent, WorkoutSessionTemplate, WorkoutProgram, SessionContent } from '@/types/workoutPrograms';
import { format, parseISO } from 'date-fns';

interface CalendarEventDetailDialogProps {
  event: CalendarEvent;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

export function CalendarEventDetailDialog({ 
  event, 
  open, 
  onOpenChange, 
  onComplete 
}: CalendarEventDetailDialogProps) {
  const [session, setSession] = useState<WorkoutSessionTemplate | null>(null);
  const [program, setProgram] = useState<WorkoutProgram | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && event) {
      fetchDetails();
    }
  }, [open, event]);

  const fetchDetails = async () => {
    setLoading(true);
    
    // Fetch session template if linked
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

    // Fetch program if linked
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
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  <Calendar className="w-3 h-3 mr-1" />
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
          {/* Program Info */}
          {program && (
            <div className="p-3 bg-secondary/50 rounded-lg">
              <p className="text-sm font-medium">{program.title}</p>
              {event.description && (
                <p className="text-xs text-muted-foreground mt-1">{event.description}</p>
              )}
            </div>
          )}

          {/* Session Content */}
          {loading ? (
            <div className="animate-pulse space-y-2">
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-4 bg-muted rounded w-1/2" />
            </div>
          ) : session?.content_json?.notes ? (
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Workout Details</h4>
              <div className="p-3 bg-card border border-border rounded-lg">
                <p className="text-sm whitespace-pre-wrap">{session.content_json.notes}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No additional workout details available.
            </p>
          )}

          {/* Completed timestamp */}
          {event.completed && event.completed_at && (
            <p className="text-xs text-muted-foreground">
              Completed on {format(parseISO(event.completed_at), 'MMM d, yyyy at h:mm a')}
            </p>
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
