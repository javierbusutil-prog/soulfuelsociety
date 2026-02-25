import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calculator } from 'lucide-react';

const activityLevels = [
  { value: 'light', label: 'Lightly Active', multiplier: 0.6 },
  { value: 'moderate', label: 'Moderate Training (3–4x/week)', multiplier: 0.7 },
  { value: 'strength', label: 'Strength Focused (4–5x/week)', multiplier: 0.8 },
  { value: 'muscle', label: 'Muscle Building', multiplier: 0.95 },
] as const;

type Unit = 'lbs' | 'kg';

interface Props {
  currentGoal: number;
  onSetGoal: (grams: number) => void;
}

export function ProteinCalculatorDialog({ currentGoal, onSetGoal }: Props) {
  const [open, setOpen] = useState(false);
  const [weight, setWeight] = useState('');
  const [unit, setUnit] = useState<Unit>('lbs');
  const [activity, setActivity] = useState<string>('moderate');
  const [result, setResult] = useState<number | null>(null);

  const calculate = () => {
    const w = parseFloat(weight);
    if (!w || w <= 0 || w > 1000) return;

    const weightInLbs = unit === 'kg' ? w * 2.20462 : w;
    const level = activityLevels.find(l => l.value === activity);
    if (!level) return;

    const grams = Math.round(weightInLbs * level.multiplier);
    setResult(grams);
  };

  const apply = () => {
    if (result && result > 0) {
      onSetGoal(result);
      setOpen(false);
    }
  };

  const handleWeightChange = (val: string) => {
    // Allow only numbers and one decimal point
    if (/^\d{0,4}(\.\d{0,1})?$/.test(val)) {
      setWeight(val);
      setResult(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground">
          <Calculator className="w-3.5 h-3.5" />
          Calculate
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display tracking-editorial">Protein Goal Calculator</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Protein supports muscle, recovery, metabolism, and hormone balance.
        </p>

        <div className="space-y-5 mt-2">
          {/* Weight input */}
          <div className="space-y-2">
            <Label htmlFor="body-weight">Body Weight</Label>
            <div className="flex gap-2">
              <Input
                id="body-weight"
                type="text"
                inputMode="decimal"
                value={weight}
                onChange={e => handleWeightChange(e.target.value)}
                placeholder="150"
                className="flex-1"
                aria-label="Body weight"
              />
              <div className="flex rounded-xl border border-input overflow-hidden">
                <button
                  onClick={() => { setUnit('lbs'); setResult(null); }}
                  className={`px-3 py-2 text-sm font-medium transition-colors ${
                    unit === 'lbs' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:text-foreground'
                  }`}
                  aria-pressed={unit === 'lbs'}
                >
                  lbs
                </button>
                <button
                  onClick={() => { setUnit('kg'); setResult(null); }}
                  className={`px-3 py-2 text-sm font-medium transition-colors ${
                    unit === 'kg' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:text-foreground'
                  }`}
                  aria-pressed={unit === 'kg'}
                >
                  kg
                </button>
              </div>
            </div>
          </div>

          {/* Activity level */}
          <div className="space-y-2">
            <Label>Activity Level</Label>
            <RadioGroup value={activity} onValueChange={v => { setActivity(v); setResult(null); }}>
              {activityLevels.map(level => (
                <div key={level.value} className="flex items-center gap-3 py-1.5">
                  <RadioGroupItem value={level.value} id={`activity-${level.value}`} />
                  <Label htmlFor={`activity-${level.value}`} className="text-sm font-normal cursor-pointer">
                    {level.label}
                    <span className="text-muted-foreground ml-1.5 text-xs">
                      (×{level.multiplier}g/lb)
                    </span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Calculate button */}
          <Button onClick={calculate} className="w-full" disabled={!weight || parseFloat(weight) <= 0}>
            Calculate
          </Button>

          {/* Result */}
          {result !== null && (
            <div className="rounded-xl bg-secondary p-4 space-y-3 animate-fade-in">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Recommended daily protein</p>
                <p className="text-3xl font-display font-semibold tracking-editorial mt-1">{result}g</p>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Current goal: {currentGoal}g — you can always edit this later.
              </p>
              <Button onClick={apply} variant="accent" className="w-full">
                Set as My Goal
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
