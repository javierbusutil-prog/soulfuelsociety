import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format, subDays, addDays, isToday, parseISO } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AppLayout } from '@/components/layout/AppLayout';
import { useNutrition } from '@/hooks/useNutrition';
import { useFastingSessions } from '@/hooks/useFastingSessions';
import { useCycleTracker } from '@/hooks/useCycleTracker';
import { DailyHabits } from '@/components/nutrition/DailyHabits';
import { ProteinTracker } from '@/components/nutrition/ProteinTracker';
import { HydrationTracker } from '@/components/nutrition/HydrationTracker';
import { EnergyMoodCheckin } from '@/components/nutrition/EnergyMoodCheckin';
import { ConsistencyRing } from '@/components/nutrition/ConsistencyRing';
import { WeeklyTrends } from '@/components/nutrition/WeeklyTrends';
import { CyclePhaseGuidance } from '@/components/nutrition/CyclePhaseGuidance';
import { MealStructureTracker } from '@/components/nutrition/MealStructureTracker';
import { WeeklyReflection } from '@/components/nutrition/WeeklyReflection';
import { SmartInsights } from '@/components/nutrition/SmartInsights';

export default function Nutrition() {
  const [searchParams] = useSearchParams();
  const initialDate = searchParams.get('date');

  const [selectedDate, setSelectedDate] = useState<Date>(
    initialDate ? parseISO(initialDate) : new Date()
  );

  const nutrition = useNutrition(selectedDate);
  const { getSessionsForDate } = useFastingSessions();
  const { entries: cycleEntries, settings: cycleSettings } = useCycleTracker();

  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const fastCompleted = getSessionsForDate(selectedDate).length > 0;
  const cycleLogged = cycleEntries.some(e => e.date === dateStr);
  const cycleEnabled = !!cycleSettings && !cycleSettings.hide_cycle_markers;

  const proteinMet = (nutrition.entry?.protein_logged || 0) >= (nutrition.entry?.protein_goal || 120);
  const hydrationMet = (nutrition.entry?.hydration_logged || 0) >= (nutrition.entry?.hydration_goal || 64);

  const goBack = () => setSelectedDate(d => subDays(d, 1));
  const goForward = () => setSelectedDate(d => addDays(d, 1));
  const goToday = () => setSelectedDate(new Date());

  return (
    <AppLayout title="Nutrition">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-6 animate-fade-in">
        {/* Date navigation */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon-sm" onClick={goBack} aria-label="Previous day">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="text-center">
            <h1 className="text-2xl font-display tracking-editorial">Daily Fuel</h1>
            <button
              onClick={goToday}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {isToday(selectedDate)
                ? 'Today'
                : format(selectedDate, 'EEE, MMM d')}
            </button>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={goForward}
            disabled={isToday(selectedDate)}
            aria-label="Next day"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Cycle Phase Guidance */}
        <CyclePhaseGuidance
          cycleEntries={cycleEntries}
          cycleSettings={cycleSettings}
          selectedDate={selectedDate}
        />

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

        {/* Meal Structure Tracking */}
        <MealStructureTracker selectedDate={selectedDate} />

        <EnergyMoodCheckin
          entry={nutrition.entry}
          setCheckin={nutrition.setCheckin}
        />

        {/* Weekly Reflection */}
        <WeeklyReflection />

        {/* Smart Insights (shows after 14+ days of data) */}
        <SmartInsights
          cycleEntries={cycleEntries}
          cycleSettings={cycleSettings}
        />

        <WeeklyTrends />
      </div>
    </AppLayout>
  );
}
