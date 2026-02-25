import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, Heart, Clock, Dumbbell, Check, Calendar, BookOpen, Pencil, Trash2, Play, History, ListChecks } from 'lucide-react';
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
import { useWorkoutPrograms } from '@/hooks/useWorkoutPrograms';
import { ProgramCard } from '@/components/workouts/ProgramCard';
import { CreateProgramDialog } from '@/components/workouts/CreateProgramDialog';
import { CreateWorkoutDialog } from '@/components/workouts/CreateWorkoutDialog';
import { EditWorkoutDialog } from '@/components/workouts/EditWorkoutDialog';
import { ProgramDetailView } from '@/components/workouts/ProgramDetailView';
import { WorkoutSessionView } from '@/components/workouts/WorkoutSessionView';
import { WorkoutHistory } from '@/components/workouts/WorkoutHistory';
import { WorkoutStructureEditor } from '@/components/workouts/WorkoutStructureEditor';
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
  const [activeTab, setActiveTab] = useState('workouts');
  const [selectedProgram, setSelectedProgram] = useState<WorkoutProgram | null>(null);
  const [editingWorkout, setEditingWorkout] = useState<Workout | null>(null);
  const [deletingWorkout, setDeletingWorkout] = useState<Workout | null>(null);
  const [activeSession, setActiveSession] = useState<Workout | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [structureWorkout, setStructureWorkout] = useState<Workout | null>(null);
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
            <TabsTrigger value="workouts" className="flex items-center gap-1.5 text-xs">
              <Dumbbell className="w-3.5 h-3.5" />
              Workouts
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

          {/* Workouts Tab */}
          <TabsContent value="workouts" className="mt-4">
            {/* Top actions row */}
            <div className="flex gap-2 mb-4">
              {isAdmin && (
                <div className="flex-1">
                  <CreateWorkoutDialog onWorkoutCreated={fetchWorkouts} />
                </div>
              )}
              <Button
                variant="outline"
                onClick={() => setShowHistory(true)}
                className={isAdmin ? '' : 'w-full'}
              >
                <History className="w-4 h-4 mr-1.5" />
                History
              </Button>
            </div>

            {/* Search and filters */}
            <div className="flex gap-2 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search workouts..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <Filter className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Level</div>
                  {(['beginner', 'intermediate', 'advanced'] as WorkoutLevel[]).map(level => (
                    <DropdownMenuCheckboxItem
                      key={level}
                      checked={levelFilter.includes(level)}
                      onCheckedChange={(checked) => {
                        if (checked) setLevelFilter([...levelFilter, level]);
                        else setLevelFilter(levelFilter.filter(l => l !== level));
                      }}
                    >
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </DropdownMenuCheckboxItem>
                  ))}
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-2">Type</div>
                  {(['strength', 'cardio', 'mobility', 'recovery', 'hiit'] as WorkoutType[]).map(type => (
                    <DropdownMenuCheckboxItem
                      key={type}
                      checked={typeFilter.includes(type)}
                      onCheckedChange={(checked) => {
                        if (checked) setTypeFilter([...typeFilter, type]);
                        else setTypeFilter(typeFilter.filter(t => t !== type));
                      }}
                    >
                      {typeIcons[type]} {type.charAt(0).toUpperCase() + type.slice(1)}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Active filters */}
            {(levelFilter.length > 0 || typeFilter.length > 0) && (
              <div className="flex flex-wrap gap-2 mb-4">
                {levelFilter.map(level => (
                  <Badge key={level} variant="secondary" className="cursor-pointer" onClick={() => setLevelFilter(levelFilter.filter(l => l !== level))}>
                    {level} ×
                  </Badge>
                ))}
                {typeFilter.map(type => (
                  <Badge key={type} variant="secondary" className="cursor-pointer" onClick={() => setTypeFilter(typeFilter.filter(t => t !== type))}>
                    {type} ×
                  </Badge>
                ))}
              </div>
            )}

            {/* Workouts list */}
            <div className="space-y-3">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i} className="p-4 animate-pulse">
                    <div className="flex gap-4">
                      <div className="w-24 h-24 bg-muted rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-muted rounded w-3/4" />
                        <div className="h-3 bg-muted rounded w-1/2" />
                        <div className="h-3 bg-muted rounded w-1/4" />
                      </div>
                    </div>
                  </Card>
                ))
              ) : filteredWorkouts.length === 0 ? (
                <Card className="p-8 text-center text-muted-foreground">
                  <Dumbbell className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No workouts found</p>
                </Card>
              ) : (
                filteredWorkouts.map((workout, index) => {
                  const isFavorite = favorites.includes(workout.id);
                  const isCompleted = completedToday.includes(workout.id);

                  return (
                    <motion.div
                      key={workout.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card className="overflow-hidden bg-card/50 border-border/50 hover:bg-card/70 transition-colors">
                        <div className="flex gap-4 p-4">
                          <div className="w-24 h-24 bg-secondary rounded-lg flex items-center justify-center text-4xl shrink-0">
                            {typeIcons[workout.workout_type]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="font-semibold truncate">{workout.title}</h3>
                              <div className="flex items-center gap-1 shrink-0">
                                {isAdmin && (
                                  <>
                                    <button
                                      onClick={() => setStructureWorkout(workout)}
                                      className="text-muted-foreground hover:text-foreground p-1"
                                      title="Edit exercises"
                                    >
                                      <ListChecks className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => setEditingWorkout(workout)}
                                      className="text-muted-foreground hover:text-foreground p-1"
                                    >
                                      <Pencil className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => setDeletingWorkout(workout)}
                                      className="text-muted-foreground hover:text-destructive p-1"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </>
                                )}
                                <button
                                  onClick={() => toggleFavorite(workout.id)}
                                  className={`${isFavorite ? 'text-primary' : 'text-muted-foreground hover:text-foreground'} p-1`}
                                >
                                  <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
                                </button>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className={levelColors[workout.level]}>
                                {workout.level}
                              </Badge>
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {workout.duration_minutes} min
                              </span>
                            </div>
                            {workout.description && (
                              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                                {workout.description}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-3">
                              <Button
                                size="sm"
                                variant={isCompleted ? 'success' : 'default'}
                                onClick={() => setActiveSession(workout)}
                                disabled={isCompleted}
                              >
                                {isCompleted ? (
                                  <>
                                    <Check className="w-4 h-4 mr-1" /> Completed
                                  </>
                                ) : (
                                  <>
                                    <Play className="w-4 h-4 mr-1" /> Start Workout
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  );
                })
              )}
            </div>
          </TabsContent>

          {/* Programs Tab */}
          <TabsContent value="programs" className="mt-4">
            {isAdmin && (
              <div className="mb-4">
                <CreateProgramDialog onProgramCreated={createProgram} />
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
