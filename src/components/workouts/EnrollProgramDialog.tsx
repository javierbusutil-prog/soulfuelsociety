import { useState } from 'react';
import { CalendarPlus, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { toast } from '@/hooks/use-toast';
import { format, addDays } from 'date-fns';
import { WorkoutProgram, WorkoutSessionTemplate, DAYS_OF_WEEK } from '@/types/workoutPrograms';
import { useEnrollProgram, useSessionTemplates } from '@/hooks/useWorkoutPrograms';
import { cn } from '@/lib/utils';

interface EnrollProgramDialogProps {
  program: WorkoutProgram;
  sessions?: WorkoutSessionTemplate[];
  onEnrolled: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function EnrollProgramDialog({ program, sessions: sessionsProp, onEnrolled, open: externalOpen, onOpenChange: externalOnOpenChange }: EnrollProgramDialogProps) {
  const { enrollInProgram } = useEnrollProgram();
  const [internalOpen, setInternalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState<Date>(addDays(new Date(), 1));
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 3, 5]);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  // Fetch sessions if not provided
  const { sessions: fetchedSessions } = useSessionTemplates(sessionsProp ? null : program.id);
  const sessions = sessionsProp || fetchedSessions;

  const isControlled = externalOpen !== undefined;
  const open = isControlled ? externalOpen : internalOpen;
  const setOpen = isControlled ? (v: boolean) => externalOnOpenChange?.(v) : setInternalOpen;

  const needsUserDays = true; // Always let users choose their days

  const toggleDay = (day: number) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter(d => d !== day));
    } else {
      setSelectedDays([...selectedDays, day].sort((a, b) => a - b));
    }
  };

  const handleEnroll = async () => {
    if (selectedDays.length !== program.frequency_per_week) {
      toast({
        title: `Please select exactly ${program.frequency_per_week} days`,
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const result = await enrollInProgram(
        program,
        sessions,
        startDate,
        needsUserDays ? selectedDays : undefined
      );

      toast({
        title: 'Added to your calendar! ✅',
        description: `${result.eventsCreated} workouts scheduled`,
      });
      setOpen(false);
      onEnrolled();
    } catch (error: any) {
      toast({
        title: 'Failed to enroll',
        description: error?.message || 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const dialogContent = (
    <>
      <DialogHeader>
        <DialogTitle>Add Program to Calendar</DialogTitle>
      </DialogHeader>

      <div className="space-y-5 py-4">
        {/* Start Date */}
        <div className="space-y-2">
          <Label>Start Date</Label>
          <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start">
                {format(startDate, 'EEEE, MMMM d, yyyy')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={(date) => {
                  if (date) {
                    setStartDate(date);
                    setDatePickerOpen(false);
                  }
                }}
                disabled={(date) => date < new Date()}
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Day Selection (if user_selected mode) */}
        {needsUserDays && (
          <div className="space-y-3">
            <Label>
              Select {program.frequency_per_week} Workout Days
            </Label>
            <div className="flex flex-wrap gap-2">
              {DAYS_OF_WEEK.map(day => (
                <label
                  key={day.value}
                  className={`
                    flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer border transition-colors
                    ${selectedDays.includes(day.value)
                      ? 'bg-primary/20 border-primary text-primary'
                      : 'bg-secondary border-transparent hover:border-border'}
                  `}
                >
                  <Checkbox
                    checked={selectedDays.includes(day.value)}
                    onCheckedChange={() => toggleDay(day.value)}
                  />
                  <span className="text-sm">{day.short}</span>
                </label>
              ))}
            </div>
            {selectedDays.length !== program.frequency_per_week && (
              <p className="text-xs text-muted-foreground">
                Selected {selectedDays.length} of {program.frequency_per_week} days
              </p>
            )}
          </div>
        )}

        {/* Program Summary */}
        <div className="p-4 bg-secondary/50 rounded-lg space-y-2">
          <h4 className="font-medium text-sm">Program Summary</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• {program.weeks} weeks total</li>
            <li>• {program.frequency_per_week} workouts per week</li>
            <li>• {program.weeks * program.frequency_per_week} sessions will be added</li>
            <li>
              • End date: {format(
                addDays(startDate, program.weeks * 7 - 1),
                'MMM d, yyyy'
              )}
            </li>
          </ul>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <Button onClick={handleEnroll} disabled={loading}>
          {loading ? (
            'Adding...'
          ) : (
            <>
              <Check className="w-4 h-4 mr-1" />
              Add to Calendar
            </>
          )}
        </Button>
      </DialogFooter>
    </>
  );

  // If externally controlled, render without trigger
  if (isControlled) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          {dialogContent}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full" size="lg">
          <CalendarPlus className="w-5 h-5 mr-2" />
          Add to My Calendar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        {dialogContent}
      </DialogContent>
    </Dialog>
  );
}
