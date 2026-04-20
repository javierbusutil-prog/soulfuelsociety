import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, SlidersHorizontal, ArrowUpDown, Plus, Edit, Trash2, Dumbbell } from 'lucide-react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem,
  DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useMovements } from '@/hooks/useMovements';
import { MovementFormDialog } from '@/components/movements/MovementFormDialog';
import { MovementDetailView } from '@/components/movements/MovementDetailView';
import { MUSCLE_GROUPS, MOVEMENT_CATEGORIES, DIFFICULTY_LEVELS } from '@/types/movements';
import type { Movement } from '@/types/movements';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

const levelColors: Record<string, string> = {
  beginner: 'bg-success/20 text-success border-success/30',
  intermediate: 'bg-warning/20 text-warning border-warning/30',
  advanced: 'bg-destructive/20 text-destructive border-destructive/30',
};

type SortOption = 'a-z' | 'newest' | 'difficulty';

export default function AdminMovements() {
  const { movements, loading, createMovement, updateMovement, deleteMovement, getMovementUsageCount } = useMovements();
  const [search, setSearch] = useState('');
  const [muscleFilter, setMuscleFilter] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [diffFilter, setDiffFilter] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>('a-z');
  const [previewMovement, setPreviewMovement] = useState<Movement | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Movement | null>(null);
  const [deleteUsage, setDeleteUsage] = useState<number | null>(null);
  const [checkingUsage, setCheckingUsage] = useState(false);

  const filtered = useMemo(() => {
    let result = movements.filter(m => {
      const matchSearch = m.name.toLowerCase().includes(search.toLowerCase());
      const matchMuscle = muscleFilter.length === 0 || muscleFilter.includes(m.muscle_group);
      const matchCat = categoryFilter.length === 0 || categoryFilter.includes(m.category);
      const matchDiff = diffFilter.length === 0 || diffFilter.includes(m.difficulty);
      return matchSearch && matchMuscle && matchCat && matchDiff;
    });
    const diffOrder = { beginner: 0, intermediate: 1, advanced: 2 };
    if (sortBy === 'a-z') result.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortBy === 'newest') result.sort((a, b) => b.created_at.localeCompare(a.created_at));
    else if (sortBy === 'difficulty') result.sort((a, b) => (diffOrder[a.difficulty as keyof typeof diffOrder] ?? 0) - (diffOrder[b.difficulty as keyof typeof diffOrder] ?? 0));
    return result;
  }, [movements, search, muscleFilter, categoryFilter, diffFilter, sortBy]);

  const activeFilterCount = muscleFilter.length + categoryFilter.length + diffFilter.length;

  const handleRequestDelete = async (m: Movement) => {
    setDeleteTarget(m);
    setCheckingUsage(true);
    setDeleteUsage(null);
    const count = await getMovementUsageCount(m.id);
    setDeleteUsage(count);
    setCheckingUsage(false);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const err = await deleteMovement(deleteTarget.id);
    if (err) {
      toast({ title: 'Failed to delete', description: err.message, variant: 'destructive' });
    } else {
      toast({ title: 'Movement deleted' });
    }
    setDeleteTarget(null);
    setDeleteUsage(null);
  };

  return (
    <AdminLayout title="Movement Library">
      <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl tracking-editorial">Movement Library</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Add, edit, and organize the exercises used in workouts and programs.
            </p>
          </div>
          <MovementFormDialog
            onSubmit={createMovement}
            trigger={
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                New Movement
              </Button>
            }
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

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
              <DropdownMenuLabel className="text-xs">Difficulty</DropdownMenuLabel>
              {DIFFICULTY_LEVELS.map(d => (
                <DropdownMenuCheckboxItem key={d} checked={diffFilter.includes(d)}
                  onCheckedChange={ch => setDiffFilter(ch ? [...diffFilter, d] : diffFilter.filter(x => x !== d))}>
                  {d}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

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

        {/* Active filter pills */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {[...muscleFilter, ...categoryFilter, ...diffFilter].map(f => (
              <Badge key={f} variant="secondary" className="cursor-pointer" onClick={() => {
                setMuscleFilter(prev => prev.filter(x => x !== f));
                setCategoryFilter(prev => prev.filter(x => x !== f));
                setDiffFilter(prev => prev.filter(x => x !== f));
              }}>
                {f} ×
              </Badge>
            ))}
          </div>
        )}

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="p-3 animate-pulse h-24" />
            ))
          ) : filtered.length === 0 ? (
            <Card className="col-span-full p-12 text-center text-muted-foreground">
              <Dumbbell className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No movements found</p>
            </Card>
          ) : (
            filtered.map((movement, index) => (
              <motion.div
                key={movement.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.02, 0.3) }}
              >
                <Card
                  className="overflow-hidden hover:bg-card/70 transition-colors cursor-pointer h-full"
                  onClick={() => setPreviewMovement(movement)}
                >
                  <div className="flex gap-3 p-3">
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
                          <MovementFormDialog
                            initial={movement}
                            onSubmit={(updates) => updateMovement(movement.id, updates)}
                            trigger={
                              <button className="p-1 text-muted-foreground hover:text-foreground transition-colors" aria-label="Edit">
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                            }
                          />
                          <button
                            className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                            aria-label="Delete"
                            onClick={() => handleRequestDelete(movement)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        <Badge variant="secondary" className="text-[10px] py-0">{movement.muscle_group}</Badge>
                        <Badge variant="outline" className={cn('text-[10px] py-0', levelColors[movement.difficulty])}>
                          {movement.difficulty}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px] py-0">{movement.equipment}</Badge>
                      </div>
                      {!movement.published && (
                        <Badge variant="outline" className="text-[10px] py-0 mt-1.5 border-warning/40 text-warning">Draft</Badge>
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Preview dialog (read-only) */}
      <Dialog open={!!previewMovement} onOpenChange={(o) => !o && setPreviewMovement(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {previewMovement && (
            <MovementDetailView
              movement={previewMovement}
              isFavorite={false}
              onClose={() => setPreviewMovement(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              {checkingUsage && 'Checking if this movement is in use...'}
              {!checkingUsage && deleteUsage !== null && deleteUsage > 0 && (
                <span className="text-destructive">
                  This movement is used in {deleteUsage} logged exercise{deleteUsage === 1 ? '' : 's'} and cannot be deleted.
                </span>
              )}
              {!checkingUsage && deleteUsage === 0 && 'This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={checkingUsage || (deleteUsage !== null && deleteUsage > 0)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}