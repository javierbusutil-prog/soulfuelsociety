import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Crown, UserCheck } from 'lucide-react';

interface UserWithRole {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  subscription_status: string | null;
  created_at: string;
  role: string;
}

export default function Admin() {
  const { isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [freeUsers, setFreeUsers] = useState<UserWithRole[]>([]);
  const [paidUsers, setPaidUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate('/community', { replace: true });
    }
  }, [isAdmin, authLoading, navigate]);

  useEffect(() => {
    if (!isAdmin) return;
    fetchUsers();
  }, [isAdmin]);

  const fetchUsers = async () => {
    setLoading(true);

    // Get all user roles
    const { data: roles } = await supabase
      .from('user_roles')
      .select('user_id, role');

    if (!roles) {
      setLoading(false);
      return;
    }

    // Group roles by user
    const roleMap = new Map<string, string[]>();
    roles.forEach(r => {
      const existing = roleMap.get(r.user_id) || [];
      existing.push(r.role);
      roleMap.set(r.user_id, existing);
    });

    // Get all profiles
    const userIds = Array.from(roleMap.keys());
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, subscription_status, created_at')
      .in('id', userIds);

    if (!profiles) {
      setLoading(false);
      return;
    }

    const free: UserWithRole[] = [];
    const paid: UserWithRole[] = [];

    profiles.forEach(p => {
      const userRoles = roleMap.get(p.id) || ['free'];
      const highestRole = userRoles.includes('admin') ? 'admin' 
        : userRoles.includes('pt_admin') ? 'pt_admin'
        : userRoles.includes('paid') ? 'paid' 
        : 'free';

      const user: UserWithRole = {
        ...p,
        role: highestRole,
      };

      if (highestRole === 'paid' || highestRole === 'admin' || highestRole === 'pt_admin') {
        paid.push(user);
      } else {
        free.push(user);
      }
    });

    setFreeUsers(free);
    setPaidUsers(paid);
    setLoading(false);
  };

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin': return <Badge className="bg-primary text-primary-foreground">Admin</Badge>;
      case 'pt_admin': return <Badge className="bg-accent text-accent-foreground">PT Admin</Badge>;
      case 'paid': return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Paid</Badge>;
      default: return <Badge variant="secondary">Free</Badge>;
    }
  };

  if (authLoading || !isAdmin) return null;

  const UserList = ({ users, emptyMsg }: { users: UserWithRole[]; emptyMsg: string }) => (
    <div className="space-y-2">
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : users.length === 0 ? (
        <p className="text-muted-foreground text-center py-8 text-sm">{emptyMsg}</p>
      ) : (
        users.map(user => (
          <div key={user.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                {getInitials(user.full_name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.full_name || 'Unnamed User'}</p>
              <p className="text-xs text-muted-foreground">
                Joined {new Date(user.created_at).toLocaleDateString()}
              </p>
            </div>
            {getRoleBadge(user.role)}
          </div>
        ))
      )}
    </div>
  );

  return (
    <AppLayout>
      <div className="p-4 pb-24 max-w-2xl mx-auto space-y-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-display font-medium">Admin Dashboard</h1>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{freeUsers.length}</p>
              <p className="text-xs text-muted-foreground">Free Users</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{paidUsers.length}</p>
              <p className="text-xs text-muted-foreground">Paid / Admin</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="free">
          <TabsList className="w-full">
            <TabsTrigger value="free" className="flex-1 gap-1.5 text-xs">
              <UserCheck className="w-3.5 h-3.5" />
              Free ({freeUsers.length})
            </TabsTrigger>
            <TabsTrigger value="paid" className="flex-1 gap-1.5 text-xs">
              <Crown className="w-3.5 h-3.5" />
              Paid ({paidUsers.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="free">
            <UserList users={freeUsers} emptyMsg="No free users yet" />
          </TabsContent>
          <TabsContent value="paid">
            <UserList users={paidUsers} emptyMsg="No paid users yet" />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
