import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Movement } from '@/types/movements';

export function useMovements() {
  const { user } = useAuth();
  const [movements, setMovements] = useState<Movement[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMovements = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('movements')
      .select('*')
      .order('name', { ascending: true });
    if (data) setMovements(data as unknown as Movement[]);
    setLoading(false);
  }, []);

  const fetchFavorites = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('movement_favorites')
      .select('movement_id')
      .eq('user_id', user.id);
    if (data) setFavorites(data.map(f => (f as any).movement_id));
  }, [user]);

  useEffect(() => {
    fetchMovements();
    fetchFavorites();
  }, [fetchMovements, fetchFavorites]);

  const toggleFavorite = async (movementId: string) => {
    if (!user) return;
    const isFav = favorites.includes(movementId);
    if (isFav) {
      await supabase.from('movement_favorites').delete()
        .eq('user_id', user.id).eq('movement_id', movementId);
      setFavorites(prev => prev.filter(id => id !== movementId));
    } else {
      await supabase.from('movement_favorites').insert({
        user_id: user.id, movement_id: movementId,
      } as any);
      setFavorites(prev => [...prev, movementId]);
    }
  };

  const createMovement = async (movement: Partial<Movement>) => {
    if (!user) return;
    const { error } = await supabase.from('movements').insert({
      ...movement,
      created_by: user.id,
    } as any);
    if (!error) await fetchMovements();
    return error;
  };

  const updateMovement = async (id: string, updates: Partial<Movement>) => {
    const { error } = await supabase.from('movements')
      .update(updates as any).eq('id', id);
    if (!error) await fetchMovements();
    return error;
  };

  const deleteMovement = async (id: string) => {
    const { error } = await supabase.from('movements').delete().eq('id', id);
    if (!error) await fetchMovements();
    return error;
  };

  return {
    movements,
    favorites,
    loading,
    toggleFavorite,
    createMovement,
    updateMovement,
    deleteMovement,
    refetch: fetchMovements,
  };
}
