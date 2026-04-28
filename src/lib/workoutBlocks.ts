/**
 * Shared types and helpers for rendering workout "blocks"
 * (the read-only display side — the editable form lives elsewhere).
 *
 * Pulled from the canonical definition in AdminProgramBuilder. All
 * three pre-existing copies of mergeAdjacentBlocks were identical;
 * this is now the single source of truth.
 */

export type BlockType = 'strength' | 'cardio' | 'mobility' | 'nutrition';

export interface StrengthExercise {
  name: string;
  movementId?: string | null;
  sets?: string;
  reps?: string;
  weight?: string;
  note?: string;
}

export interface MobilityExercise {
  name: string;
  movementId?: string | null;
  duration?: string;
  side?: string;
  note?: string;
}

export interface StrengthBlock {
  type: 'strength';
  exercises: StrengthExercise[];
}

export interface CardioBlock {
  type: 'cardio';
  format?: string;
  movements?: string;
  scheme?: string;
  note?: string;
}

export interface MobilityBlock {
  type: 'mobility';
  exercises: MobilityExercise[];
}

export interface NutritionBlock {
  type: 'nutrition';
  content: string;
}

export type Block = StrengthBlock | CardioBlock | MobilityBlock | NutritionBlock;

/**
 * Merge consecutive same-type blocks of strength and mobility (their
 * exercises arrays concat). Cardio and nutrition blocks are NEVER merged
 * — each instance is conceptually distinct.
 *
 * Deep-clones via JSON to avoid mutating the caller's data.
 */
export function mergeAdjacentBlocks(blocks: Block[]): Block[] {
  const out: Block[] = [];
  for (const b of blocks) {
    const last = out[out.length - 1];
    if (
      last &&
      last.type === b.type &&
      (b.type === 'strength' || b.type === 'mobility')
    ) {
      (last as StrengthBlock | MobilityBlock).exercises = [
        ...((last as StrengthBlock | MobilityBlock).exercises || []),
        ...((b as StrengthBlock | MobilityBlock).exercises || []),
      ];
    } else {
      out.push(JSON.parse(JSON.stringify(b)));
    }
  }
  return out;
}

/**
 * Normalize varied input shapes to a Block[].
 * Accepts: Block[] | { blocks: Block[] } | null | undefined | anything else.
 */
export function getBlocksFromSource(input: any): Block[] {
  if (!input) return [];
  if (Array.isArray(input)) return input as Block[];
  if (Array.isArray(input?.blocks)) return input.blocks as Block[];
  return [];
}

export interface SummarizeOpts {
  merge?: boolean;
  includeNutrition?: boolean;
}

/**
 * One-line, count-based summary of a day's blocks.
 * Format: "Strength · 3 exercises + Cardio · 1 activity + Mobility · 2 exercises"
 */
export function summarizeBlocks(
  blocks: Block[],
  opts: SummarizeOpts = {},
): string {
  const { merge = true, includeNutrition = true } = opts;
  if (!blocks || blocks.length === 0) return 'Workout';

  const source = merge ? mergeAdjacentBlocks(blocks) : blocks;
  const parts: string[] = [];

  let cardioCount = 0;
  for (const block of source) {
    if (block.type === 'strength') {
      const c = block.exercises?.length || 0;
      parts.push(`Strength · ${c} exercise${c !== 1 ? 's' : ''}`);
    } else if (block.type === 'cardio') {
      cardioCount += 1;
    } else if (block.type === 'mobility') {
      const c = block.exercises?.length || 0;
      parts.push(`Mobility · ${c} exercise${c !== 1 ? 's' : ''}`);
    } else if (block.type === 'nutrition' && includeNutrition) {
      parts.push('Nutrition guidance');
    }
  }

  if (cardioCount > 0) {
    // Insert cardio in source order — recompute to preserve ordering relative
    // to other parts. Simpler: walk source again and splice cardio entries in.
    const ordered: string[] = [];
    let strengthIdx = 0;
    let mobilityIdx = 0;
    let nutritionIdx = 0;
    const strengthParts = parts.filter(p => p.startsWith('Strength'));
    const mobilityParts = parts.filter(p => p.startsWith('Mobility'));
    const nutritionParts = parts.filter(p => p.startsWith('Nutrition'));
    for (const block of source) {
      if (block.type === 'strength' && strengthParts[strengthIdx]) {
        ordered.push(strengthParts[strengthIdx++]);
      } else if (block.type === 'cardio') {
        // collapsed into one entry below
      } else if (block.type === 'mobility' && mobilityParts[mobilityIdx]) {
        ordered.push(mobilityParts[mobilityIdx++]);
      } else if (block.type === 'nutrition' && includeNutrition && nutritionParts[nutritionIdx]) {
        ordered.push(nutritionParts[nutritionIdx++]);
      }
    }
    // Append cardio summary at end (or wherever first cardio appeared)
    const firstCardioIdx = source.findIndex(b => b.type === 'cardio');
    let insertAt = 0;
    for (let i = 0; i < firstCardioIdx; i++) {
      const t = source[i].type;
      if (t === 'strength' || t === 'mobility' || (t === 'nutrition' && includeNutrition)) insertAt++;
    }
    ordered.splice(insertAt, 0, `Cardio · ${cardioCount} ${cardioCount === 1 ? 'activity' : 'activities'}`);
    return ordered.join(' + ') || 'Workout';
  }

  return parts.join(' + ') || 'Workout';
}