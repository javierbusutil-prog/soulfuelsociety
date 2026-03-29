import { useAuth } from '@/contexts/AuthContext';

export function useNutritionDisclaimer() {
  const { profile } = useAuth();
  const accepted = profile?.nutrition_disclaimer_accepted ?? false;
  return { needsDisclaimer: !accepted, accepted };
}
