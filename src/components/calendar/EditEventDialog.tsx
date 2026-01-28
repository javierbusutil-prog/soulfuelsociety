import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { CalendarIcon, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Event, EventType } from '@/types/database';

interface EditEventDialogProps {
  event: Event;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEventUpdated: () => void;
}

const eventTypes: { value: EventType; label: string }[] = [
  { value: 'fast', label: 'Fast' },
  { value: 'workout', label: 'Workout' },
  { value: 'live_session', label: 'Live Session' },
  { value: 'challenge', label: 'Challenge' },
  { value: 'other', label: 'Other' },
];

const recurrenceOptions = [
  { value: 'none', label: 'Does not repeat' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'weekdays', label: 'Weekdays (Mon-Fri)' },
  { value: 'monthly', label: 'Monthly' },
];

export function EditEventDialog({ event, open, onOpenChange, onEventUpdated }: EditEventDialogProps) {
  const { user, isAdmin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  const [title, setTitle] = useState(event.title);
  const [description, setDescription] = useState(event.description || '');
  const [eventType, setEventType] = useState<EventType>(event.event_type);
  const [date, setDate] = useState<Date | undefined>(new Date(event.start_datetime));
  const [time, setTime] = useState(format(new Date(event.start_datetime), 'HH:mm'));
  const [endTime, setEndTime] = useState(event.end_datetime ? format(new Date(event.end_datetime), 'HH:mm') : '');
  const [recurrence, setRecurrence] = useState(event.recurrence_rule || 'none');
  const [checkoffEnabled, setCheckoffEnabled] = useState(event.checkoff_enabled);
  const [isGlobal, setIsGlobal] = useState(event.is_global);

  useEffect(() => {
    if (open) {
      setTitle(event.title);
      setDescription(event.description || '');
      setEventType(event.event_type);
      setDate(new Date(event.start_datetime));
      setTime(format(new Date(event.start_datetime), 'HH:mm'));
      setEndTime(event.end_datetime ? format(new Date(event.end_datetime), 'HH:mm') : '');
      setRecurrence(event.recurrence_rule || 'none');
      setCheckoffEnabled(event.checkoff_enabled);
      setIsGlobal(event.is_global);
    }
  }, [event, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !date || !title.trim()) return;

    setLoading(true);

    try {
      const startDateTime = new Date(date);
      const [hours, minutes] = time.split(':').map(Number);
      startDateTime.setHours(hours, minutes, 0, 0);

      let endDateTime = null;
      if (endTime) {
        endDateTime = new Date(date);
        const [endHours, endMinutes] = endTime.split(':').map(Number);
        endDateTime.setHours(endHours, endMinutes, 0, 0);
      }

      const recurrenceRule = recurrence !== 'none' ? recurrence : null;

      const { error } = await supabase
        .from('events')
        .update({
          title: title.trim(),
          description: description.trim() || null,
          event_type: eventType,
          start_datetime: startDateTime.toISOString(),
          end_datetime: endDateTime?.toISOString() || null,
          recurrence_rule: recurrenceRule,
          checkoff_enabled: checkoffEnabled,
          is_global: isGlobal && isAdmin,
        })
        .eq('id', event.id);

      if (error) throw error;

      toast({
        title: 'Event updated',
        description: `"${title}" has been updated.`,
      });

      onOpenChange(false);
      onEventUpdated();
    } catch (error: any) {
      toast({
        title: 'Error updating event',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { error } = await supabase.from('events').delete().eq('id', event.id);

      if (error) throw error;

      toast({
        title: 'Event deleted',
        description: `"${event.title}" has been removed.`,
      });

      onOpenChange(false);
      onEventUpdated();
    } catch (error: any) {
      toast({
        title: 'Error deleting event',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  const canEdit = user && (event.user_id === user.id || isAdmin);

  if (!canEdit) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Event</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-title">Title *</Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Event title"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Event Type</Label>
            <Select value={eventType} onValueChange={(v) => setEventType(v as EventType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {eventTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !date && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, 'PPP') : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-time">Start Time *</Label>
              <Input
                id="edit-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-endTime">End Time</Label>
              <Input
                id="edit-endTime"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Repeat</Label>
            <Select value={recurrence} onValueChange={setRecurrence}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {recurrenceOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="edit-checkoff">Enable check-off</Label>
            <Switch
              id="edit-checkoff"
              checked={checkoffEnabled}
              onCheckedChange={setCheckoffEnabled}
            />
          </div>

          {isAdmin && (
            <div className="flex items-center justify-between border-t pt-4">
              <div>
                <Label htmlFor="edit-global">Make visible to all users</Label>
                <p className="text-xs text-muted-foreground">Admin only: Show this event to everyone</p>
              </div>
              <Switch
                id="edit-global"
                checked={isGlobal}
                onCheckedChange={setIsGlobal}
              />
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="destructive" size="icon" disabled={deleting}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Event</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete "{event.title}"? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    {deleting ? 'Deleting...' : 'Delete'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Button type="submit" className="flex-1" disabled={loading || !title.trim()}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
