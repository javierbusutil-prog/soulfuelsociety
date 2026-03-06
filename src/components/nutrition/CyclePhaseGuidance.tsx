import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Droplet } from 'lucide-react';
import { differenceInDays, parseISO, addDays } from 'date-fns';
import type { CycleEntry, CycleSettings } from '@/hooks/useCycleTracker';

interface Props {
  cycleEntries: CycleEntry[];
  cycleSettings: CycleSettings | null;
  selectedDate: Date;
  onLogPeriod?: () => void;
  hasPeriodEntry?: boolean;
}

type Phase = 'menstrual' | 'follicular' | 'ovulatory' | 'luteal';

const phaseInfo: Record<Phase, { label: string; emoji: string; color: string; guidance: string }> = {
  menstrual: {
    label: 'Menstrual Phase',
    emoji: '🌙',
    color: 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/40',
    guidance: 'Your body is resetting. Focus on iron-rich foods, warming meals, and staying well hydrated. Gentle movement and rest are your allies.',
  },
  follicular: {
    label: 'Follicular Phase',
    emoji: '🌱',
    color: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/40',
    guidance: 'Energy is building. This is a great time for variety — fresh vegetables, lean proteins, and lighter meals can feel especially good.',
  },
  ovulatory: {
    label: 'Ovulatory Phase',
    emoji: '☀️',
    color: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/40',
    guidance: 'You may feel your strongest. Support your energy with anti-inflammatory foods, fiber-rich meals, and plenty of water.',
  },
  luteal: {
    label: 'Luteal Phase',
    emoji: '🍂',
    color: 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800/40',
    guidance: 'Cravings may increase — this is normal. Complex carbs, magnesium-rich foods, and healthy fats can help you feel balanced and nourished.',
  },
};

function detectPhase(
  selectedDate: Date,
  entries: CycleEntry[],
  settings: CycleSettings | null
): Phase | null {
  if (!settings || entries.length === 0) return null;

  const periodDates = entries
    .filter(e => e.is_period)
    .map(e => e.date)
    .sort();

  if (periodDates.length === 0) return null;

  const clusters: string[][] = [];
  let current = [periodDates[0]];
  for (let i = 1; i < periodDates.length; i++) {
    const gap = differenceInDays(parseISO(periodDates[i]), parseISO(periodDates[i - 1]));
    if (gap <= 3) {
      current.push(periodDates[i]);
    } else {
      clusters.push(current);
      current = [periodDates[i]];
    }
  }
  clusters.push(current);

  const lastPeriodStart = parseISO(clusters[clusters.length - 1][0]);
  const cycleLength = settings.cycle_length_days || 28;
  const periodLength = settings.period_length_days || 5;

  let dayInCycle = differenceInDays(selectedDate, lastPeriodStart);

  if (dayInCycle < 0) return null;

  dayInCycle = dayInCycle % cycleLength;

  if (dayInCycle < periodLength) return 'menstrual';
  if (dayInCycle < cycleLength - 17) return 'follicular';
  if (dayInCycle < cycleLength - 12) return 'ovulatory';
  return 'luteal';
}

export function CyclePhaseGuidance({ cycleEntries, cycleSettings, selectedDate, onLogPeriod, hasPeriodEntry, settingsSlot }: Props) {
  const phase = useMemo(
    () => detectPhase(selectedDate, cycleEntries, cycleSettings),
    [selectedDate, cycleEntries, cycleSettings]
  );

  if (!phase || !cycleSettings || cycleSettings.hide_cycle_markers) return null;

  const info = phaseInfo[phase];

  return (
    <Card className={`border ${info.color} transition-colors duration-300`}>
      <CardContent className="py-4 px-4">
        <div className="flex items-start gap-3">
          <span className="text-xl mt-0.5">{info.emoji}</span>
          <div className="space-y-2.5 min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">{info.label}</p>
              {settingsSlot}
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">{info.guidance}</p>
            {onLogPeriod && (
              <Button
                variant={hasPeriodEntry ? 'default' : 'outline'}
                size="sm"
                className="w-full gap-1.5"
                onClick={onLogPeriod}
              >
                <Droplet className="w-3.5 h-3.5" />
                {hasPeriodEntry ? 'Edit Period Log' : 'Log Period'}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
