import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, Heart, Clock, Dumbbell, Check, Calendar, BookOpen, Pencil, Trash2, Play, History, ListChecks, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Workout, WorkoutLevel, WorkoutType } from '@/types/database';
import { WorkoutProgram } from '@/types/workoutPrograms';
import { useWorkoutPrograms, useSessionTemplates } from '@/hooks/useWorkoutPrograms';
import { ProgramCard } from '@/components/workouts/ProgramCard';
import { CreateProgramDialog } from '@/components/workouts/CreateProgramDialog';
import { UploadEbookDialog } from '@/components/workouts/UploadEbookDialog';
import { CreateWorkoutDialog } from '@/components/workouts/CreateWorkoutDialog';
import { EditWorkoutDialog } from '@/components/workouts/EditWorkoutDialog';
import { ProgramDetailView } from '@/components/workouts/ProgramDetailView';
import { WorkoutSessionView } from '@/components/workouts/WorkoutSessionView';
import { WorkoutHistory } from '@/components/workouts/WorkoutHistory';
import { WorkoutStructureEditor } from '@/components/workouts/WorkoutStructureEditor';
import { WeeklyPlanView } from '@/components/workouts/WeeklyPlanView';
import { EnrollProgramDialog } from '@/components/workouts/EnrollProgramDialog';
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

// Helper component to fetch sessions and render EnrollProgramDialog
function EnrollProgramWrapper({ program, onEnrolled }: { program: WorkoutProgram; onEnrolled: () => void }) {
  const { sessions } = useSessionTemplates(program.id);
  return (
    <EnrollProgramDialog
      program={program}
      sessions={sessions}
      onEnrolled={onEnrolled}
    />
  );
}

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
  const { user, isAdmin } = useAuth();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [completedToday, setCompletedToday] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<WorkoutLevel[]>([]);
  const [typeFilter, setTypeFilter] = useState<WorkoutType[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('weekly');
  const [selectedProgram, setSelectedProgram] = useState<WorkoutProgram | null>(null);
  const [editingWorkout, setEditingWorkout] = useState<Workout | null>(null);
  const [deletingWorkout, setDeletingWorkout] = useState<Workout | null>(null);
  const [activeSession, setActiveSession] = useState<Workout | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [structureWorkout, setStructureWorkout] = useState<Workout | null>(null);
  const [enrollingProgram, setEnrollingProgram] = useState<WorkoutProgram | null>(null);
  const { 
    programs, 
    loading: programsLoading, 
    createProgram,
    updateProgram,
    isEnrolled,
    refetchPrograms,
    refetchEnrollments,
  } = useWorkoutPrograms();

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

  const visiblePrograms = programs.filter(p => isAdmin || p.published);

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
      <AppLayout title="Workout History">
        <WorkoutHistory onBack={() => setShowHistory(false)} />
      </AppLayout>
    );
  }

  // Program detail view
  if (selectedProgram) {
    return (
      <AppLayout title="Program Details">
        <ProgramDetailView
          program={selectedProgram}
          isAdmin={isAdmin}
          isEnrolled={isEnrolled(selectedProgram.id)}
          onBack={() => setSelectedProgram(null)}
          onUpdate={async (id, updates) => {
            const updated = await updateProgram(id, updates);
            setSelectedProgram(updated);
            return updated;
          }}
          onEnrollmentChange={() => {
            refetchEnrollments();
          }}
        />
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Workouts">
      <div className="max-w-lg mx-auto p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="weekly" className="flex items-center gap-1.5 text-xs">
              <CalendarDays className="w-3.5 h-3.5" />
              Weekly
            </TabsTrigger>
            <TabsTrigger value="programs" className="flex items-center gap-1.5 text-xs">
              <Calendar className="w-3.5 h-3.5" />
              Programs
            </TabsTrigger>
            <TabsTrigger value="movements" className="flex items-center gap-1.5 text-xs">
              <BookOpen className="w-3.5 h-3.5" />
              Movements
            </TabsTrigger>
          </TabsList>

          {/* Weekly Plan Tab */}
          <TabsContent value="weekly" className="mt-4">
            <WeeklyPlanView />
          </TabsContent>


          {/* Programs Tab */}
          <TabsContent value="programs" className="mt-4">
            {isAdmin && (
              <div className="flex gap-2 mb-4">
                <CreateProgramDialog onProgramCreated={createProgram} />
                <UploadEbookDialog onProgramCreated={createProgram} />
              </div>
            )}
            <div className="space-y-3">
              {programsLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <div className="h-32 bg-muted" />
                    <div className="p-4 space-y-2">
                      <div className="h-4 bg-muted rounded w-3/4" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                    </div>
                  </Card>
                ))
              ) : visiblePrograms.length === 0 ? (
                <Card className="p-8 text-center text-muted-foreground">
                  <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No programs available</p>
                  {isAdmin && <p className="text-sm mt-2">Create your first program above!</p>}
                </Card>
              ) : (
                visiblePrograms.map((program, index) => (
                  <ProgramCard
                    key={program.id}
                    program={program}
                    isEnrolled={isEnrolled(program.id)}
                    isAdmin={isAdmin}
                    onView={() => setSelectedProgram(program)}
                    onEdit={() => setSelectedProgram(program)}
                    onAddToCalendar={() => setEnrollingProgram(program)}
                    index={index}
                  />
                ))
              )}
            </div>
          </TabsContent>

          {/* Movement Library Tab */}
          <TabsContent value="movements" className="mt-4">
            <MovementLibrary />
          </TabsContent>
        </Tabs>

        {/* Enroll Program Dialog (triggered from card) */}
        {enrollingProgram && (
          <Dialog open={!!enrollingProgram} onOpenChange={(open) => !open && setEnrollingProgram(null)}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add Program to Calendar</DialogTitle>
              </DialogHeader>
              <EnrollProgramWrapper
                program={enrollingProgram}
                onEnrolled={() => {
                  refetchEnrollments();
                  setEnrollingProgram(null);
                }}
              />
            </DialogContent>
          </Dialog>
        )}

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
