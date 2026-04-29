import type { ReactNode } from 'react';
import { Dumbbell, Bike, Heart, Apple } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MovementExerciseRow } from '@/components/dashboard/MovementExerciseRow';
import { NutritionDisclaimerLabel } from '@/components/nutrition/NutritionDisclaimerLabel';
import type { Block } from '@/lib/workoutBlocks';

interface Props {
  /** Already extracted via getBlocksFromSource — caller does the unwrapping. */
  blocks: Block[];
  /** Padding inside each block card. 'compact' = p-2.5 (member cards), 'comfortable' = p-3 (DailyDose). */
  variant?: 'compact' | 'comfortable';
  /** Header style: text-only (member cards) or text + lucide icon (DailyDose). */
  headerStyle?: 'primary-text' | 'primary-icon';
  /** Whether to render nutrition blocks. Default true. */
  showNutrition?: boolean;
  /** Rendered when blocks is empty. Default null (renders nothing). */
  emptyState?: ReactNode;
}

const ICONS = {
  strength: Dumbbell,
  cardio: Bike,
  mobility: Heart,
  nutrition: Apple,
} as const;

const LABELS = {
  strength: 'Strength',
  cardio: 'Cardio',
  mobility: 'Mobility',
  nutrition: 'Nutrition',
} as const;

function strengthMeta(ex: { sets?: string; reps?: string; weight?: string }): string {
  const sets = ex.sets || '';
  const reps = ex.reps || '';
  const weight = ex.weight || '';
  const sr = sets && reps ? `${sets}×${reps}` : sets || reps;
  const w = weight ? ` @ ${weight} lb` : '';
  return `${sr}${w}`.trim();
}

function mobilityMeta(ex: { duration?: string; side?: string }): string {
  const duration = ex.duration || '';
  const sideSuffix = ex.side && ex.side !== 'both' ? ` (${ex.side})` : '';
  return `${duration}${sideSuffix}`.trim();
}

function BlockHeader({
  type,
  headerStyle,
}: {
  type: Block['type'];
  headerStyle: 'primary-text' | 'primary-icon';
}) {
  const Icon = ICONS[type];
  return (
    <div className="flex items-center gap-1.5">
      {headerStyle === 'primary-icon' && <Icon className="w-3 h-3 text-primary" />}
      <p className="text-[10px] uppercase tracking-wider text-primary font-medium">
        {LABELS[type]}
      </p>
    </div>
  );
}

export function WorkoutBlocksDisplay({
  blocks,
  variant = 'compact',
  headerStyle = 'primary-text',
  showNutrition = true,
  emptyState = null,
}: Props) {
  if (!blocks || blocks.length === 0) {
    return <>{emptyState}</>;
  }

  const padding = variant === 'comfortable' ? 'p-3' : 'p-2.5';

  return (
    <div className="space-y-2">
      {blocks.map((block, bi) => {
        if (block.type === 'nutrition' && !showNutrition) return null;
        return (
          <div key={bi} className={cn('bg-muted/40 rounded-lg space-y-1.5', padding)}>
            <BlockHeader type={block.type} headerStyle={headerStyle} />

            {block.type === 'strength' &&
              block.exercises?.map((ex, ei) => (
                <MovementExerciseRow
                  key={ei}
                  name={ex.name || 'Exercise'}
                  movementId={ex.movementId}
                  meta={strengthMeta(ex)}
                />
              ))}

            {block.type === 'cardio' && (
              <>
                {block.scheme && (
                  <p className="text-sm font-medium">{block.scheme}</p>
                )}
                {block.movements && (
                  <p className="text-sm whitespace-pre-wrap">{block.movements}</p>
                )}
                {block.note && (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{block.note}</p>
                )}
              </>
            )}

            {block.type === 'mobility' &&
              block.exercises?.map((ex, ei) => (
                <MovementExerciseRow
                  key={ei}
                  name={ex.name || 'Stretch'}
                  movementId={ex.movementId}
                  meta={mobilityMeta(ex)}
                />
              ))}

            {block.type === 'nutrition' && (
              <>
                <p className="text-xs whitespace-pre-wrap">{block.content}</p>
                <NutritionDisclaimerLabel variant="coach-note" />
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}