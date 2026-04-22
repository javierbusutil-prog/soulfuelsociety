import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Movement } from '@/types/movements';

// Lightweight, app-wide cache for movement lookups.
// Used by member-side cards to resolve movementId → display data
// without re-querying for every render.

let cache: Movement[] | null = null;
let inflight: Promise<Movement[]> | null = null;
const listeners = new Set<(movements: Movement[]) => void>();

async function load(): Promise<Movement[]> {
  if (cache) return cache;
  if (inflight) return inflight;
  inflight = supabase
    .from('movements')
    .select('*')
    .then(({ data }) => {
      cache = (data as unknown as Movement[]) || [];
      inflight = null;
      listeners.forEach(l => l(cache!));
      return cache;
    });
  return inflight;
}

export function useMovementsLight() {
  const [movements, setMovements] = useState<Movement[]>(cache || []);
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    let cancelled = false;
    const listener = (m: Movement[]) => {
      if (!cancelled) setMovements(m);
    };
    listeners.add(listener);
    load().then(m => {
      if (!cancelled) {
        setMovements(m);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
      listeners.delete(listener);
    };
  }, []);

  const getById = (id: string | null | undefined): Movement | null => {
    if (!id) return null;
    return movements.find(m => m.id === id) || null;
  };

  return { movements, loading, getById };
}

// Allow other parts of the app (e.g. MovementPicker after creating a new
// movement) to invalidate the cache so consumers re-fetch.
export function invalidateMovementsCache() {
  cache = null;
  inflight = null;
  load();
}