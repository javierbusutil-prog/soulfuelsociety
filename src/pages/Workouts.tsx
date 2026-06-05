import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';
import { Search, Filter, Heart, Clock, Dumbbell, Check, BookOpen, Pencil, Trash2, Play, History, ListChecks, CalendarDays, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Workout, WorkoutLevel, WorkoutType } from '@/types/database';
import { CreateWorkoutDialog } from '@/components/workouts/CreateWorkoutDialog';
import { EditWorkoutDialog } from '@/components/workouts/EditWorkoutDialog';
import { WorkoutSessionView } from '@/components/workouts/WorkoutSessionView';
import { WorkoutHistory } from '@/components/workouts/WorkoutHistory';
import { WorkoutStructureEditor } from '@/components/workouts/WorkoutStructureEditor';
import { MyWorkoutsTab } from '@/components/workouts/MyWorkoutsTab';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { MovementLibrary } from '@/components/movements/MovementLibrary';
import { ProgramCatalog } from '@/components/programs/ProgramCatalog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const levelColors: Record<WorkoutLevel, string> = {
  beginner: 'bg-success/20 text-success border-success/30',
  intermediate: 'bg-warning/20 text-warning border-warning/30',
  advanced: 'bg-destructive/20 text-destructive border-destructive/30',
};

const typeIcons: Record<WorkoutType, string> = {
  strength: '💪',
  cardio: '🏃',
  mobility: '🧘',
  recovery: '🌙',
  hiit: '🔥',
};

export default function Workouts() {
  const { user, isAdmin, isPaidMember } = useAuth();
  const navigate = useNavigate();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [completedToday, setCompletedToday] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<WorkoutLevel[]>([]);
  const [typeFilter, setTypeFilter] = useState<WorkoutType[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('my_workouts');
  const [editingWorkout, setEditingWorkout] = useState<Workout | null>(null);
  const [deletingWorkout, setDeletingWorkout] = useState<Workout | null>(null);
  const [activeSession, setActiveSession] = useState<Workout | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [structureWorkout, setStructureWorkout] = useState<Workout | null>(null);

  useEffect(() => {
    fetchWorkouts();
    if (user) {
      fetchFavorites();
      fetchTodayCompletions();
    }
  }, [user]);

  const fetchWorkouts = async () => {
    const { data } = await supabase
      .from('workouts')
      .select('*')
      .order('is_featured', { ascending: false })
      .order('created_at', { ascending: false });

    if (data) {
      setWorkouts(data as Workout[]);
    }
    setLoading(false);
  };

  const fetchFavorites = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('favorites')
      .select('workout_id')
      .eq('user_id', user.id);

    if (data) {
      setFavorites(data.map(f => f.workout_id));
    }
  };

  const fetchTodayCompletions = async () => {
    if (!user) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data } = await supabase
      .from('workout_completions')
      .select('workout_id')
      .eq('user_id', user.id)
      .gte('completed_at', today.toISOString());

    if (data) {
      setCompletedToday(data.map(c => c.workout_id));
    }
  };

  const toggleFavorite = async (workoutId: string) => {
    if (!user) return;
    const isFavorite = favorites.includes(workoutId);
    if (isFavorite) {
      await supabase.from('favorites').delete().eq('workout_id', workoutId).eq('user_id', user.id);
      setFavorites(favorites.filter(id => id !== workoutId));
    } else {
      await supabase.from('favorites').insert({ workout_id: workoutId, user_id: user.id });
      setFavorites([...favorites, workoutId]);
    }
  };

  const handleDeleteWorkout = async (workout: Workout) => {
    try {
      const { error } = await supabase.from('workouts').delete().eq('id', workout.id);
      if (error) throw error;
      setWorkouts(prev => prev.filter(w => w.id !== workout.id));
      setDeletingWorkout(null);
    } catch (error: any) {
      console.error('Failed to delete workout:', error.message);
    }
  };

  const filteredWorkouts = workouts.filter(workout => {
    const matchesSearch = workout.title.toLowerCase().includes(search.toLowerCase()) ||
      workout.description?.toLowerCase().includes(search.toLowerCase());
    const matchesLevel = levelFilter.length === 0 || levelFilter.includes(workout.level);
    const matchesType = typeFilter.length === 0 || typeFilter.includes(workout.workout_type);
    return matchesSearch && matchesLevel && matchesType;
  });

  // Active workout session view
  if (activeSession) {
    return (
      <AppLayout title={activeSession.title}>
        <WorkoutSessionView
          workout={activeSession}
          onBack={() => setActiveSession(null)}
          onComplete={() => {
            setActiveSession(null);
            fetchTodayCompletions();
          }}
        />
      </AppLayout>
    );
  }

  // Workout history view
  if (showHistory) {
    return (
      <AppLayout title="Training History">
        <WorkoutHistory onBack={() => setShowHistory(false)} />
      </AppLayout>
    );
  }

  // Locked state for non-paid, non-admin users
  if (!isPaidMember && !isAdmin) {
    return (
      <AppLayout title="My Training">
        <div className="max-w-lg mx-auto p-6 min-h-[70vh] flex items-center justify-center">
          <Card className="p-8 text-center w-full">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Lock className="w-7 h-7 text-muted-foreground" />
            </div>
            <h1 className="font-display text-2xl tracking-editorial mb-2">My Training</h1>
            <p className="text-muted-foreground mb-6">
              Your custom training program lives here. Upgrade to get a program built specifically for you by your coach.
            </p>
            <Button onClick={() => navigate('/upgrade')} variant="accent" className="w-full sm:w-auto">
              See Plans
            </Button>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="My Training">
      <div className="max-w-lg mx-auto p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="my_workouts" className="flex items-center gap-1.5 text-xs">
              <Dumbbell className="w-3.5 h-3.5" />
              My Workouts
            </TabsTrigger>
            <TabsTrigger value="movements" className="flex items-center gap-1.5 text-xs">
              <BookOpen className="w-3.5 h-3.5" />
              Movements
            </TabsTrigger>
            <TabsTrigger value="programs" className="flex items-center gap-1.5 text-xs">
              <ShoppingBag className="w-3.5 h-3.5" />
              Programs
            </TabsTrigger>
          </TabsList>

          {/* My Workouts Tab */}
          <TabsContent value="my_workouts" className="mt-4">
            <MyWorkoutsTab />
          </TabsContent>

          {/* Movement Library Tab */}
          <TabsContent value="movements" className="mt-4">
            <MovementLibrary />
          </TabsContent>

          {/* Programs Tab */}
          <TabsContent value="programs" className="mt-4">
            <ProgramCatalog />
          </TabsContent>
        </Tabs>

        {/* Edit Workout Dialog */}
        {editingWorkout && (
          <EditWorkoutDialog
            workout={editingWorkout}
            open={!!editingWorkout}
            onOpenChange={(open) => !open && setEditingWorkout(null)}
            onWorkoutUpdated={fetchWorkouts}
          />
        )}

        {/* Workout Structure Editor Dialog */}
        <Dialog open={!!structureWorkout} onOpenChange={(open) => !open && setStructureWorkout(null)}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Exercises — {structureWorkout?.title}</DialogTitle>
            </DialogHeader>
            {structureWorkout && (
              <WorkoutStructureEditor
                workoutId={structureWorkout.id}
                onClose={() => setStructureWorkout(null)}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deletingWorkout} onOpenChange={(open) => !open && setDeletingWorkout(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Workout</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{deletingWorkout?.title}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deletingWorkout && handleDeleteWorkout(deletingWorkout)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
}
