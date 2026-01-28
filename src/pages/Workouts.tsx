import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, Heart, Clock, Dumbbell, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Workout, WorkoutLevel, WorkoutType } from '@/types/database';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
  const { user } = useAuth();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [completedToday, setCompletedToday] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<WorkoutLevel[]>([]);
  const [typeFilter, setTypeFilter] = useState<WorkoutType[]>([]);
  const [loading, setLoading] = useState(true);

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

  const markComplete = async (workoutId: string) => {
    if (!user) return;

    await supabase.from('workout_completions').insert({
      workout_id: workoutId,
      user_id: user.id,
    });

    setCompletedToday([...completedToday, workoutId]);
  };

  const filteredWorkouts = workouts.filter(workout => {
    const matchesSearch = workout.title.toLowerCase().includes(search.toLowerCase()) ||
      workout.description?.toLowerCase().includes(search.toLowerCase());
    const matchesLevel = levelFilter.length === 0 || levelFilter.includes(workout.level);
    const matchesType = typeFilter.length === 0 || typeFilter.includes(workout.workout_type);
    return matchesSearch && matchesLevel && matchesType;
  });

  return (
    <AppLayout title="Workouts">
      <div className="max-w-lg mx-auto p-4">
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
                    if (checked) {
                      setLevelFilter([...levelFilter, level]);
                    } else {
                      setLevelFilter(levelFilter.filter(l => l !== level));
                    }
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
                    if (checked) {
                      setTypeFilter([...typeFilter, type]);
                    } else {
                      setTypeFilter(typeFilter.filter(t => t !== type));
                    }
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
              <Badge
                key={level}
                variant="secondary"
                className="cursor-pointer"
                onClick={() => setLevelFilter(levelFilter.filter(l => l !== level))}
              >
                {level} ×
              </Badge>
            ))}
            {typeFilter.map(type => (
              <Badge
                key={type}
                variant="secondary"
                className="cursor-pointer"
                onClick={() => setTypeFilter(typeFilter.filter(t => t !== type))}
              >
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
                          <button
                            onClick={() => toggleFavorite(workout.id)}
                            className={`shrink-0 ${isFavorite ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                          >
                            <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
                          </button>
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
                            onClick={() => !isCompleted && markComplete(workout.id)}
                            disabled={isCompleted}
                          >
                            <Check className="w-4 h-4 mr-1" />
                            {isCompleted ? 'Completed' : 'Mark Complete'}
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
      </div>
    </AppLayout>
  );
}
