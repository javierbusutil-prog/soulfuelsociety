import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});

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

  const handleAccessTypeChange = async (program: WorkoutProgram, value: ProgramAccessType) => {
    try {
      await updateProgram(program.id, { access_type: value });
      toast({ title: 'Access type updated' });
    } catch {
      toast({ title: 'Failed to update access type', variant: 'destructive' });
    }
  };

  const handlePriceBlur = async (program: WorkoutProgram) => {
    const raw = priceDrafts[program.id];
    if (raw === undefined) return;
    const dollars = parseFloat(raw);
    const newCents = isNaN(dollars) ? null : Math.round(dollars * 100);
    if (newCents === program.price_cents) return;
    try {
      await updateProgram(program.id, { price_cents: newCents });
      toast({ title: 'Price updated' });
    } catch {
      toast({ title: 'Failed to update price', variant: 'destructive' });
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
              const priceValue =
                priceDrafts[program.id] ??
                (program.price_cents != null ? (program.price_cents / 100).toFixed(2) : '');
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
                      <div className="flex flex-wrap items-end gap-3 pt-2">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Access type</Label>
                          <Select
                            value={program.access_type}
                            onValueChange={(v) =>
                              handleAccessTypeChange(program, v as ProgramAccessType)
                            }
                          >
                            <SelectTrigger className="h-8 w-[180px] text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="free">Free</SelectItem>
                              <SelectItem value="membership">Members</SelectItem>
                              <SelectItem value="one_time_purchase">Standalone</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {program.access_type === 'one_time_purchase' && (
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Price (USD)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                              value={priceValue}
                              onChange={(e) =>
                                setPriceDrafts((prev) => ({
                                  ...prev,
                                  [program.id]: e.target.value,
                                }))
                              }
                              onBlur={() => handlePriceBlur(program)}
                              className="h-8 w-28 text-xs"
                            />
                          </div>
                        )}
                      </div>
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
