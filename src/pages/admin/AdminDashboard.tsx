import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Users, Crown, DollarSign, Dumbbell } from 'lucide-react';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ free: 0, paid: 0, programs: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      const { data: roles } = await supabase.from('user_roles').select('role');
      const free = roles?.filter(r => r.role === 'free').length || 0;
      const paid = roles?.filter(r => ['paid', 'admin', 'pt_admin'].includes(r.role)).length || 0;

      const { count: programs } = await supabase
        .from('workout_programs')
        .select('*', { count: 'exact', head: true });

      setStats({ free, paid, programs: programs || 0 });
    };
    fetchStats();
  }, []);

  const cards = [
    { label: 'Free Members', value: stats.free, icon: Users, color: 'text-muted-foreground' },
    { label: 'Paid Members', value: stats.paid, icon: Crown, color: 'text-primary' },
    { label: 'Programs', value: stats.programs, icon: Dumbbell, color: 'text-accent' },
  ];

  return (
    <AdminLayout title="Dashboard">
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          {cards.map((card) => (
            <Card key={card.label}>
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center gap-3">
                  <card.icon className={`w-5 h-5 ${card.color}`} />
                  <div>
                    <p className="text-2xl font-bold">{card.value}</p>
                    <p className="text-xs text-muted-foreground">{card.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            <p className="text-sm">More dashboard widgets coming soon — activity feed, recent signups, weekly trends.</p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
