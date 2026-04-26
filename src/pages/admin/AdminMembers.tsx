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
import { Search, ChevronRight, DollarSign, UserPlus, Mail, X } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { RecordPaymentDialog } from '@/components/admin/RecordPaymentDialog';
import { InviteClientDialog } from '@/components/admin/InviteClientDialog';
import { toast } from 'sonner';

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
  sessions_remaining: number | null;
  membership_expires_at: string | null;
}

interface PendingInvite {
  id: string;
  email: string;
  full_name: string;
  note: string | null;
  created_at: string;
}

export default function AdminMembers() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [memberTypeFilter, setMemberTypeFilter] = useState('all');
  const [paymentDialogMember, setPaymentDialogMember] = useState<MemberRow | null>(null);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);

  useEffect(() => {
    fetchMembers();
    fetchPendingInvites();
  }, []);

  const fetchPendingInvites = async () => {
    const { data } = await supabase
      .from('client_invitations')
      .select('id, email, full_name, note, created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    setPendingInvites((data as PendingInvite[]) || []);
  };

  const handleResend = async (invite: PendingInvite) => {
    setResendingId(invite.id);
    try {
      const { error } = await supabase.functions.invoke('send-client-invite', {
        body: { email: invite.email, full_name: invite.full_name, note: invite.note },
      });
      if (error) throw error;
      toast.success(`Invite resent to ${invite.full_name}`);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to resend invite');
    } finally {
      setResendingId(null);
    }
  };

  const handleCancelInvite = async (invite: PendingInvite) => {
    if (!confirm(`Cancel invite for ${invite.full_name}?`)) return;
    const { error } = await supabase.from('client_invitations').delete().eq('id', invite.id);
    if (error) {
      toast.error('Failed to cancel invite');
      return;
    }
    toast.success('Invite cancelled');
    fetchPendingInvites();
  };

  const fetchMembers = async () => {
    setLoading(true);

    // Fetch all profiles and paid roles in parallel
    const [profilesRes, rolesRes, memberProfilesRes] = await Promise.all([
      supabase.from('profiles').select('id, full_name, avatar_url, selected_plan, session_count, group_size, created_at, sessions_remaining, membership_expires_at'),
      supabase.from('user_roles').select('user_id, role'),
      supabase.from('member_profiles').select('user_id, program_delivered'),
    ]);

    const paidSet = new Set<string>();
    const adminSet = new Set<string>();
    rolesRes.data?.forEach(r => {
      if (r.role === 'admin' || r.role === 'pt_admin') adminSet.add(r.user_id);
      if (r.role === 'paid') paidSet.add(r.user_id);
    });

    const deliveredMap = new Map<string, boolean>();
    memberProfilesRes.data?.forEach(mp => deliveredMap.set(mp.user_id, mp.program_delivered));

    // Exclude admins/coaches from the member list
    const rows: MemberRow[] = (profilesRes.data || [])
      .filter(p => !adminSet.has(p.id))
      .map(p => ({
        id: p.id,
        full_name: p.full_name,
        avatar_url: p.avatar_url,
        selected_plan: p.selected_plan,
        session_count: p.session_count,
        group_size: p.group_size,
        created_at: p.created_at,
        program_delivered: deliveredMap.get(p.id) ?? false,
        isPaid: paidSet.has(p.id),
        sessions_remaining: (p as any).sessions_remaining ?? null,
        membership_expires_at: (p as any).membership_expires_at ?? null,
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

  const renderManualStatusBadge = (m: MemberRow) => {
    const sessions = m.sessions_remaining;
    const expires = m.membership_expires_at ? new Date(m.membership_expires_at) : null;
    const now = new Date();

    if (sessions !== null && sessions > 0) {
      return (
        <Badge className="bg-blue-500/15 text-blue-600 border-blue-500/30 text-[10px]">
          {sessions} sessions left
        </Badge>
      );
    }
    if (sessions === 0) {
      return (
        <Badge className="bg-red-500/15 text-red-600 border-red-500/30 text-[10px]">
          Sessions exhausted
        </Badge>
      );
    }
    if (expires && expires.getTime() > now.getTime()) {
      return (
        <Badge className="bg-green-500/15 text-green-600 border-green-500/30 text-[10px]">
          Active until {format(expires, 'MMM d')}
        </Badge>
      );
    }
    if (expires && expires.getTime() <= now.getTime()) {
      return (
        <Badge className="bg-red-500/15 text-red-600 border-red-500/30 text-[10px]">
          Expired
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-muted-foreground/30 text-muted-foreground">
        No payment recorded
      </Badge>
    );
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
        {/* Invite Client */}
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setInviteDialogOpen(true)} className="gap-2">
            <UserPlus className="w-4 h-4" />
            Invite Client
          </Button>
        </div>

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
                      {member.isPaid ? (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          {getPlanLabel(member.selected_plan, member.isPaid)}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-muted-foreground/30 text-muted-foreground">
                          Free
                        </Badge>
                      )}
                      {member.isPaid && isInPerson(member.selected_plan) && member.session_count && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {member.session_count} sessions
                        </Badge>
                      )}
                      {member.isPaid && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {getGroupLabel(member.group_size)}
                        </Badge>
                      )}
                      {renderManualStatusBadge(member)}
                      <span className="text-[10px] text-muted-foreground hidden sm:inline">
                        Since {format(new Date(member.created_at), 'MMM yyyy')}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {member.isPaid ? (
                      member.program_delivered ? (
                        <Badge className="bg-chart-2/15 text-chart-2 border-chart-2/30 text-[10px]">Delivered</Badge>
                      ) : (
                        <Badge className="bg-yellow-500/15 text-yellow-600 border-yellow-500/30 text-[10px]">Pending</Badge>
                      )
                    ) : null}
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 gap-1 text-[11px]"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPaymentDialogMember(member);
                      }}
                    >
                      <DollarSign className="w-3 h-3" />
                      Record Payment
                    </Button>
                    <ChevronRight className="w-4 h-4 text-muted-foreground hidden sm:block" />
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Pending Invites */}
        {pendingInvites.length > 0 && (
          <div className="space-y-2 pt-4">
            <h2 className="text-sm font-semibold text-muted-foreground">
              Pending Invites ({pendingInvites.length})
            </h2>
            <div className="space-y-2">
              {pendingInvites.map((invite) => (
                <Card key={invite.id} className="p-3 md:p-4 bg-muted/20">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Mail className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{invite.full_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{invite.email}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Invited {format(new Date(invite.created_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-[11px]"
                        disabled={resendingId === invite.id}
                        onClick={() => handleResend(invite)}
                      >
                        {resendingId === invite.id ? 'Sending...' : 'Resend'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => handleCancelInvite(invite)}
                        aria-label="Cancel invite"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {paymentDialogMember && user && (
        <RecordPaymentDialog
          open={!!paymentDialogMember}
          onOpenChange={(open) => !open && setPaymentDialogMember(null)}
          memberId={paymentDialogMember.id}
          memberName={paymentDialogMember.full_name || 'Unnamed'}
          coachId={user.id}
          onSuccess={() => {
            setPaymentDialogMember(null);
            fetchMembers();
          }}
        />
      )}

      {user && (
        <InviteClientDialog
          open={inviteDialogOpen}
          onOpenChange={setInviteDialogOpen}
          coachId={user.id}
          onSuccess={fetchPendingInvites}
        />
      )}
    </AdminLayout>
  );
}
