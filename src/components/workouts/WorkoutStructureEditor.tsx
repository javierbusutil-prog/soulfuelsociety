import { useState, useEffect } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ExerciseTemplate {
  id?: string;
  name: string;
  notes: string;
  tracking_type: 'sets_reps' | 'time' | 'total_reps';
  default_sets: number;
  default_reps: string;
  default_rest: string;
  sort_order: number;
  superset_movement_name: string;
  superset_tracking_type: 'sets_reps' | 'time' | 'total_reps';
  superset_default_sets: number;
  superset_default_reps: string;
  superset_default_rest: string;
}

interface Section {
  id?: string;
  section_type: 'warmup' | 'main';
  sort_order: number;
  exercises: ExerciseTemplate[];
}

interface WorkoutStructureEditorProps {
  workoutId: string;
  onClose?: () => void;
}

export function WorkoutStructureEditor({ workoutId, onClose }: WorkoutStructureEditorProps) {
  const { toast } = useToast();
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [openSections, setOpenSections] = useState<Set<number>>(new Set([0, 1]));

  useEffect(() => {
    fetchStructure();
  }, [workoutId]);

  const fetchStructure = async () => {
    const { data: sectionsData } = await supabase
      .from('workout_sections')
      .select('*')
      .eq('workout_id', workoutId)
      .order('sort_order');

    if (sectionsData && sectionsData.length > 0) {
      const sectionIds = sectionsData.map(s => s.id);
      const { data: exercisesData } = await supabase
        .from('exercise_templates')
        .select('*')
        .in('section_id', sectionIds)
        .order('sort_order');

      const mapped: Section[] = sectionsData.map(s => ({
        id: s.id,
        section_type: s.section_type as 'warmup' | 'main',
        sort_order: s.sort_order,
        exercises: (exercisesData || [])
          .filter(e => e.section_id === s.id)
          .map(e => ({
            id: e.id,
            name: e.name,
            notes: e.notes || '',
            tracking_type: e.tracking_type as 'sets_reps' | 'time' | 'total_reps',
            default_sets: e.default_sets || 3,
            default_reps: e.default_reps || '10',
            default_rest: e.default_rest || '',
            sort_order: e.sort_order,
            superset_movement_name: e.superset_movement_name || '',
            superset_tracking_type: (e.superset_tracking_type || 'sets_reps') as 'sets_reps' | 'time' | 'total_reps',
            superset_default_sets: e.superset_default_sets || 3,
            superset_default_reps: e.superset_default_reps || '10',
            superset_default_rest: e.superset_default_rest || '',
          })),
      }));
      setSections(mapped);
    } else {
      setSections([
        { section_type: 'warmup', sort_order: 0, exercises: [] },
        { section_type: 'main', sort_order: 1, exercises: [] },
      ]);
    }
    setLoading(false);
  };

  const addExercise = (sectionIndex: number) => {
    const updated = [...sections];
    updated[sectionIndex].exercises.push({
      name: '',
      notes: '',
      tracking_type: 'sets_reps',
      default_sets: 3,
      default_reps: '10',
      default_rest: '',
      sort_order: updated[sectionIndex].exercises.length,
      superset_movement_name: '',
      superset_tracking_type: 'sets_reps',
      superset_default_sets: 3,
      superset_default_reps: '10',
      superset_default_rest: '',
    });
    setSections(updated);
    setOpenSections(prev => new Set(prev).add(sectionIndex));
  };

  const removeExercise = (sectionIndex: number, exerciseIndex: number) => {
    const updated = [...sections];
    updated[sectionIndex].exercises.splice(exerciseIndex, 1);
    updated[sectionIndex].exercises.forEach((e, i) => e.sort_order = i);
    setSections(updated);
  };

  const updateExercise = (sectionIndex: number, exerciseIndex: number, field: string, value: any) => {
    const updated = [...sections];
    (updated[sectionIndex].exercises[exerciseIndex] as any)[field] = value;
    setSections(updated);
  };

  const toggleSection = (index: number) => {
    const next = new Set(openSections);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    setOpenSections(next);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await supabase.from('workout_sections').delete().eq('workout_id', workoutId);

      for (const section of sections) {
        const { data: sectionData, error: sectionError } = await supabase
          .from('workout_sections')
          .insert({
            workout_id: workoutId,
            section_type: section.section_type,
            sort_order: section.sort_order,
          })
          .select()
          .single();

        if (sectionError) throw sectionError;

        if (section.exercises.length > 0) {
          const exerciseInserts = section.exercises.map((ex, i) => ({
            section_id: sectionData.id,
            name: ex.name.trim(),
            notes: ex.notes.trim() || null,
            tracking_type: ex.tracking_type,
            default_sets: ex.tracking_type === 'sets_reps' ? ex.default_sets : null,
            default_reps: ex.tracking_type === 'sets_reps' ? ex.default_reps : null,
            default_rest: ex.default_rest.trim() || null,
            sort_order: i,
            superset_movement_name: ex.superset_movement_name.trim() || null,
            superset_tracking_type: ex.superset_movement_name.trim() ? ex.superset_tracking_type : null,
            superset_default_sets: ex.superset_movement_name.trim() && ex.superset_tracking_type === 'sets_reps' ? ex.superset_default_sets : null,
            superset_default_reps: ex.superset_movement_name.trim() && ex.superset_tracking_type === 'sets_reps' ? ex.superset_default_reps : null,
            superset_default_rest: ex.superset_movement_name.trim() ? (ex.superset_default_rest.trim() || null) : null,
          })).filter(e => e.name);

          if (exerciseInserts.length > 0) {
            const { error: exError } = await supabase.from('exercise_templates').insert(exerciseInserts);
            if (exError) throw exError;
          }
        }
      }

      toast({ title: 'Workout structure saved!' });
      onClose?.();
    } catch (error: any) {
      toast({ title: 'Failed to save', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-4 text-center text-muted-foreground">Loading structure...</div>;
  }

  const isSupersetEnabled = (exercise: ExerciseTemplate) => !!exercise.superset_movement_name;

  return (
    <div className="space-y-4">
      {sections.map((section, sectionIndex) => (
        <Collapsible
          key={sectionIndex}
          open={openSections.has(sectionIndex)}
          onOpenChange={() => toggleSection(sectionIndex)}
        >
          <Card className="overflow-hidden">
            <CollapsibleTrigger className="w-full flex items-center justify-between p-4 hover:bg-secondary/50 transition-colors">
              <div className="flex items-center gap-2">
                <Badge variant={section.section_type === 'warmup' ? 'secondary' : 'default'}>
                  {section.section_type === 'warmup' ? '🔥 Warm-Up' : '💪 Main Workout'}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {section.exercises.length} exercise{section.exercises.length !== 1 ? 's' : ''}
                </span>
              </div>
              {openSections.has(sectionIndex) ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </CollapsibleTrigger>

            <CollapsibleContent>
              <div className="p-4 pt-0 space-y-3">
                {section.exercises.map((exercise, exIndex) => (
                  <Card key={exIndex} className="p-3 bg-secondary/30 border-border/50">
                    <div className="space-y-3">
                      {/* Exercise name + delete */}
                      <div className="flex items-start gap-2">
                        <div className="flex-1">
                          <Input
                            placeholder="Exercise name"
                            value={exercise.name}
                            onChange={(e) => updateExercise(sectionIndex, exIndex, 'name', e.target.value)}
                          />
                        </div>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => removeExercise(sectionIndex, exIndex)}
                          className="text-destructive hover:text-destructive shrink-0 mt-0.5"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      {/* Tracking config */}
                      <ExerciseTrackingConfig
                        exercise={exercise}
                        prefix=""
                        onUpdate={(field, value) => updateExercise(sectionIndex, exIndex, field, value)}
                      />

                      {/* Superset toggle */}
                      <div className="flex items-center justify-between pt-1 border-t border-border/50">
                        <Label className="text-xs font-medium text-muted-foreground">Superset</Label>
                        <Switch
                          checked={isSupersetEnabled(exercise)}
                          onCheckedChange={(checked) => {
                            if (!checked) {
                              updateExercise(sectionIndex, exIndex, 'superset_movement_name', '');
                            } else {
                              updateExercise(sectionIndex, exIndex, 'superset_movement_name', ' ');
                            }
                          }}
                        />
                      </div>

                      {/* Superset config */}
                      {isSupersetEnabled(exercise) && (
                        <div className="pl-3 border-l-2 border-primary/30 space-y-3">
                          <Badge variant="outline" className="text-[10px]">Superset Movement</Badge>
                          <Input
                            placeholder="Superset exercise name"
                            value={exercise.superset_movement_name.trim()}
                            onChange={(e) => updateExercise(sectionIndex, exIndex, 'superset_movement_name', e.target.value)}
                          />
                          <ExerciseTrackingConfig
                            exercise={exercise}
                            prefix="superset_"
                            onUpdate={(field, value) => updateExercise(sectionIndex, exIndex, field, value)}
                          />
                        </div>
                      )}

                      <Textarea
                        placeholder="Notes/cues (optional)"
                        className="text-xs min-h-[40px]"
                        value={exercise.notes}
                        onChange={(e) => updateExercise(sectionIndex, exIndex, 'notes', e.target.value)}
                        rows={1}
                      />
                    </div>
                  </Card>
                ))}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addExercise(sectionIndex)}
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Exercise
                </Button>
              </div>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      ))}

      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={saving} className="flex-1">
          {saving ? 'Saving...' : 'Save Structure'}
        </Button>
        {onClose && (
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}

/** Reusable tracking config for both main exercise and superset */
function ExerciseTrackingConfig({
  exercise,
  prefix,
  onUpdate,
}: {
  exercise: any;
  prefix: string; // '' for main, 'superset_' for superset
  onUpdate: (field: string, value: any) => void;
}) {
  const trackingType = exercise[`${prefix}tracking_type`] || 'sets_reps';
  const sets = exercise[`${prefix}default_sets`] || 3;
  const reps = exercise[`${prefix}default_reps`] || '10';
  const rest = exercise[`${prefix}default_rest`] || '';

  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs text-muted-foreground">Tracking</Label>
          <Select
            value={trackingType}
            onValueChange={(v) => onUpdate(`${prefix}tracking_type`, v)}
          >
            <SelectTrigger className="h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sets_reps">Sets × Reps</SelectItem>
              <SelectItem value="time">For Time</SelectItem>
              <SelectItem value="total_reps">Total Reps</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {trackingType === 'sets_reps' && (
          <div>
            <Label className="text-xs text-muted-foreground">Sets</Label>
            <Input
              type="number"
              min={1}
              className="h-9 text-xs"
              value={sets}
              onChange={(e) => onUpdate(`${prefix}default_sets`, parseInt(e.target.value) || 1)}
            />
          </div>
        )}
      </div>

      {trackingType === 'sets_reps' && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs text-muted-foreground">Reps</Label>
            <Input
              className="h-9 text-xs"
              placeholder="e.g., 10 or 8-12"
              value={reps}
              onChange={(e) => onUpdate(`${prefix}default_reps`, e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Rest</Label>
            <Input
              className="h-9 text-xs"
              placeholder="e.g., 60s"
              value={rest}
              onChange={(e) => onUpdate(`${prefix}default_rest`, e.target.value)}
            />
          </div>
        </div>
      )}
    </>
  );
}
