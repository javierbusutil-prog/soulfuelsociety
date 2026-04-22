import { useState } from 'react';
import { PlayCircle } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useMovementsLight } from '@/hooks/useMovementsLight';
import { MovementDetailView } from '@/components/movements/MovementDetailView';
import { cn } from '@/lib/utils';

interface Props {
  /** Stored exercise name (used as fallback if movementId can't be resolved). */
  name: string;
  /** Optional link to the Movement Library. */
  movementId?: string | null;
  /** Right-side meta (e.g. "3×10 @ 95lb" or "30s"). */
  meta?: string;
  className?: string;
}

/**
 * Renders a prescribed exercise row.
 * - If movementId resolves to a Movement, the name becomes a tappable link
 *   that opens MovementDetailView (video, form cues, etc.) and a small
 *   thumbnail (when available) is shown beside the name.
 * - If the movement is missing (deleted or not in the library), the row
 *   gracefully falls back to plain text using the stored `name`.
 */
export function MovementExerciseRow({ name, movementId, meta, className }: Props) {
  const { getById } = useMovementsLight();
  const [open, setOpen] = useState(false);
  const movement = getById(movementId);
  const linked = !!movement;

  return (
    <>
      <div className={cn('flex items-baseline justify-between gap-2', className)}>
        <div className="flex items-center gap-1.5 min-w-0">
          {linked && movement?.thumbnail_url && (
            <img
              src={movement.thumbnail_url}
              alt=""
              className="w-4 h-4 rounded object-cover shrink-0"
            />
          )}
          {linked ? (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="text-xs font-medium text-left truncate underline decoration-dotted decoration-muted-foreground/50 underline-offset-2 hover:text-primary transition-colors flex items-center gap-1"
            >
              {name || movement!.name}
              {movement?.video_url && (
                <PlayCircle className="w-3 h-3 text-primary/60 shrink-0" aria-hidden="true" />
              )}
            </button>
          ) : (
            <span className="text-xs font-medium truncate">{name || 'Exercise'}</span>
          )}
        </div>
        {meta && (
          <span className="text-[11px] text-muted-foreground shrink-0">{meta}</span>
        )}
      </div>

      {linked && movement && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <MovementDetailView
              movement={movement}
              isFavorite={false}
              onClose={() => setOpen(false)}
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}