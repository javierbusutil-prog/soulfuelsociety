import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Settings2, Dumbbell, Beef, Droplets, Flame, Moon, Salad } from 'lucide-react';
import { useUserSettings } from '@/hooks/useUserSettings';
import { DEFAULT_RING_HABITS, type RingHabits } from '@/types/workoutPrograms';

const HABIT_OPTIONS: { key: keyof RingHabits; label: string; icon: React.ReactNode; description: string; default?: boolean }[] = [
  { key: 'workout', label: 'Workout / Move', icon: <Dumbbell className="w-4 h-4" />, description: 'Complete a workout or movement', default: true },
  { key: 'protein', label: 'Protein Goal', icon: <Beef className="w-4 h-4" />, description: 'Hit your daily protein target', default: true },
  { key: 'hydration', label: 'Hydration Goal', icon: <Droplets className="w-4 h-4 text-sky-500" />, description: 'Reach your water intake goal', default: true },
  { key: 'fasting', label: 'Fasting', icon: <Flame className="w-4 h-4 text-accent" />, description: 'Complete a fasting session' },
  { key: 'cycle_logging', label: 'Cycle Logging', icon: <Moon className="w-4 h-4 text-pink-400" />, description: 'Log your cycle for the day' },
  { key: 'whole_foods', label: 'Whole Foods Focus', icon: <Salad className="w-4 h-4 text-green-500" />, description: 'Prioritize whole, unprocessed foods' },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RingSettingsDialog({ open, onOpenChange }: Props) {
  const { settings, updateSettings } = useUserSettings();
  const [habits, setHabits] = useState<RingHabits>(DEFAULT_RING_HABITS);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings?.ring_habits) {
      setHabits(settings.ring_habits);
    }
  }, [settings]);

  const activeCount = Object.values(habits).filter(Boolean).length;

  const toggle = (key: keyof RingHabits) => {
    setHabits(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const save = async () => {
    setSaving(true);
    await updateSettings({ ring_habits: habits } as any);
    setSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="w-5 h-5" />
            Daily Ring Settings
          </DialogTitle>
          <DialogDescription>
            Choose which habits count toward closing your daily ring. We recommend 3–5 habits.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1 mt-2">
          {HABIT_OPTIONS.map(opt => (
            <button
              key={opt.key}
              onClick={() => toggle(opt.key)}
              className="flex items-center gap-3 w-full px-3 py-3 rounded-xl hover:bg-secondary/50 transition-colors text-left"
            >
              <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                {opt.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{opt.label}</p>
                <p className="text-xs text-muted-foreground">{opt.description}</p>
              </div>
              <Switch
                checked={habits[opt.key]}
                onCheckedChange={() => toggle(opt.key)}
                onClick={(e) => e.stopPropagation()}
              />
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">
            {activeCount} habit{activeCount !== 1 ? 's' : ''} selected
            {activeCount > 5 && <span className="text-warning ml-1">· Consider fewer for focus</span>}
            {activeCount === 0 && <span className="text-destructive ml-1">· Select at least 1</span>}
          </p>
          <Button onClick={save} disabled={saving || activeCount === 0} size="sm">
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
