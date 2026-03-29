import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Calculator, Save, RefreshCw, ChevronDown, ChevronUp, Droplets, Flame, Beef, Wheat, Salad, Info } from 'lucide-react';
import { useMacroTargets } from '@/hooks/useMacroTargets';
import { NutritionDisclaimerLabel } from '@/components/nutrition/NutritionDisclaimerLabel';

/* ── Constants ────────────────────────────────── */

const GOALS = [
  { value: 'lose', label: 'Lose Fat' },
  { value: 'maintain', label: 'Maintain' },
  { value: 'build', label: 'Build Muscle' },
] as const;

const ACTIVITY_LEVELS = [
  { value: 'sedentary', label: 'Sedentary', desc: 'Little to no exercise', simple: 13, advanced: 1.2 },
  { value: 'light', label: 'Light', desc: '1–3 days/week', simple: 14, advanced: 1.375 },
  { value: 'moderate', label: 'Moderate', desc: '3–5 days/week', simple: 15, advanced: 1.55 },
  { value: 'very_active', label: 'Very Active', desc: '6–7 days/week', simple: 16, advanced: 1.725 },
  { value: 'athlete', label: 'Athlete', desc: '2x/day or intense training', simple: 17, advanced: 1.9 },
] as const;

const GOAL_CALORIE_ADJ = { lose: -0.15, maintain: 0, build: 0.10 };
const GOAL_PROTEIN_MULT = { lose: 1.0, maintain: 0.85, build: 0.9 };

type Sex = 'female' | 'male';

/* ── Cycle Phase Definitions ─────────────────── */

const CYCLE_PHASES = [
  {
    value: 'menstrual',
    label: 'Menstrual',
    icon: '🌑',
    days: 'Days 1–5',
    desc: 'Energy often lower — honor rest.',
    defaultAdj: 0,
    range: [-3, 0],
  },
  {
    value: 'follicular',
    label: 'Follicular',
    icon: '🌱',
    days: 'Days 6–13',
    desc: 'Energy rising — strength improves.',
    defaultAdj: 0,
    range: [0, 0],
  },
  {
    value: 'ovulation',
    label: 'Ovulation',
    icon: '☀️',
    days: 'Days 14–16',
    desc: 'Peak power & confidence.',
    defaultAdj: 0,
    range: [0, 3],
  },
  {
    value: 'luteal',
    label: 'Luteal',
    icon: '🌙',
    days: 'Days 17–28',
    desc: 'Metabolism rises naturally — fuel accordingly.',
    defaultAdj: 6,
    range: [5, 8],
  },
] as const;

/* ── Helpers ──────────────────────────────────── */

const goalLabel = (g: string) => GOALS.find(x => x.value === g)?.label || g;
const actLabel = (a: string) => ACTIVITY_LEVELS.find(x => x.value === a)?.label || a;
const phaseObj = (v: string) => CYCLE_PHASES.find(p => p.value === v) || CYCLE_PHASES[1];
const range = (n: number) => ({ low: Math.round(n * 0.95), high: Math.round(n * 1.05) });

function applyPhaseAdj(baseCal: number, phasePct: number) {
  return Math.round(baseCal * (1 + phasePct / 100));
}

/* ── Main Component ──────────────────────────── */

export function MacroCalculator() {
  const { targets: savedTargets, saveTargets } = useMacroTargets();

  // Inputs
  const [weight, setWeight] = useState('');
  const [unit, setUnit] = useState<'lbs' | 'kg'>('lbs');
  const [goal, setGoal] = useState<string>('maintain');
  const [activity, setActivity] = useState<string>('moderate');
  const [advanced, setAdvanced] = useState(false);
  const [sex, setSex] = useState<Sex>('female');
  const [age, setAge] = useState('');
  const [height, setHeight] = useState('');
  const [heightUnit, setHeightUnit] = useState<'in' | 'cm'>('in');
  const [showResults, setShowResults] = useState(false);
  const [showSaved, setShowSaved] = useState(true);

  // Cycle adjustment
  const [cycleEnabled, setCycleEnabled] = useState(false);
  const [cyclePhase, setCyclePhase] = useState<string>('follicular');
  const [cycleAdjPct, setCycleAdjPct] = useState(0);

  // When phase changes, update default adjustment
  const handlePhaseChange = (v: string) => {
    setCyclePhase(v);
    const p = phaseObj(v);
    setCycleAdjPct(p.defaultAdj);
  };

  const handleCycleToggle = (on: boolean) => {
    setCycleEnabled(on);
    if (on) {
      const p = phaseObj(cyclePhase);
      setCycleAdjPct(p.defaultAdj);
    } else {
      setCycleAdjPct(0);
    }
  };

  // Conversions
  const weightLbs = useMemo(() => {
    const w = parseFloat(weight);
    if (!w || w <= 0) return 0;
    return unit === 'kg' ? w * 2.20462 : w;
  }, [weight, unit]);

  const weightKg = useMemo(() => {
    const w = parseFloat(weight);
    if (!w || w <= 0) return 0;
    return unit === 'lbs' ? w / 2.20462 : w;
  }, [weight, unit]);

  const heightCm = useMemo(() => {
    const h = parseFloat(height);
    if (!h || h <= 0) return 0;
    return heightUnit === 'in' ? h * 2.54 : h;
  }, [height, heightUnit]);

  // Core calculation (base, before cycle adj)
  const baseResults = useMemo(() => {
    if (weightLbs <= 0) return null;
    const actLevel = ACTIVITY_LEVELS.find(a => a.value === activity);
    if (!actLevel) return null;
    const goalKey = goal as keyof typeof GOAL_CALORIE_ADJ;

    let maintenance: number;
    let methodUsed = 'simple';

    if (advanced && parseFloat(age) > 0 && heightCm > 0) {
      methodUsed = 'advanced';
      const bmr = sex === 'male'
        ? (10 * weightKg) + (6.25 * heightCm) - (5 * parseFloat(age)) + 5
        : (10 * weightKg) + (6.25 * heightCm) - (5 * parseFloat(age)) - 161;
      maintenance = bmr * actLevel.advanced;
    } else {
      maintenance = weightLbs * actLevel.simple;
    }

    const calories = Math.round(maintenance * (1 + GOAL_CALORIE_ADJ[goalKey]));
    const proteinG = Math.round(weightLbs * GOAL_PROTEIN_MULT[goalKey]);
    const fiberG = Math.round((calories / 1000) * 14);
    const waterOz = Math.round(weightLbs / 2);

    return { calories, proteinG, fiberG, waterOz, methodUsed };
  }, [weightLbs, weightKg, heightCm, goal, activity, advanced, sex, age]);

  // Final results with cycle adjustment applied
  const results = useMemo(() => {
    if (!baseResults) return null;

    const adjPct = cycleEnabled ? cycleAdjPct : 0;
    const calories = applyPhaseAdj(baseResults.calories, adjPct);
    const proteinG = baseResults.proteinG; // anchored to bodyweight

    let fatG = Math.round((calories * 0.27) / 9);
    const fatMin = Math.round(weightLbs * 0.3);
    if (fatG < fatMin) fatG = fatMin;

    const carbG = Math.max(Math.round((calories - (proteinG * 4) - (fatG * 9)) / 4), 0);
    const fiberG = Math.round((calories / 1000) * 14);

    return {
      calories,
      baseCal: baseResults.calories,
      proteinG,
      carbG,
      fatG,
      fiberG,
      waterOz: baseResults.waterOz,
      methodUsed: baseResults.methodUsed,
      cycleAdjApplied: cycleEnabled && adjPct !== 0,
      adjPct,
    };
  }, [baseResults, cycleEnabled, cycleAdjPct, weightLbs]);

  const calculate = () => { if (results) setShowResults(true); };

  const handleSave = async () => {
    if (!results) return;
    await saveTargets({
      calorie_target: results.calories,
      protein_target_g: results.proteinG,
      carb_target_g: results.carbG,
      fat_target_g: results.fatG,
      fiber_target_g: results.fiberG,
      water_target_oz: results.waterOz,
      goal,
      activity_level: activity,
      method_used: results.methodUsed,
      cycle_adjustment_enabled: cycleEnabled,
      current_cycle_phase: cyclePhase,
      cycle_adjustment_percentage: cycleEnabled ? cycleAdjPct : 0,
    } as any);
    setShowResults(false);
  };

  const recalculate = () => setShowResults(false);

  const handleAdjust = () => {
    // Pre-fill from saved targets so user can tweak
    if (savedTargets) {
      setGoal(savedTargets.goal || 'maintain');
      setActivity(savedTargets.activity_level || 'moderate');
      setCycleEnabled(savedTargets.cycle_adjustment_enabled || false);
      setCyclePhase(savedTargets.current_cycle_phase || 'follicular');
      setCycleAdjPct(savedTargets.cycle_adjustment_percentage || 0);
      setAdvanced(savedTargets.method_used === 'advanced');
    }
    setShowResults(false);
  };

  const canCalculate = weightLbs > 0 && (!advanced || (parseFloat(age) > 0 && heightCm > 0));

  return (
    <div className="space-y-4">
      {/* ── Saved Targets ── */}
      {savedTargets && (
        <Card className="border-primary/20">
          <CardHeader className="pb-3 cursor-pointer" onClick={() => setShowSaved(!showSaved)}>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Your Current Targets</CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  {goalLabel(savedTargets.goal)} · {actLabel(savedTargets.activity_level)}
                  {savedTargets.cycle_adjustment_enabled && (
                    <span className="ml-1.5">· {phaseObj(savedTargets.current_cycle_phase).icon} {phaseObj(savedTargets.current_cycle_phase).label}</span>
                  )}
                </CardDescription>
              </div>
              {showSaved ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </div>
          </CardHeader>
          {showSaved && (
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 gap-3">
                <TargetPill icon={<Flame className="w-3.5 h-3.5" />} label="Calories" value={`${savedTargets.calorie_target}`} unit="kcal" />
                <TargetPill icon={<Beef className="w-3.5 h-3.5" />} label="Protein" value={`${savedTargets.protein_target_g}`} unit="g" />
                <TargetPill icon={<Wheat className="w-3.5 h-3.5" />} label="Carbs" value={`${savedTargets.carb_target_g}`} unit="g" />
                <TargetPill icon={<Droplets className="w-3.5 h-3.5" />} label="Fats" value={`${savedTargets.fat_target_g}`} unit="g" />
              </div>
              <div className="flex gap-3 mt-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Salad className="w-3 h-3" /> Fiber: {savedTargets.fiber_target_g}g</span>
                <span className="flex items-center gap-1"><Droplets className="w-3 h-3" /> Water: {savedTargets.water_target_oz} oz</span>
              </div>
              {savedTargets.cycle_adjustment_enabled && savedTargets.cycle_adjustment_percentage !== 0 && (
                <div className="mt-3 text-xs text-muted-foreground bg-secondary/50 rounded-lg px-3 py-2 flex items-center gap-1.5">
                  <span>{phaseObj(savedTargets.current_cycle_phase).icon}</span>
                  Cycle adjusted {savedTargets.cycle_adjustment_percentage > 0 ? '+' : ''}{savedTargets.cycle_adjustment_percentage}% for {phaseObj(savedTargets.current_cycle_phase).label} Phase
                </div>
              )}
              <Button variant="outline" size="sm" onClick={handleAdjust} className="w-full mt-3 gap-1.5 text-xs">
                <RefreshCw className="w-3 h-3" /> Adjust Targets
              </Button>
            </CardContent>
          )}
        </Card>
      )}

      {/* ── Calculator ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-primary" />
            <div>
              <CardTitle className="text-lg">Macro Calculator</CardTitle>
              <CardDescription>Calculate your personalized calorie and macro targets.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {!showResults ? (
            <>
              {/* Weight */}
              <div className="space-y-2">
                <Label>Weight</Label>
                <div className="flex gap-2">
                  <Input
                    type="text" inputMode="decimal"
                    value={weight}
                    onChange={e => { if (/^\d{0,4}(\.\d{0,1})?$/.test(e.target.value)) setWeight(e.target.value); }}
                    placeholder={unit === 'lbs' ? '150' : '68'}
                    className="flex-1"
                  />
                  <UnitToggle value={unit} options={['lbs', 'kg']} onChange={v => setUnit(v as any)} />
                </div>
              </div>

              {/* Goal */}
              <div className="space-y-2">
                <Label>Goal</Label>
                <div className="grid grid-cols-3 gap-2">
                  {GOALS.map(g => (
                    <button
                      key={g.value} onClick={() => setGoal(g.value)}
                      className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                        goal === g.value ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-foreground border-input hover:bg-secondary'
                      }`}
                    >{g.label}</button>
                  ))}
                </div>
              </div>

              {/* Activity */}
              <div className="space-y-2">
                <Label>Activity Level</Label>
                <Select value={activity} onValueChange={setActivity}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ACTIVITY_LEVELS.map(a => (
                      <SelectItem key={a.value} value={a.value}>
                        <span className="font-medium">{a.label}</span>
                        <span className="text-muted-foreground ml-1.5 text-xs">({a.desc})</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Advanced toggle */}
              <div className="flex items-center justify-between rounded-xl bg-secondary/50 p-3">
                <div>
                  <p className="text-sm font-medium">Use Advanced Calculation</p>
                  <p className="text-xs text-muted-foreground">Mifflin-St Jeor formula</p>
                </div>
                <Switch checked={advanced} onCheckedChange={setAdvanced} />
              </div>

              {advanced && (
                <div className="space-y-4 animate-fade-in">
                  <div className="space-y-2">
                    <Label>Sex</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['female', 'male'] as Sex[]).map(s => (
                        <button key={s} onClick={() => setSex(s)}
                          className={`rounded-xl border px-3 py-2.5 text-sm font-medium capitalize transition-colors ${
                            sex === s ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-foreground border-input hover:bg-secondary'
                          }`}
                        >{s}</button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Age</Label>
                    <Input type="text" inputMode="numeric" value={age}
                      onChange={e => { if (/^\d{0,3}$/.test(e.target.value)) setAge(e.target.value); }}
                      placeholder="30" />
                  </div>
                  <div className="space-y-2">
                    <Label>Height</Label>
                    <div className="flex gap-2">
                      <Input type="text" inputMode="decimal" value={height}
                        onChange={e => { if (/^\d{0,3}(\.\d{0,1})?$/.test(e.target.value)) setHeight(e.target.value); }}
                        placeholder={heightUnit === 'in' ? '65' : '165'} className="flex-1" />
                      <UnitToggle value={heightUnit} options={['in', 'cm']} onChange={v => setHeightUnit(v as any)} />
                    </div>
                  </div>
                </div>
              )}

              {/* ── Cycle Phase Adjustment ── */}
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-xl bg-secondary/50 p-3">
                  <div className="flex items-center gap-2">
                    <div>
                      <p className="text-sm font-medium">Adjust for cycle phase</p>
                      <p className="text-xs text-muted-foreground">Optional calorie tuning</p>
                    </div>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Cycle adjustment info">
                            <Info className="w-3.5 h-3.5" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[280px] text-xs leading-relaxed">
                          Your metabolism and energy needs fluctuate slightly throughout your cycle. Some women naturally burn 100–300 more calories during the luteal phase. This adjustment supports recovery, reduces cravings, and promotes hormonal balance.
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Switch checked={cycleEnabled} onCheckedChange={handleCycleToggle} />
                </div>

                {cycleEnabled && (
                  <div className="space-y-3 animate-fade-in pl-1">
                    <Label className="text-xs text-muted-foreground">Select your current phase</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {CYCLE_PHASES.map(p => (
                        <button
                          key={p.value}
                          onClick={() => handlePhaseChange(p.value)}
                          className={`flex items-start gap-2 rounded-xl border p-3 text-left transition-colors ${
                            cyclePhase === p.value
                              ? 'bg-primary/5 border-primary/40'
                              : 'bg-background border-input hover:bg-secondary/50'
                          }`}
                        >
                          <span className="text-base mt-0.5">{p.icon}</span>
                          <div className="min-w-0">
                            <p className={`text-sm font-medium ${cyclePhase === p.value ? 'text-primary' : ''}`}>{p.label}</p>
                            <p className="text-[11px] text-muted-foreground leading-tight">{p.days}</p>
                            {p.defaultAdj !== 0 && cyclePhase === p.value && (
                              <span className="inline-block mt-1 text-[10px] font-medium text-accent bg-accent/10 rounded-full px-2 py-0.5">
                                +{p.defaultAdj}% calories
                              </span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <Button onClick={calculate} className="w-full" disabled={!canCalculate}>
                Calculate
              </Button>
            </>
          ) : results ? (
            <div className="space-y-5 animate-fade-in">
              <p className="text-sm text-muted-foreground text-center">
                Here's a personalized starting point — feel free to adjust as you learn what works for your body.
              </p>

              <div className="space-y-3">
                <div>
                  <ResultRow icon={<Flame className="w-4 h-4 text-accent" />} label="Daily Calories" value={range(results.calories)} unit="kcal" highlight />
                  {results.cycleAdjApplied && (
                    <p className="text-[11px] text-muted-foreground mt-1 ml-7 flex items-center gap-1">
                      <span>{phaseObj(cyclePhase).icon}</span>
                      Adjusted {results.adjPct > 0 ? '+' : ''}{results.adjPct}% for {phaseObj(cyclePhase).label} Phase
                      <span className="text-muted-foreground/60">(base {results.baseCal})</span>
                    </p>
                  )}
                </div>
                <ResultRow icon={<Beef className="w-4 h-4 text-primary" />} label="Protein" value={range(results.proteinG)} unit="g" />
                <ResultRow icon={<Wheat className="w-4 h-4 text-primary" />} label="Carbs" value={range(results.carbG)} unit="g" />
                <ResultRow icon={<Droplets className="w-4 h-4 text-primary" />} label="Fats" value={range(results.fatG)} unit="g" />
              </div>

              <div className="rounded-xl bg-secondary/50 p-3 space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-muted-foreground"><Salad className="w-3.5 h-3.5" /> Fiber target</span>
                  <span className="font-medium">{results.fiberG}g/day</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-muted-foreground"><Droplets className="w-3.5 h-3.5" /> Water estimate</span>
                  <span className="font-medium">{results.waterOz} oz/day</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={recalculate} className="flex-1 gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5" /> Recalculate
                </Button>
                <Button variant="accent" onClick={handleSave} className="flex-1 gap-1.5">
                  <Save className="w-3.5 h-3.5" /> Save to My Targets
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
      <NutritionDisclaimerLabel />
    </div>
  );
}

/* ── Sub-components ──────────────────────────── */

function UnitToggle({ value, options, onChange }: { value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div className="flex rounded-xl border border-input overflow-hidden">
      {options.map(o => (
        <button key={o} onClick={() => onChange(o)}
          className={`px-3 py-2 text-sm font-medium transition-colors ${
            value === o ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:text-foreground'
          }`}
        >{o}</button>
      ))}
    </div>
  );
}

function TargetPill({ icon, label, value, unit }: { icon: React.ReactNode; label: string; value: string; unit: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-secondary/60 px-3 py-2.5">
      {icon}
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold">{value}<span className="text-xs font-normal text-muted-foreground ml-0.5">{unit}</span></p>
      </div>
    </div>
  );
}

function ResultRow({ icon, label, value, unit, highlight }: { icon: React.ReactNode; label: string; value: { low: number; high: number }; unit: string; highlight?: boolean }) {
  return (
    <div className={`flex items-center justify-between rounded-xl p-3 ${highlight ? 'bg-accent/10 border border-accent/20' : 'bg-secondary/40'}`}>
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm font-medium">{label}</span>
      </div>
      <span className={`font-display text-lg tracking-editorial ${highlight ? 'text-accent font-semibold' : 'font-medium'}`}>
        {value.low}–{value.high}<span className="text-xs text-muted-foreground ml-0.5">{unit}</span>
      </span>
    </div>
  );
}
