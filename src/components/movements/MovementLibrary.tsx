import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, Heart, SlidersHorizontal, Dumbbell, ArrowUpDown, Trash2, Edit } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useMovements } from '@/hooks/useMovements';
import { MovementFormDialog } from '@/components/movements/MovementFormDialog';
import { MovementDetailView } from '@/components/movements/MovementDetailView';
import { MUSCLE_GROUPS, MOVEMENT_CATEGORIES, EQUIPMENT_OPTIONS, DIFFICULTY_LEVELS } from '@/types/movements';
import type { Movement } from '@/types/movements';
import { cn } from '@/lib/utils';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem,
  DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';

const levelColors: Record<string, string> = {
  beginner: 'bg-success/20 text-success border-success/30',
  intermediate: 'bg-warning/20 text-warning border-warning/30',
  advanced: 'bg-destructive/20 text-destructive border-destructive/30',
};

type SortOption = 'a-z' | 'newest' | 'difficulty';

export function MovementLibrary() {
  const { isAdmin } = useAuth();
  const { movements, favorites, loading, toggleFavorite, createMovement, updateMovement, deleteMovement } = useMovements();
  const [search, setSearch] = useState('');
  const [selectedMovement, setSelectedMovement] = useState<Movement | null>(null);
  const [muscleFilter, setMuscleFilter] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [equipFilter, setEquipFilter] = useState<string[]>([]);
  const [diffFilter, setDiffFilter] = useState<string[]>([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('a-z');

  const filtered = useMemo(() => {
    let result = movements.filter(m => {
      const matchSearch = m.name.toLowerCase().includes(search.toLowerCase());
      const matchMuscle = muscleFilter.length === 0 || muscleFilter.includes(m.muscle_group);
      const matchCat = categoryFilter.length === 0 || categoryFilter.includes(m.category);
      const matchEquip = equipFilter.length === 0 || equipFilter.includes(m.equipment);
      const matchDiff = diffFilter.length === 0 || diffFilter.includes(m.difficulty);
      const matchFav = !showFavoritesOnly || favorites.includes(m.id);
      return matchSearch && matchMuscle && matchCat && matchEquip && matchDiff && matchFav;
    });

    const diffOrder = { beginner: 0, intermediate: 1, advanced: 2 };
    if (sortBy === 'a-z') result.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortBy === 'newest') result.sort((a, b) => b.created_at.localeCompare(a.created_at));
    else if (sortBy === 'difficulty') result.sort((a, b) => (diffOrder[a.difficulty as keyof typeof diffOrder] ?? 0) - (diffOrder[b.difficulty as keyof typeof diffOrder] ?? 0));

    return result;
  }, [movements, search, muscleFilter, categoryFilter, equipFilter, diffFilter, showFavoritesOnly, favorites, sortBy]);

  const activeFilterCount = muscleFilter.length + categoryFilter.length + equipFilter.length + diffFilter.length + (showFavoritesOnly ? 1 : 0);

  const handleDelete = async (id: string) => {
    const err = await deleteMovement(id);
    if (!err) toast({ title: 'Movement deleted' });
  };

  // Detail view
  if (selectedMovement) {
    return (
      <div className="max-w-lg mx-auto">
        <MovementDetailView
          movement={selectedMovement}
          isFavorite={favorites.includes(selectedMovement.id)}
          onToggleFavorite={() => toggleFavorite(selectedMovement.id)}
          onClose={() => setSelectedMovement(null)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Admin add button */}
      {isAdmin && (
        <MovementFormDialog onSubmit={createMovement} />
      )}

      {/* Search + filter */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search movements..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filter dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="relative">
              <SlidersHorizontal className="w-4 h-4" />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-accent text-accent-foreground text-[10px] rounded-full flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 max-h-80 overflow-y-auto">
            <DropdownMenuCheckboxItem checked={showFavoritesOnly} onCheckedChange={setShowFavoritesOnly}>
              <Heart className="w-3.5 h-3.5 mr-1.5" /> Favorites Only
            </DropdownMenuCheckboxItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs">Muscle Group</DropdownMenuLabel>
            {MUSCLE_GROUPS.map(g => (
              <DropdownMenuCheckboxItem key={g} checked={muscleFilter.includes(g)}
                onCheckedChange={c => setMuscleFilter(c ? [...muscleFilter, g] : muscleFilter.filter(x => x !== g))}>
                {g}
              </DropdownMenuCheckboxItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs">Category</DropdownMenuLabel>
            {MOVEMENT_CATEGORIES.map(c => (
              <DropdownMenuCheckboxItem key={c} checked={categoryFilter.includes(c)}
                onCheckedChange={ch => setCategoryFilter(ch ? [...categoryFilter, c] : categoryFilter.filter(x => x !== c))}>
                {c}
              </DropdownMenuCheckboxItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs">Equipment</DropdownMenuLabel>
            {EQUIPMENT_OPTIONS.map(e => (
              <DropdownMenuCheckboxItem key={e} checked={equipFilter.includes(e)}
                onCheckedChange={ch => setEquipFilter(ch ? [...equipFilter, e] : equipFilter.filter(x => x !== e))}>
                {e}
              </DropdownMenuCheckboxItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs">Difficulty</DropdownMenuLabel>
            {DIFFICULTY_LEVELS.map(d => (
              <DropdownMenuCheckboxItem key={d} checked={diffFilter.includes(d)}
                onCheckedChange={ch => setDiffFilter(ch ? [...diffFilter, d] : diffFilter.filter(x => x !== d))}>
                {d}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Sort dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              <ArrowUpDown className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuCheckboxItem checked={sortBy === 'a-z'} onCheckedChange={() => setSortBy('a-z')}>A–Z</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={sortBy === 'newest'} onCheckedChange={() => setSortBy('newest')}>Newest</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={sortBy === 'difficulty'} onCheckedChange={() => setSortBy('difficulty')}>Difficulty</DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Active filters */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {showFavoritesOnly && (
            <Badge variant="secondary" className="cursor-pointer" onClick={() => setShowFavoritesOnly(false)}>
              ❤️ Favorites ×
            </Badge>
          )}
          {[...muscleFilter, ...categoryFilter, ...equipFilter, ...diffFilter].map(f => (
            <Badge key={f} variant="secondary" className="cursor-pointer" onClick={() => {
              setMuscleFilter(prev => prev.filter(x => x !== f));
              setCategoryFilter(prev => prev.filter(x => x !== f));
              setEquipFilter(prev => prev.filter(x => x !== f));
              setDiffFilter(prev => prev.filter(x => x !== f));
            }}>
              {f} ×
            </Badge>
          ))}
        </div>
      )}

      {/* Grid */}
      <div className="space-y-2">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-3 animate-pulse">
              <div className="flex gap-3">
                <div className="w-16 h-16 bg-muted rounded-lg shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </div>
            </Card>
          ))
        ) : filtered.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            <Dumbbell className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No movements found</p>
          </Card>
        ) : (
          filtered.map((movement, index) => {
            const isFav = favorites.includes(movement.id);
            return (
              <motion.div
                key={movement.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <Card
                  className="overflow-hidden hover:bg-card/70 transition-colors cursor-pointer"
                  onClick={() => setSelectedMovement(movement)}
                >
                  <div className="flex gap-3 p-3">
                    {/* Thumbnail */}
                    <div className="w-16 h-16 bg-secondary rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
                      {movement.thumbnail_url ? (
                        <img src={movement.thumbnail_url} alt={movement.name} className="w-full h-full object-cover" />
                      ) : (
                        <Dumbbell className="w-6 h-6 text-muted-foreground/50" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-semibold truncate">{movement.name}</h3>
                        <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                          {isAdmin && (
                            <>
                              <MovementFormDialog
                                initial={movement}
                                onSubmit={(updates) => updateMovement(movement.id, updates)}
                                trigger={
                                  <button className="p-1 text-muted-foreground hover:text-foreground transition-colors">
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>
                                }
                              />
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <button className="p-1 text-muted-foreground hover:text-destructive transition-colors">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete {movement.name}?</AlertDialogTitle>
                                    <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDelete(movement.id)}>Delete</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </>
                          )}
                          <button
                            onClick={() => toggleFavorite(movement.id)}
                            className={cn('p-1 transition-colors', isFav ? 'text-accent' : 'text-muted-foreground hover:text-foreground')}
                          >
                            <Heart className={cn('w-4 h-4', isFav && 'fill-current')} />
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        <Badge variant="outline" className={cn('text-[10px] py-0', levelColors[movement.difficulty])}>
                          {movement.difficulty}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px] py-0">{movement.equipment}</Badge>
                        <Badge variant="secondary" className="text-[10px] py-0">{movement.category}</Badge>
                      </div>
                      {!movement.published && isAdmin && (
                        <Badge variant="outline" className="text-[10px] py-0 mt-1 border-warning/40 text-warning">Draft</Badge>
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
