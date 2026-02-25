import { AppLayout } from '@/components/layout/AppLayout';
import { useNutrition } from '@/hooks/useNutrition';
import { useFastingSessions } from '@/hooks/useFastingSessions';
import { useCycleTracker } from '@/hooks/useCycleTracker';
import { DailyHabits } from '@/components/nutrition/DailyHabits';
import { ProteinTracker } from '@/components/nutrition/ProteinTracker';
import { HydrationTracker } from '@/components/nutrition/HydrationTracker';
import { EnergyMoodCheckin } from '@/components/nutrition/EnergyMoodCheckin';
import { ConsistencyRing } from '@/components/nutrition/ConsistencyRing';

export default function Nutrition() {
  const nutrition = useNutrition();
  const { completedSessions, getSessionsForDate } = useFastingSessions();
  const { entries: cycleEntries, settings: cycleSettings } = useCycleTracker();

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const fastCompleted = getSessionsForDate(today).length > 0;
  const cycleLogged = cycleEntries.some(e => e.date === todayStr);
  const cycleEnabled = !!cycleSettings && !cycleSettings.hide_cycle_markers;

  // Consistency ring data
  const proteinMet = (nutrition.entry?.protein_logged || 0) >= (nutrition.entry?.protein_goal || 120);
  const hydrationMet = (nutrition.entry?.hydration_logged || 0) >= (nutrition.entry?.hydration_goal || 64);

  return (
    <AppLayout title="Nutrition">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-6 animate-fade-in">
        <header>
          <h1 className="text-2xl font-display tracking-editorial">Daily Fuel</h1>
          <p className="text-sm text-muted-foreground mt-1">Simple habits, real results.</p>
        </header>

        <ConsistencyRing
          proteinMet={proteinMet}
          hydrationMet={hydrationMet}
          fastCompleted={fastCompleted}
          cycleLogged={cycleLogged}
          cycleEnabled={cycleEnabled}
          streak={nutrition.streak}
        />

        <DailyHabits
          entry={nutrition.entry}
          toggleHabit={nutrition.toggleHabit}
          fastCompleted={fastCompleted}
          cycleLogged={cycleLogged}
          cycleEnabled={cycleEnabled}
          proteinMet={proteinMet}
          hydrationMet={hydrationMet}
        />

        <ProteinTracker
          entry={nutrition.entry}
          addProtein={nutrition.addProtein}
          setGoal={nutrition.setGoal}
        />

        <HydrationTracker
          entry={nutrition.entry}
          addWater={nutrition.addWater}
          toggleHabit={nutrition.toggleHabit}
          setGoal={nutrition.setGoal}
        />

        <EnergyMoodCheckin
          entry={nutrition.entry}
          setCheckin={nutrition.setCheckin}
        />
      </div>
    </AppLayout>
  );
}
