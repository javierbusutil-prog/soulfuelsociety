import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { OnlineProgramCard } from './OnlineProgramCard';
import { InPersonSessionsCard } from './InPersonSessionsCard';
import { SupplementalProgramCard } from './SupplementalProgramCard';
import { LockedCoachingCard } from './LockedCoachingCard';

interface DashboardData {
  selectedPlan: string | null;
  hasSupplementalProgram: boolean;
}

export function CoachingDashboard() {
  const { user, isPaidMember } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    const fetch = async () => {
      const { data: prof } = await supabase
        .from('profiles')
        .select('selected_plan')
        .eq('id', user.id)
        .single();

      const plan = prof?.selected_plan || null;
      let hasSup = false;

      if (plan === 'in-person') {
        const { data: supp } = await supabase
          .from('coaching_programs')
          .select('id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .eq('plan_type', 'inperson_supplemental' as any)
          .limit(1)
          .maybeSingle();
        hasSup = !!supp;
      }

      setData({ selectedPlan: plan, hasSupplementalProgram: hasSup });
      setLoading(false);
    };
    fetch();
  }, [user]);

  if (loading) return null;

  // Free / no plan
  if (!isPaidMember || !data?.selectedPlan || data.selectedPlan === 'free') {
    return <LockedCoachingCard />;
  }

  // Online plan
  if (data.selectedPlan === 'online') {
    return <OnlineProgramCard />;
  }

  // In-person plan
  if (data.selectedPlan === 'in-person') {
    return (
      <div className="space-y-4">
        <InPersonSessionsCard />
        {data.hasSupplementalProgram && <SupplementalProgramCard />}
      </div>
    );
  }

  return <LockedCoachingCard />;
}
