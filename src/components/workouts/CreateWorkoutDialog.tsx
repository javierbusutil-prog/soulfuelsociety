import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { WorkoutLevel, WorkoutType } from '@/types/database';

interface CreateWorkoutDialogProps {
  onWorkoutCreated: () => void;
}

export function CreateWorkoutDialog({ onWorkoutCreated }: CreateWorkoutDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast({ title: 'Title is required', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const equipmentArray = formData.equipment
        .split(',')
        .map(e => e.trim())
        .filter(e => e.length > 0);

      const { error } = await supabase.from('workouts').insert({
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        level: formData.level,
        workout_type: formData.workout_type,
        duration_minutes: formData.duration_minutes,
        equipment: equipmentArray.length > 0 ? equipmentArray : null,
        coaching_notes: formData.coaching_notes.trim() || null,
        is_featured: formData.is_featured,
        created_by: user?.id,
      });

      if (error) throw error;

      toast({ title: 'Workout created successfully!' });
      setOpen(false);
      setFormData({
        title: '',
        description: '',
        level: 'beginner',
        workout_type: 'strength',
        duration_minutes: 30,
        equipment: '',
        coaching_notes: '',
        is_featured: false,
      });
      onWorkoutCreated();
    } catch (error: any) {
      toast({ title: 'Failed to create workout', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full">
          <Plus className="w-4 h-4 mr-2" />
          Add Workout
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Workout</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Full Body Strength"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the workout..."
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
            <Label htmlFor="duration">Duration (minutes)</Label>
            <Input
              id="duration"
              type="number"
              min={5}
              max={180}
              value={formData.duration_minutes}
              onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 30 })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="equipment">Equipment (comma-separated)</Label>
            <Input
              id="equipment"
              value={formData.equipment}
              onChange={(e) => setFormData({ ...formData, equipment: e.target.value })}
              placeholder="e.g., Dumbbells, Resistance bands"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="coaching_notes">Coaching Notes</Label>
            <Textarea
              id="coaching_notes"
              value={formData.coaching_notes}
              onChange={(e) => setFormData({ ...formData, coaching_notes: e.target.value })}
              placeholder="Tips or instructions for the workout..."
              rows={2}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="featured">Featured Workout</Label>
            <Switch
              id="featured"
              checked={formData.is_featured}
              onCheckedChange={(checked) => setFormData({ ...formData, is_featured: checked })}
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Creating...' : 'Create Workout'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
