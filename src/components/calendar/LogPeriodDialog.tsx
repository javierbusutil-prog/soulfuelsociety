import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Droplet } from 'lucide-react';
import { CycleEntry, SYMPTOM_OPTIONS } from '@/hooks/useCycleTracker';

interface LogPeriodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date;
  existingEntry?: CycleEntry;
  onTogglePeriod: (date: string, flowLevel?: 'light' | 'medium' | 'heavy', symptoms?: string[], notes?: string) => Promise<void>;
  onUpdateEntry?: (id: string, updates: { flow_level?: string; symptoms?: string[]; notes?: string }) => Promise<void>;
}

const flowLevels: { value: 'light' | 'medium' | 'heavy'; label: string; drops: number }[] = [
  { value: 'light', label: 'Light', drops: 1 },
  { value: 'medium', label: 'Medium', drops: 2 },
  { value: 'heavy', label: 'Heavy', drops: 3 },
];

export function LogPeriodDialog({
  open,
  onOpenChange,
  date,
  existingEntry,
  onTogglePeriod,
  onUpdateEntry,
}: LogPeriodDialogProps) {
  const [flowLevel, setFlowLevel] = useState<'light' | 'medium' | 'heavy'>('medium');
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (existingEntry) {
      setFlowLevel((existingEntry.flow_level as any) || 'medium');
      setSelectedSymptoms(existingEntry.symptoms || []);
      setNotes(existingEntry.notes || '');
    } else {
      setFlowLevel('medium');
      setSelectedSymptoms([]);
      setNotes('');
    }
  }, [existingEntry, open]);

  const toggleSymptom = (symptom: string) => {
    setSelectedSymptoms(prev =>
      prev.includes(symptom)
        ? prev.filter(s => s !== symptom)
        : [...prev, symptom]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    const dateStr = format(date, 'yyyy-MM-dd');

    if (existingEntry && onUpdateEntry) {
      await onUpdateEntry(existingEntry.id, {
        flow_level: flowLevel,
        symptoms: selectedSymptoms,
        notes: notes || undefined,
      });
    } else {
      await onTogglePeriod(dateStr, flowLevel, selectedSymptoms, notes);
    }

    setSaving(false);
    onOpenChange(false);
  };

  const handleRemove = async () => {
    setSaving(true);
    const dateStr = format(date, 'yyyy-MM-dd');
    await onTogglePeriod(dateStr);
    setSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display tracking-editorial">
            {existingEntry ? 'Edit Period Log' : 'Log Period'}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {format(date, 'EEEE, MMMM d, yyyy')}
          </p>
        </DialogHeader>

        <div className="space-y-5">
          {/* Flow level */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Flow Level</Label>
            <div className="flex gap-2">
              {flowLevels.map(level => (
                <Button
                  key={level.value}
                  variant={flowLevel === level.value ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1 gap-1"
                  onClick={() => setFlowLevel(level.value)}
                >
                  {Array.from({ length: level.drops }).map((_, i) => (
                    <Droplet key={i} className="w-3 h-3" fill="currentColor" />
                  ))}
                  <span className="text-xs">{level.label}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Symptoms */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Symptoms</Label>
            <div className="flex flex-wrap gap-1.5">
              {SYMPTOM_OPTIONS.map(symptom => (
                <Badge
                  key={symptom}
                  variant={selectedSymptoms.includes(symptom) ? 'default' : 'outline'}
                  className="cursor-pointer text-xs"
                  onClick={() => toggleSymptom(symptom)}
                >
                  {symptom}
                </Badge>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Notes</Label>
            <Textarea
              placeholder="Optional notes..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            {existingEntry && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleRemove}
                disabled={saving}
                className="flex-1"
              >
                Remove
              </Button>
            )}
            <Button
              onClick={handleSave}
              disabled={saving}
              className="flex-1"
            >
              {saving ? 'Saving...' : existingEntry ? 'Update' : 'Log Period'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
