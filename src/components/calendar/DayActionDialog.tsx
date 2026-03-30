import { CalendarPlus, Dumbbell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { format } from 'date-fns';

interface DayActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date;
  onAddEvent: () => void;
  onLogWorkout: () => void;
}

export function DayActionDialog({
  open,
  onOpenChange,
  date,
  onAddEvent,
  onLogWorkout,
}: DayActionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle>{format(date, 'MMM d, yyyy')}</DialogTitle>
          <DialogDescription>What would you like to add?</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            className="flex flex-col items-center gap-2 h-auto py-5"
            onClick={() => {
              onOpenChange(false);
              onAddEvent();
            }}
          >
            <CalendarPlus className="w-6 h-6 text-primary" />
            <span className="text-sm font-medium">Add Event</span>
          </Button>
          <Button
            variant="outline"
            className="flex flex-col items-center gap-2 h-auto py-5"
            onClick={() => {
              onOpenChange(false);
              onLogWorkout();
            }}
          >
            <Dumbbell className="w-6 h-6 text-primary" />
            <span className="text-sm font-medium">Log Workout</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
