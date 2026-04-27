import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dumbbell, Eye, EyeOff } from 'lucide-react';
import { useWorkoutPrograms } from '@/hooks/useWorkoutPrograms';
import { CreateProgramDialog } from '@/components/workouts/CreateProgramDialog';
import { ProgramAccessType, WorkoutProgram } from '@/types/workoutPrograms';
import { toast } from '@/hooks/use-toast';
import { useState } from 'react';

const ACCESS_LABEL: Record<ProgramAccessType, string> = {
  free: 'Free',
  membership: 'Members',
  one_time_purchase: 'Standalone',
};

function formatPrice(cents: number | null) {
  if (cents == null) return null;
  return `$${(cents / 100).toFixed(2)}`;
}

export default function AdminPrograms() {
  const { programs, loading, createProgram, updateProgram } = useWorkoutPrograms();
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const togglePublished = async (program: WorkoutProgram) => {
    setTogglingId(program.id);
    try {
      await updateProgram(program.id, { published: !program.published });
      toast({ title: program.published ? 'Program unpublished' : 'Program published' });
    } catch {
      toast({ title: 'Failed to update program', variant: 'destructive' });
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <AdminLayout title="Programs">
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Workout Programs</h2>
          <CreateProgramDialog onProgramCreated={createProgram} />
        </div>

        {loading ? (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              Loading programs...
            </CardContent>
          </Card>
        ) : programs.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center space-y-3">
              <Dumbbell className="w-10 h-10 mx-auto text-muted-foreground/50" />
              <p className="text-muted-foreground text-sm">
                No programs yet. Create your first program to get started.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {programs.map(program => {
              const accessLabel = ACCESS_LABEL[program.access_type] ?? 'Members';
              const price = formatPrice(program.price_cents);
              return (
                <Card key={program.id}>
                  <CardContent className="p-4 flex items-start justify-between gap-4">
                    <div className="space-y-2 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-medium text-foreground truncate">{program.title}</h3>
                        <Badge
                          variant="outline"
                          className={
                            program.published
                              ? 'border-emerald-500/50 text-emerald-600 bg-emerald-500/10'
                              : 'border-muted-foreground/30 text-muted-foreground bg-muted/30'
                          }
                        >
                          {program.published ? 'Live' : 'Draft'}
                        </Badge>
                        <Badge variant="secondary">
                          {accessLabel}{program.access_type === 'one_time_purchase' && price ? ` · ${price}` : ''}
                        </Badge>
                      </div>
                      {program.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{program.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {program.weeks} weeks · {program.frequency_per_week}× per week
                      </p>
                    </div>
                    <Button
                      variant={program.published ? 'outline' : 'default'}
                      size="sm"
                      onClick={() => togglePublished(program)}
                      disabled={togglingId === program.id}
                      className="shrink-0"
                    >
                      {program.published ? (
                        <>
                          <EyeOff className="w-4 h-4 mr-1.5" />
                          Unpublish
                        </>
                      ) : (
                        <>
                          <Eye className="w-4 h-4 mr-1.5" />
                          Publish
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
