import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings } from 'lucide-react';
import { CycleSettings } from '@/hooks/useCycleTracker';

interface CycleSettingsDialogProps {
  settings: CycleSettings | null;
  onUpdateSettings: (updates: Partial<CycleSettings>) => Promise<void>;
}

export function CycleSettingsDialog({ settings, onUpdateSettings }: CycleSettingsDialogProps) {
  const [open, setOpen] = useState(false);
  const [cycleLength, setCycleLength] = useState(28);
  const [periodLength, setPeriodLength] = useState(5);
  const [predictionEnabled, setPredictionEnabled] = useState(true);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState('morning');
  const [hideMarkers, setHideMarkers] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setCycleLength(settings.cycle_length_days);
      setPeriodLength(settings.period_length_days);
      setPredictionEnabled(settings.prediction_enabled);
      setReminderEnabled(settings.reminder_enabled);
      setReminderTime(settings.reminder_time);
      setHideMarkers(settings.hide_cycle_markers);
    }
  }, [settings, open]);

  const handleSave = async () => {
    setSaving(true);
    await onUpdateSettings({
      cycle_length_days: cycleLength,
      period_length_days: periodLength,
      prediction_enabled: predictionEnabled,
      reminder_enabled: reminderEnabled,
      reminder_time: reminderTime,
      hide_cycle_markers: hideMarkers,
    });
    setSaving(false);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon-sm" title="Cycle Settings">
          <Settings className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display tracking-editorial">Cycle Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Cycle length */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Cycle Length (days)</Label>
            <Select value={String(cycleLength)} onValueChange={v => setCycleLength(Number(v))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 21 }, (_, i) => i + 20).map(n => (
                  <SelectItem key={n} value={String(n)}>{n} days</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Period length */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Period Length (days)</Label>
            <Select value={String(periodLength)} onValueChange={v => setPeriodLength(Number(v))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 8 }, (_, i) => i + 2).map(n => (
                  <SelectItem key={n} value={String(n)}>{n} days</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Prediction toggle */}
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Period Predictions</Label>
            <Switch checked={predictionEnabled} onCheckedChange={setPredictionEnabled} />
          </div>

          {/* Reminder toggle */}
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Period Reminders</Label>
            <Switch checked={reminderEnabled} onCheckedChange={setReminderEnabled} />
          </div>

          {reminderEnabled && (
            <div>
              <Label className="text-sm font-medium mb-2 block">Reminder Time</Label>
              <Select value={reminderTime} onValueChange={setReminderTime}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="morning">Morning</SelectItem>
                  <SelectItem value="afternoon">Afternoon</SelectItem>
                  <SelectItem value="evening">Evening</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Hide markers */}
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Hide Cycle Markers</Label>
            <Switch checked={hideMarkers} onCheckedChange={setHideMarkers} />
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
