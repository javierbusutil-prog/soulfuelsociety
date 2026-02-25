import { useState, useEffect } from 'react';
import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Workout, WorkoutLevel, WorkoutType } from '@/types/database';

interface EditWorkoutDialogProps {
  workout: Workout;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onWorkoutUpdated: () => void;
}

export function EditWorkoutDialog({ workout, open, onOpenChange, onWorkoutUpdated }: EditWorkoutDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    level: 'beginner' as WorkoutLevel,
    workout_type: 'strength' as WorkoutType,
    duration_minutes: 30,
    equipment: '',
    coaching_notes: '',
    is_featured: false,
  });

  useEffect(() => {
    if (open && workout) {
      setFormData({
        title: workout.title,
        description: workout.description || '',
        level: workout.level,
        workout_type: workout.workout_type,
        duration_minutes: workout.duration_minutes,
        equipment: workout.equipment?.join(', ') || '',
        coaching_notes: workout.coaching_notes || '',
        is_featured: workout.is_featured,
      });
    }
  }, [open, workout]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast({ title: 'Title is required', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const equipmentArray = formData.equipment
        .split(',')
        .map(e => e.trim())
        .filter(e => e.length > 0);

      const { error } = await supabase
        .from('workouts')
        .update({
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          level: formData.level,
          workout_type: formData.workout_type,
          duration_minutes: formData.duration_minutes,
          equipment: equipmentArray.length > 0 ? equipmentArray : null,
          coaching_notes: formData.coaching_notes.trim() || null,
          is_featured: formData.is_featured,
        })
        .eq('id', workout.id);

      if (error) throw error;

      toast({ title: 'Workout updated successfully!' });
      onOpenChange(false);
      onWorkoutUpdated();
    } catch (error: any) {
      toast({ title: 'Failed to update workout', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Workout</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-title">Title *</Label>
            <Input
              id="edit-title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Level</Label>
              <Select
                value={formData.level}
                onValueChange={(value: WorkoutLevel) => setFormData({ ...formData, level: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={formData.workout_type}
                onValueChange={(value: WorkoutType) => setFormData({ ...formData, workout_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="strength">💪 Strength</SelectItem>
                  <SelectItem value="cardio">🏃 Cardio</SelectItem>
                  <SelectItem value="mobility">🧘 Mobility</SelectItem>
                  <SelectItem value="recovery">🌙 Recovery</SelectItem>
                  <SelectItem value="hiit">🔥 HIIT</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-duration">Duration (minutes)</Label>
            <Input
              id="edit-duration"
              type="number"
              min={5}
              max={180}
              value={formData.duration_minutes}
              onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 30 })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-equipment">Equipment (comma-separated)</Label>
            <Input
              id="edit-equipment"
              value={formData.equipment}
              onChange={(e) => setFormData({ ...formData, equipment: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-coaching">Coaching Notes</Label>
            <Textarea
              id="edit-coaching"
              value={formData.coaching_notes}
              onChange={(e) => setFormData({ ...formData, coaching_notes: e.target.value })}
              rows={2}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="edit-featured">Featured Workout</Label>
            <Switch
              id="edit-featured"
              checked={formData.is_featured}
              onCheckedChange={(checked) => setFormData({ ...formData, is_featured: checked })}
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
