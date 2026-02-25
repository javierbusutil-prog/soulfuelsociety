import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lightbulb } from 'lucide-react';
import { useNutritionTrends } from '@/hooks/useNutritionTrends';
import type { CycleEntry, CycleSettings } from '@/hooks/useCycleTracker';

interface Props {
  cycleEntries: CycleEntry[];
  cycleSettings: CycleSettings | null;
}

export function SmartInsights({ cycleEntries, cycleSettings }: Props) {
  const { data, loading } = useNutritionTrends(30);

  const insights = useMemo(() => {
    const validDays = data.filter(d => d !== null);
    if (validDays.length < 14) return null;

    const results: string[] = [];

    // Protein-energy correlation
    const daysWithBoth = validDays.filter(d => d!.energy_level && d!.protein_logged > 0);
    if (daysWithBoth.length >= 7) {
      const highProteinDays = daysWithBoth.filter(d => d!.protein_logged >= d!.protein_goal);
      const lowProteinDays = daysWithBoth.filter(d => d!.protein_logged < d!.protein_goal);
      const avgEnergyHigh = highProteinDays.length > 0
        ? highProteinDays.reduce((s, d) => s + (d!.energy_level || 0), 0) / highProteinDays.length
        : 0;
      const avgEnergyLow = lowProteinDays.length > 0
        ? lowProteinDays.reduce((s, d) => s + (d!.energy_level || 0), 0) / lowProteinDays.length
        : 0;
      if (avgEnergyHigh > avgEnergyLow + 0.5) {
        results.push('You tend to have higher energy on days you hit your protein goal. Keep prioritizing protein-rich meals! 💪');
      }
    }

    // Hydration-mood correlation
    const daysWithMood = validDays.filter(d => d!.mood_level && d!.hydration_logged > 0);
    if (daysWithMood.length >= 7) {
      const hydrated = daysWithMood.filter(d => d!.hydration_logged >= d!.hydration_goal);
      const notHydrated = daysWithMood.filter(d => d!.hydration_logged < d!.hydration_goal);
      const avgMoodH = hydrated.length > 0
        ? hydrated.reduce((s, d) => s + (d!.mood_level || 0), 0) / hydrated.length
        : 0;
      const avgMoodN = notHydrated.length > 0
        ? notHydrated.reduce((s, d) => s + (d!.mood_level || 0), 0) / notHydrated.length
        : 0;
      if (avgMoodH > avgMoodN + 0.4) {
        results.push('Your mood tends to be better on well-hydrated days. Staying on top of water intake is making a difference! 💧');
      }
    }

    // Consistency insight
    const proteinMetDays = validDays.filter(d => d!.protein_logged >= d!.protein_goal).length;
    const proteinPercent = Math.round((proteinMetDays / validDays.length) * 100);
    if (proteinPercent >= 70) {
      results.push(`You've hit your protein goal ${proteinPercent}% of tracked days — that's excellent consistency. Your body is getting what it needs. 🌟`);
    } else if (proteinPercent >= 40) {
      results.push(`You're hitting your protein goal about ${proteinPercent}% of the time. Small daily improvements add up to big results over time. 🌱`);
    }

    // Cycle-phase insight (if available)
    if (cycleSettings && !cycleSettings.hide_cycle_markers && cycleEntries.length > 0) {
      results.push('Your nutrition data is synced with your cycle tracker. Phase-aware guidance is helping you fuel your body through each stage. 🌙');
    }

    return results.length > 0 ? results : null;
  }, [data, cycleEntries, cycleSettings]);

  if (loading || !insights) return null;

  return (
    <Card className="border-accent/15">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-sans font-semibold tracking-normal flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-accent" />
          Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {insights.map((insight, i) => (
          <p key={i} className="text-sm leading-relaxed text-muted-foreground">
            {insight}
          </p>
        ))}
      </CardContent>
    </Card>
  );
}
