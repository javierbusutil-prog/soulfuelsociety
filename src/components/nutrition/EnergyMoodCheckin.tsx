import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import type { DailyNutrition } from '@/hooks/useNutrition';

interface Props {
  entry: DailyNutrition | null;
  setCheckin: (field: 'energy_level' | 'mood_level', value: number) => void;
}

const energyLabels = ['Low', '', 'Moderate', '', 'High'];
const moodLabels = ['Drained', '', 'Balanced', '', 'Strong'];

export function EnergyMoodCheckin({ entry, setCheckin }: Props) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-sans font-semibold tracking-normal">Energy & Mood</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium" id="energy-label">Energy</label>
            <span className="text-xs text-muted-foreground">
              {entry?.energy_level ? energyLabels[entry.energy_level - 1] || '' : 'Not set'}
            </span>
          </div>
          <Slider
            aria-labelledby="energy-label"
            min={1}
            max={5}
            step={1}
            value={[entry?.energy_level || 3]}
            onValueChange={([v]) => setCheckin('energy_level', v)}
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>Low</span>
            <span>High</span>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium" id="mood-label">Mood</label>
            <span className="text-xs text-muted-foreground">
              {entry?.mood_level ? moodLabels[entry.mood_level - 1] || '' : 'Not set'}
            </span>
          </div>
          <Slider
            aria-labelledby="mood-label"
            min={1}
            max={5}
            step={1}
            value={[entry?.mood_level || 3]}
            onValueChange={([v]) => setCheckin('mood_level', v)}
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>Drained</span>
            <span>Balanced</span>
            <span>Strong</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
