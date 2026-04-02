import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Users, UserPlus, CalendarDays, ClipboardList, ArrowRight, Clock } from 'lucide-react';
import { format, startOfMonth, startOfWeek, endOfWeek, differenceInDays } from 'date-fns';
import { CashRevenueSection } from '@/components/admin/CashRevenueSection';

interface AwaitingMember {
  id: string;
  user_id: string;
  full_name: string;
  selected_plan: string | null;
  completed_at: string;
}

export default function AdminDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ activeMembers: 0, freeMembers: 0, totalCommunity: 0, newThisMonth: 0, newPaid: 0, newFree: 0, sessionsThisWeek: 0, pendingPrograms: 0 });
  const [awaitingMembers, setAwaitingMembers] = useState<AwaitingMember[]>([]);
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = profile?.full_name?.split(' ')[0] || 'Coach';

  useEffect(() => {
    const fetchData = async () => {
      try {
        // All profiles with selected_plan info
        const { data: allProfiles } = await supabase
          .from('profiles')
          .select('id, selected_plan, created_at');

        // Get admin/coach user IDs to exclude from counts
        const { data: adminRoles } = await supabase
          .from('user_roles')
          .select('user_id')
          .in('role', ['admin', 'pt_admin']);
        const adminIds = new Set(adminRoles?.map(r => r.user_id) || []);

        const memberProfiles = allProfiles?.filter(p => !adminIds.has(p.id)) || [];
        const activeMembers = memberProfiles.filter(p => p.selected_plan && p.selected_plan !== 'free').length;
        const freeMembers = memberProfiles.filter(p => !p.selected_plan || p.selected_plan === 'free').length;
        const totalCommunity = memberProfiles.length;

        // New members this month
        const monthStart = format(startOfMonth(now), 'yyyy-MM-dd');
        const newAll = memberProfiles.filter(p => p.created_at >= monthStart);
        const newPaid = newAll.filter(p => p.selected_plan && p.selected_plan !== 'free').length;
        const newFree = newAll.filter(p => !p.selected_plan || p.selected_plan === 'free').length;
        const newThisMonth = newAll.length;

        // Sessions this week (from pt_consult_requests scheduled this week)
        const weekStart = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd\'T\'HH:mm:ss');
        const weekEnd = format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd\'T\'HH:mm:ss');
        const { data: sessions } = await supabase
          .from('pt_consult_requests')
          .select('id')
          .gte('scheduled_at', weekStart)
          .lte('scheduled_at', weekEnd)
          .eq('status', 'scheduled');
        const sessionsThisWeek = sessions?.length || 0;

        // Pending programs - members who completed onboarding but no program delivered
        const { data: pending } = await supabase
          .from('member_profiles')
          .select('id, user_id, created_at')
          .eq('program_delivered', false);

        const pendingPrograms = pending?.length || 0;

        // Get full names for awaiting members
        if (pending && pending.length > 0) {
          const userIds = pending.map(p => p.user_id);
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, selected_plan')
            .in('id', userIds);

          const merged: AwaitingMember[] = pending.map(p => {
            const prof = profiles?.find(pr => pr.id === p.user_id);
            return {
              id: p.id,
              user_id: p.user_id,
              full_name: prof?.full_name || 'Unknown',
              selected_plan: prof?.selected_plan || null,
              completed_at: p.created_at,
            };
          });
          setAwaitingMembers(merged);
        }

        setStats({ activeMembers, freeMembers, totalCommunity, newThisMonth, newPaid, newFree, sessionsThisWeek, pendingPrograms });
      } catch (e) {
        console.error('Dashboard fetch error:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <AdminLayout title="Dashboard">
      <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
        {/* Greeting */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">
            {greeting}, {firstName}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {format(now, 'EEEE, MMMM d, yyyy')}
          </p>
        </div>

        {/* Metric Cards — 2 rows of 3 */}
        <div className="space-y-3 md:space-y-4">
          {/* Row 1 — Membership Overview */}
          <div className="grid grid-cols-3 gap-3 md:gap-4">
            <Card>
              <CardContent className="p-4 md:p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-2xl md:text-3xl font-bold">{loading ? '–' : stats.activeMembers}</p>
                    <p className="text-xs text-muted-foreground mt-1">Active paid members</p>
                  </div>
                  <Users className="w-5 h-5 text-primary mt-1" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-muted bg-muted/30">
              <CardContent className="p-4 md:p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-2xl md:text-3xl font-bold text-muted-foreground">{loading ? '–' : stats.freeMembers}</p>
                    <p className="text-xs text-muted-foreground mt-1">Free members</p>
                  </div>
                  <Users className="w-5 h-5 text-muted-foreground/60 mt-1" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardContent className="p-4 md:p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-2xl md:text-3xl font-bold text-amber-600 dark:text-amber-400">{loading ? '–' : stats.totalCommunity}</p>
                    <p className="text-xs text-muted-foreground mt-1">Total community</p>
                  </div>
                  <Users className="w-5 h-5 text-amber-500 mt-1" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Row 2 — Activity & Pipeline */}
          <div className="grid grid-cols-3 gap-3 md:gap-4">
            <Card>
              <CardContent className="p-4 md:p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-2xl md:text-3xl font-bold">{loading ? '–' : stats.newThisMonth}</p>
                    <p className="text-xs text-muted-foreground mt-1">New this month</p>
                    {!loading && stats.newThisMonth > 0 && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {stats.newPaid} paid · {stats.newFree} free
                      </p>
                    )}
                  </div>
                  <UserPlus className="w-5 h-5 text-chart-2 mt-1" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 md:p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-2xl md:text-3xl font-bold">{loading ? '–' : stats.sessionsThisWeek}</p>
                    <p className="text-xs text-muted-foreground mt-1">Sessions this week</p>
                  </div>
                  <CalendarDays className="w-5 h-5 text-chart-4 mt-1" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 md:p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-2xl md:text-3xl font-bold">{loading ? '–' : stats.pendingPrograms}</p>
                    <p className="text-xs text-muted-foreground mt-1">Pending programs</p>
                  </div>
                  <ClipboardList className="w-5 h-5 text-destructive mt-1" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Two Panels */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Left Panel - Members Awaiting Program */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-muted-foreground" />
                Members awaiting program
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : awaitingMembers.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  All caught up! No members waiting.
                </p>
              ) : (
                awaitingMembers.slice(0, 5).map((member) => {
                  const daysWaiting = differenceInDays(now, new Date(member.completed_at));
                  return (
                    <div key={member.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{member.full_name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {member.selected_plan && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              {member.selected_plan}
                            </Badge>
                          )}
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {daysWaiting === 0 ? 'Today' : `${daysWaiting}d ago`}
                          </span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs ml-2 shrink-0"
                        onClick={() => navigate(`/admin/members/${member.user_id}/program`)}
                      >
                        Deliver
                        <ArrowRight className="w-3 h-3 ml-1" />
                      </Button>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Right Panel - Upcoming Sessions */}
          <UpcomingSessions />
        </div>

        {/* Cash Revenue Section */}
        <CashRevenueSection />
      </div>
    </AdminLayout>
  );
}

function UpcomingSessions() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const { data } = await supabase
          .from('pt_consult_requests')
          .select('id, user_id, scheduled_at, consult_type, notes')
          .eq('status', 'scheduled')
          .gte('scheduled_at', new Date().toISOString())
          .order('scheduled_at', { ascending: true })
          .limit(5);

        if (data && data.length > 0) {
          const userIds = data.map(s => s.user_id);
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, selected_plan, group_size')
            .in('id', userIds);

          const merged = data.map(s => {
            const prof = profiles?.find(p => p.id === s.user_id);
            return {
              ...s,
              full_name: prof?.full_name || 'Unknown',
              plan_type: prof?.selected_plan || null,
              group_size: prof?.group_size || null,
            };
          });
          setSessions(merged);
        }
      } catch (e) {
        console.error('Sessions fetch error:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchSessions();
  }, []);

  const getSessionLabel = (groupSize: string | null) => {
    if (groupSize === '2') return 'Partner';
    if (groupSize === '3') return 'Trio';
    return 'Solo';
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-muted-foreground" />
          Upcoming sessions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No upcoming sessions scheduled.
          </p>
        ) : (
          sessions.map((session) => (
            <div key={session.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{session.full_name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[11px] text-muted-foreground">
                    {format(new Date(session.scheduled_at), 'MMM d, h:mm a')}
                  </span>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {getSessionLabel(session.group_size)}
                  </Badge>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="text-xs ml-2 shrink-0"
                onClick={() => navigate(`/admin/sessions/${session.id}`)}
              >
                View
                <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
