import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { EventType } from '@/types/database';

interface CreateEventDialogProps {
  onEventCreated: () => void;
  selectedDate?: Date;
  externalOpen?: boolean;
  onExternalOpenChange?: (open: boolean) => void;
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

export function CreateEventDialog({ onEventCreated, selectedDate, externalOpen, onExternalOpenChange }: CreateEventDialogProps) {
  const { user, isAdmin } = useAuth();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = (v: boolean) => {
    if (onExternalOpenChange) onExternalOpenChange(v);
    setInternalOpen(v);
  };
  const [loading, setLoading] = useState(false);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventType, setEventType] = useState<EventType>('other');
  const [date, setDate] = useState<Date | undefined>(selectedDate || new Date());
  const [time, setTime] = useState('09:00');
  const [endTime, setEndTime] = useState('');
  const [recurrence, setRecurrence] = useState('none');
  const [checkoffEnabled, setCheckoffEnabled] = useState(false);
  const [isGlobal, setIsGlobal] = useState(false);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setEventType('other');
    setDate(selectedDate || new Date());
    setTime('09:00');
    setEndTime('');
    setRecurrence('none');
    setCheckoffEnabled(false);
    setIsGlobal(false);
  };

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

      // Build recurrence rule
      let recurrenceRule = null;
      if (recurrence !== 'none') {
        recurrenceRule = recurrence;
      }

      const { error } = await supabase.from('events').insert({
        title: title.trim(),
        description: description.trim() || null,
        event_type: eventType,
        start_datetime: startDateTime.toISOString(),
        end_datetime: endDateTime?.toISOString() || null,
        recurrence_rule: recurrenceRule,
        checkoff_enabled: checkoffEnabled,
        user_id: isGlobal && isAdmin ? null : user.id,
        is_global: isGlobal && isAdmin,
        created_by: user.id,
      });

      if (error) throw error;

      toast({
        title: 'Event created',
        description: `"${title}" has been added to your calendar.`,
      });

      resetForm();
      setOpen(false);
      onEventCreated();
    } catch (error: any) {
      toast({
        title: 'Error creating event',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon" className="rounded-full">
          <Plus className="w-5 h-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Event</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Event title"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
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
              <Label htmlFor="time">Start Time *</Label>
              <Input
                id="time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">End Time</Label>
              <Input
                id="endTime"
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
            <Label htmlFor="checkoff">Enable check-off</Label>
            <Switch
              id="checkoff"
              checked={checkoffEnabled}
              onCheckedChange={setCheckoffEnabled}
            />
          </div>

          {isAdmin && (
            <div className="flex items-center justify-between border-t pt-4">
              <div>
                <Label htmlFor="global">Make visible to all users</Label>
                <p className="text-xs text-muted-foreground">Admin only: Show this event to everyone</p>
              </div>
              <Switch
                id="global"
                checked={isGlobal}
                onCheckedChange={setIsGlobal}
              />
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading || !title.trim()}>
            {loading ? 'Creating...' : 'Create Event'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
