import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { MovementDetailView } from '@/components/movements/MovementDetailView';
import type { Movement } from '@/types/movements';

interface ExerciseLinkProps {
  exerciseName: string;
  className?: string;
}

export function ExerciseLink({ exerciseName, className }: ExerciseLinkProps) {
  const { user } = useAuth();
  const [movement, setMovement] = useState<Movement | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [open, setOpen] = useState(false);
  const [searched, setSearched] = useState(false);

  // Search for matching movement on mount
  useEffect(() => {
    const search = async () => {
      const { data } = await supabase
        .from('movements')
        .select('*')
        .eq('published', true)
        .ilike('name', exerciseName.trim())
        .limit(1);
      if (data && data.length > 0) {
        setMovement(data[0] as unknown as Movement);
      }
      setSearched(true);
    };
    search();
  }, [exerciseName]);

  // Check favorite status when opening
  useEffect(() => {
    if (!open || !movement || !user) return;
    const checkFav = async () => {
      const { data } = await supabase
        .from('movement_favorites')
        .select('id')
        .eq('user_id', user.id)
        .eq('movement_id', movement.id)
        .limit(1);
      setIsFavorite(!!data && data.length > 0);
    };
    checkFav();
  }, [open, movement, user]);

  const toggleFavorite = async () => {
    if (!user || !movement) return;
    if (isFavorite) {
      await supabase.from('movement_favorites').delete()
        .eq('user_id', user.id).eq('movement_id', movement.id);
      setIsFavorite(false);
    } else {
      await supabase.from('movement_favorites').insert({
        user_id: user.id, movement_id: movement.id,
      } as any);
      setIsFavorite(true);
    }
  };

  if (!searched) return <span className={className}>{exerciseName}</span>;

  if (!movement) {
    return (
      <span className={className}>
        {exerciseName}
        <span className="ml-1 text-[10px] text-muted-foreground italic">Demo coming soon</span>
      </span>
    );
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-left underline decoration-dotted underline-offset-2 text-primary hover:text-primary/80 transition-colors cursor-pointer"
      >
        {exerciseName}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <MovementDetailView
            movement={movement}
            isFavorite={isFavorite}
            onToggleFavorite={toggleFavorite}
            onClose={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
