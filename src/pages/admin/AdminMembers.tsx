import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Search, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

interface MemberRow {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  selected_plan: string | null;
  session_count: number | null;
  group_size: string | null;
  created_at: string;
  program_delivered: boolean;
  isPaid: boolean;
}

export default function AdminMembers() {
  const navigate = useNavigate();
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [memberTypeFilter, setMemberTypeFilter] = useState('all');

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    setLoading(true);

    // Fetch all profiles and paid roles in parallel
    const [profilesRes, rolesRes, memberProfilesRes] = await Promise.all([
      supabase.from('profiles').select('id, full_name, avatar_url, selected_plan, session_count, group_size, created_at'),
      supabase.from('user_roles').select('user_id, role'),
      supabase.from('member_profiles').select('user_id, program_delivered'),
    ]);

    const paidSet = new Set<string>();
    rolesRes.data?.forEach(r => {
      if (r.role === 'paid' || r.role === 'admin' || r.role === 'pt_admin') paidSet.add(r.user_id);
    });

    const deliveredMap = new Map<string, boolean>();
    memberProfilesRes.data?.forEach(mp => deliveredMap.set(mp.user_id, mp.program_delivered));

    const rows: MemberRow[] = (profilesRes.data || []).map(p => ({
      id: p.id,
      full_name: p.full_name,
      avatar_url: p.avatar_url,
      selected_plan: p.selected_plan,
      session_count: p.session_count,
      group_size: p.group_size,
      created_at: p.created_at,
      program_delivered: deliveredMap.get(p.id) ?? false,
      isPaid: paidSet.has(p.id),
    }));

    // Sort paid first, then by name
    rows.sort((a, b) => {
      if (a.isPaid !== b.isPaid) return a.isPaid ? -1 : 1;
      return (a.full_name || '').localeCompare(b.full_name || '');
    });

    setMembers(rows);
    setLoading(false);
  };

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getPlanLabel = (plan: string | null, isPaid: boolean) => {
    if (!isPaid) return 'Free';
    if (!plan) return 'Paid';
    if (plan.toLowerCase().includes('online')) return 'Online';
    if (plan.toLowerCase().includes('person')) return 'In-person';
    return plan;
  };

  const isInPerson = (plan: string | null) => {
    return plan?.toLowerCase().includes('person') ?? false;
  };

  const getGroupLabel = (size: string | null) => {
    if (size === '2') return 'Partner';
    if (size === '3') return 'Trio';
    return 'Solo';
  };

  const filtered = members.filter(m => {
    if (search) {
      const q = search.toLowerCase();
      if (!(m.full_name || '').toLowerCase().includes(q)) return false;
    }
    if (memberTypeFilter === 'paid' && !m.isPaid) return false;
    if (memberTypeFilter === 'free' && m.isPaid) return false;
    if (planFilter === 'online' && !m.selected_plan?.toLowerCase().includes('online')) return false;
    if (planFilter === 'inperson' && !m.selected_plan?.toLowerCase().includes('person')) return false;
    if (statusFilter === 'delivered' && !m.program_delivered) return false;
    if (statusFilter === 'pending' && m.program_delivered) return false;
    return true;
  });

  return (
    <AdminLayout title="Members">
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={memberTypeFilter} onValueChange={setMemberTypeFilter}>
            <SelectTrigger className="w-full sm:w-[130px]">
              <SelectValue placeholder="Member type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All members</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="free">Free</SelectItem>
            </SelectContent>
          </Select>
          <Select value={planFilter} onValueChange={setPlanFilter}>
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue placeholder="Plan type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All plans</SelectItem>
              <SelectItem value="online">Online</SelectItem>
              <SelectItem value="inperson">In-person</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="Program status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <p className="text-xs text-muted-foreground">{filtered.length} member{filtered.length !== 1 ? 's' : ''}</p>

        {/* Member List */}
        <div className="space-y-2">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">No members found.</p>
          ) : (
            filtered.map(member => (
              <Card
                key={member.id}
                className="p-3 md:p-4 cursor-pointer hover:bg-muted/40 transition-colors"
                onClick={() => navigate(`/admin/members/${member.id}`)}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 shrink-0">
                    {member.avatar_url && <AvatarImage src={member.avatar_url} />}
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                      {getInitials(member.full_name)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{member.full_name || 'Unnamed'}</p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        {getPlanLabel(member.selected_plan)}
                      </Badge>
                      {isInPerson(member.selected_plan) && member.session_count && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {member.session_count} sessions
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {getGroupLabel(member.group_size)}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground hidden sm:inline">
                        Since {format(new Date(member.created_at), 'MMM yyyy')}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {member.program_delivered ? (
                      <Badge className="bg-chart-2/15 text-chart-2 border-chart-2/30 text-[10px]">Delivered</Badge>
                    ) : (
                      <Badge className="bg-yellow-500/15 text-yellow-600 border-yellow-500/30 text-[10px]">Pending</Badge>
                    )}
                    <ChevronRight className="w-4 h-4 text-muted-foreground hidden sm:block" />
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
