import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNutritionTrends } from '@/hooks/useNutritionTrends';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, LineChart, Line, CartesianGrid } from 'recharts';

export function WeeklyTrends() {
  const { data, labels, loading } = useNutritionTrends(7);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Loading trends…
        </CardContent>
      </Card>
    );
  }

  const chartData = labels.map((day, i) => {
    const entry = data[i];
    return {
      day,
      protein: entry?.protein_logged ?? 0,
      proteinGoal: entry?.protein_goal ?? 120,
      hydration: entry?.hydration_logged ?? 0,
      hydrationGoal: entry?.hydration_goal ?? 64,
      energy: entry?.energy_level ?? null,
      mood: entry?.mood_level ?? null,
    };
  });

  const hasAnyData = data.some(d => d !== null);

  if (!hasAnyData) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-sans font-semibold tracking-normal">Weekly Trends</CardTitle>
        </CardHeader>
        <CardContent className="py-6 text-center text-sm text-muted-foreground">
          Start logging to see your trends here.
        </CardContent>
      </Card>
    );
  }

  const tooltipStyle = {
    contentStyle: {
      background: 'hsl(var(--card))',
      border: '1px solid hsl(var(--border))',
      borderRadius: '0.75rem',
      fontSize: '12px',
      padding: '8px 12px',
    },
    labelStyle: { fontWeight: 600, marginBottom: 4 },
  };

  return (
    <div className="space-y-4">
      {/* Protein */}
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-sm font-sans font-semibold tracking-normal">Protein (7 days)</CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="h-36">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barCategoryGap="25%">
                <XAxis dataKey="day" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis hide />
                <Tooltip
                  {...tooltipStyle}
                  formatter={(value: number, name: string) => [
                    `${value}g`,
                    name === 'protein' ? 'Logged' : 'Goal',
                  ]}
                />
                <Bar dataKey="proteinGoal" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="protein" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Hydration */}
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-sm font-sans font-semibold tracking-normal">Hydration (7 days)</CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="h-36">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barCategoryGap="25%">
                <XAxis dataKey="day" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis hide />
                <Tooltip
                  {...tooltipStyle}
                  formatter={(value: number, name: string) => [
                    `${value}oz`,
                    name === 'hydration' ? 'Logged' : 'Goal',
                  ]}
                />
                <Bar dataKey="hydrationGoal" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="hydration" fill="hsl(196 80% 50%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Energy & Mood */}
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-sm font-sans font-semibold tracking-normal">Energy & Mood (7 days)</CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="h-36">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} hide />
                <Tooltip
                  {...tooltipStyle}
                  formatter={(value: number | null, name: string) => {
                    if (value === null) return ['—', name];
                    const energyLabels = ['Low', 'Low-Med', 'Moderate', 'Med-High', 'High'];
                    const moodLabels = ['Drained', 'Low', 'Balanced', 'Good', 'Strong'];
                    const label = name === 'energy'
                      ? energyLabels[value - 1] || value
                      : moodLabels[value - 1] || value;
                    return [label, name === 'energy' ? 'Energy' : 'Mood'];
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="energy"
                  stroke="hsl(var(--warning))"
                  strokeWidth={2}
                  dot={{ r: 3, fill: 'hsl(var(--warning))' }}
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="mood"
                  stroke="hsl(var(--success))"
                  strokeWidth={2}
                  dot={{ r: 3, fill: 'hsl(var(--success))' }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-4 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-warning" /> Energy
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-success" /> Mood
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
