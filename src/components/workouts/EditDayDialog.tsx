import { useState } from 'react';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { PlanDay, PlanExercise } from '@/hooks/useWeeklyPlan';

// Auto-generate exercise labels: A), B1), B2), C1), etc.
const LABELS = [
  'A)', 'B1)', 'B2)', 'C1)', 'C2)', 'D1)', 'D2)', 'E)', 'F)', 'G)',
  'H1)', 'H2)', 'I)', 'J)',
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dayLabel: string;
  dayDate: string;
  dayData: PlanDay;
  onSave: (title: string, exercises: PlanExercise[], notes: string | null) => void;
  onClear: () => void;
}

export function EditDayDialog({ open, onOpenChange, dayLabel, dayDate, dayData, onSave, onClear }: Props) {
  const [title, setTitle] = useState(dayData.exercises.length > 0 ? dayData.title : 'Workout');
  const [exercises, setExercises] = useState<PlanExercise[]>(
    dayData.exercises.length > 0
      ? dayData.exercises
      : [{ label: 'A)', name: '', details: '' }]
  );
  const [notes, setNotes] = useState(dayData.notes || '');

  const addExercise = () => {
    const nextLabel = LABELS[exercises.length] || `${String.fromCharCode(65 + exercises.length)})`;
    setExercises([...exercises, { label: nextLabel, name: '', details: '' }]);
  };

  const removeExercise = (idx: number) => {
    const updated = exercises.filter((_, i) => i !== idx);
    // Re-label
    setExercises(updated.map((ex, i) => ({ ...ex, label: LABELS[i] || ex.label })));
  };

  const updateExercise = (idx: number, field: keyof PlanExercise, value: string) => {
    setExercises(exercises.map((ex, i) => i === idx ? { ...ex, [field]: value } : ex));
  };

  const handleSave = () => {
    const filtered = exercises.filter(ex => ex.name.trim());
    // Re-label cleaned list
    const labeled = filtered.map((ex, i) => ({ ...ex, label: LABELS[i] || ex.label }));
    onSave(title || 'Workout', labeled, notes.trim() || null);
  };

  const handleMarkRest = () => {
    onSave('Rest Day', [], notes.trim() || null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{dayLabel} · {dayDate}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Day title */}
          <div className="space-y-1.5">
            <Label className="text-xs">Session Title</Label>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Upper Body, Legs, Full Body"
            />
          </div>

          {/* Exercises */}
          <div className="space-y-1.5">
            <Label className="text-xs">Exercises</Label>
            <div className="space-y-2">
              {exercises.map((ex, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <span className="text-xs font-bold text-primary mt-3 w-7 shrink-0">{ex.label}</span>
                  <div className="flex-1 space-y-1.5">
                    <Input
                      value={ex.name}
                      onChange={e => updateExercise(i, 'name', e.target.value)}
                      placeholder="Exercise name"
                      className="text-sm h-9"
                    />
                    <Input
                      value={ex.details}
                      onChange={e => updateExercise(i, 'details', e.target.value)}
                      placeholder="@tempo, reps x sets; rest"
                      className="text-xs h-8 text-muted-foreground"
                    />
                  </div>
                  <button
                    onClick={() => removeExercise(i)}
                    className="text-muted-foreground hover:text-destructive p-1 mt-2 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <Button variant="ghost" size="sm" onClick={addExercise} className="w-full text-xs gap-1 mt-1">
              <Plus className="w-3 h-3" /> Add Exercise
            </Button>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs">Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Coaching notes, focus areas..."
              rows={2}
              className="text-sm"
            />
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <div className="flex gap-2 w-full">
            <Button variant="outline" onClick={handleMarkRest} className="flex-1 text-xs">
              Mark as Rest Day
            </Button>
            <Button onClick={handleSave} className="flex-1 text-xs">
              Save
            </Button>
          </div>
          {dayData.id && (
            <Button variant="ghost" onClick={onClear} className="w-full text-xs text-destructive hover:text-destructive">
              Clear Day
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
