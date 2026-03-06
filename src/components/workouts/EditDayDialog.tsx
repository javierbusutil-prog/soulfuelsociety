import { useState } from 'react';
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
  const hasContent = dayData.exercises.length > 0 || dayData.notes;
  const [title, setTitle] = useState(hasContent ? dayData.title : 'Workout');
  
  // Build initial content from existing exercises + notes
  const buildInitialContent = () => {
    let content = '';
    if (dayData.exercises.length > 0) {
      content = dayData.exercises.map(ex => {
        let line = `${ex.label} ${ex.name}`;
        if (ex.details) {
          // Preserve multi-line details with indentation
          const detailLines = ex.details.split('\n').map(d => `   ${d}`).join('\n');
          line += `\n${detailLines}`;
        }
        return line;
      }).join('\n');
    }
    if (dayData.notes) {
      if (content) content += '\n\n';
      content += dayData.notes;
    }
    return content;
  };

  const [content, setContent] = useState(buildInitialContent());

  // Parse free-text back into exercises structure for storage
  const parseContent = (text: string): { exercises: PlanExercise[]; notes: string | null } => {
    const lines = text.split('\n');
    const exercises: PlanExercise[] = [];
    const noteLines: string[] = [];
    let currentExercise: PlanExercise | null = null;
    
    // Match labels like A), B1), B2), C), a), 1), 1., A., A1), etc.
    const exerciseLabelRegex = /^([A-Za-z]\d?[).]|[A-Za-z][)]|\d+[).])\s*(.+)/;

    for (const line of lines) {
      const trimmed = line.trimEnd();
      const match = trimmed.match(exerciseLabelRegex);
      
      if (match) {
        // New exercise found
        if (currentExercise) exercises.push(currentExercise);
        currentExercise = { label: match[1], name: match[2].trim(), details: '' };
      } else if (currentExercise && trimmed.trim()) {
        // Any non-empty line after an exercise label is a detail line
        const detail = trimmed.trim();
        currentExercise.details = currentExercise.details 
          ? `${currentExercise.details}\n${detail}` 
          : detail;
      } else if (!currentExercise && trimmed.trim()) {
        // Line before any exercise label → treat as note
        noteLines.push(trimmed.trim());
      }
      // Empty lines are separators — don't break the current exercise
    }
    if (currentExercise) exercises.push(currentExercise);

    return {
      exercises,
      notes: noteLines.length > 0 ? noteLines.join('\n') : null,
    };
  };

  const handleSave = () => {
    const { exercises, notes } = parseContent(content);
    onSave(title || 'Workout', exercises, notes);
  };

  const handleMarkRest = () => {
    onSave('Rest Day', [], null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{dayLabel} · {dayDate}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Session Title</Label>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Upper Body, Legs, Full Body"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Workout Content</Label>
            <Textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder={`A) Back Squat\n   @20X1, 12,8,4,12,8,4; rest 2:00\nB1) Prone Hamstring Curl\n   @20X1, 12-15 reps x 3 sets\nB2) Alternating DB Lunge\n   @20X1, 24-30 alt reps x 3 sets`}
              rows={12}
              className="text-sm font-mono leading-relaxed"
            />
            <p className="text-[10px] text-muted-foreground">
              Tip: Use labels like A), B1), B2) for structured display, or write freely.
            </p>
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
