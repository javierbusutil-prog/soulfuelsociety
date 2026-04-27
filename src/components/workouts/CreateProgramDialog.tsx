import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { WorkoutProgram, DAYS_OF_WEEK, ScheduleMode, ProgramAccessType } from '@/types/workoutPrograms';

interface CreateProgramDialogProps {
  onProgramCreated: (program: Partial<WorkoutProgram>) => Promise<WorkoutProgram>;
}

export function CreateProgramDialog({ onProgramCreated }: CreateProgramDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [weeks, setWeeks] = useState(4);
  const [frequency, setFrequency] = useState(3);
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>('admin_selected');
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 3, 5]); // Mon, Wed, Fri
  const [accessType, setAccessType] = useState<ProgramAccessType>('membership');
  const [priceDollars, setPriceDollars] = useState<string>('');
  const [publishImmediately, setPublishImmediately] = useState(false);

  const toggleDay = (day: number) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter(d => d !== day));
    } else {
      setSelectedDays([...selectedDays, day].sort((a, b) => a - b));
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast({ title: 'Title required', variant: 'destructive' });
      return;
    }

    if (scheduleMode === 'admin_selected' && selectedDays.length !== frequency) {
      toast({ 
        title: `Please select exactly ${frequency} days`, 
        variant: 'destructive' 
      });
      return;
    }

    let priceCents: number | null = null;
    if (accessType === 'one_time_purchase') {
      const parsed = parseFloat(priceDollars);
      if (!priceDollars || isNaN(parsed) || parsed <= 0) {
        toast({ title: 'Enter a valid price', variant: 'destructive' });
        return;
      }
      priceCents = Math.round(parsed * 100);
    }

    setLoading(true);
    try {
      await onProgramCreated({
        title: title.trim(),
        description: description.trim() || null,
        weeks,
        frequency_per_week: frequency,
        schedule_mode: scheduleMode,
        admin_days_of_week: scheduleMode === 'admin_selected' ? selectedDays : null,
        published: publishImmediately,
        access_type: accessType,
        price_cents: priceCents,
      });

      toast({ title: 'Program created!' });
      setOpen(false);
      resetForm();
    } catch (error) {
      toast({ title: 'Failed to create program', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setWeeks(4);
    setFrequency(3);
    setScheduleMode('admin_selected');
    setSelectedDays([1, 3, 5]);
    setAccessType('membership');
    setPriceDollars('');
    setPublishImmediately(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Create Program
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Workout Program</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Program Name</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., 4-Week Strength Builder"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this program..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Program Length</Label>
              <Select value={String(weeks)} onValueChange={(v) => setWeeks(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2, 3, 4, 6, 8, 12].map(w => (
                    <SelectItem key={w} value={String(w)}>{w} weeks</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Frequency</Label>
              <Select value={String(frequency)} onValueChange={(v) => setFrequency(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7].map(f => (
                    <SelectItem key={f} value={String(f)}>{f}x per week</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3">
            <Label>Scheduling Mode</Label>
            <div className="flex items-center justify-between p-3 bg-secondary rounded-lg">
              <div>
                <p className="font-medium text-sm">User Selects Days</p>
                <p className="text-xs text-muted-foreground">
                  Let users choose their workout days
                </p>
              </div>
              <Switch
                checked={scheduleMode === 'user_selected'}
                onCheckedChange={(checked) => 
                  setScheduleMode(checked ? 'user_selected' : 'admin_selected')
                }
              />
            </div>
          </div>

          {scheduleMode === 'admin_selected' && (
            <div className="space-y-3">
              <Label>Select {frequency} Workout Days</Label>
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
              {selectedDays.length !== frequency && (
                <p className="text-xs text-destructive">
                  Selected {selectedDays.length} of {frequency} days
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label>Access Type</Label>
            <Select value={accessType} onValueChange={(v) => setAccessType(v as ProgramAccessType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="free">Free (all members)</SelectItem>
                <SelectItem value="membership">Paid members only</SelectItem>
                <SelectItem value="one_time_purchase">Standalone purchase</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {accessType === 'one_time_purchase' && (
            <div className="space-y-2">
              <Label htmlFor="price">Price</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={priceDollars}
                  onChange={(e) => setPriceDollars(e.target.value)}
                  placeholder="49.00"
                  className="pl-7"
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-between p-3 bg-secondary rounded-lg">
            <div>
              <p className="font-medium text-sm">Publish immediately</p>
              <p className="text-xs text-muted-foreground">
                Make this program visible to members on creation
              </p>
            </div>
            <Switch
              checked={publishImmediately}
              onCheckedChange={setPublishImmediately}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Creating...' : 'Create Program'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
