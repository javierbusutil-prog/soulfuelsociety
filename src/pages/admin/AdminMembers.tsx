import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { Users, Crown } from 'lucide-react';

interface UserWithRole {
  id: string;
  full_name: string | null;
  subscription_status: string | null;
  created_at: string;
  role: string;
}

export default function AdminMembers() {
  const [freeUsers, setFreeUsers] = useState<UserWithRole[]>([]);
  const [paidUsers, setPaidUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    const { data: roles } = await supabase.from('user_roles').select('user_id, role');
    if (!roles) { setLoading(false); return; }

    const roleMap = new Map<string, string[]>();
    roles.forEach(r => {
      const existing = roleMap.get(r.user_id) || [];
      existing.push(r.role);
      roleMap.set(r.user_id, existing);
    });

    const userIds = Array.from(roleMap.keys());
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, subscription_status, created_at')
      .in('id', userIds);

    if (!profiles) { setLoading(false); return; }

    const free: UserWithRole[] = [];
    const paid: UserWithRole[] = [];

    profiles.forEach(p => {
      const userRoles = roleMap.get(p.id) || ['free'];
      const highestRole = userRoles.includes('admin') ? 'admin'
        : userRoles.includes('pt_admin') ? 'pt_admin'
        : userRoles.includes('paid') ? 'paid'
        : 'free';

      const user: UserWithRole = { ...p, role: highestRole };
      if (['paid', 'admin', 'pt_admin'].includes(highestRole)) {
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
      case 'admin': return <Badge className="bg-primary text-primary-foreground">Coach</Badge>;
      case 'pt_admin': return <Badge className="bg-accent text-accent-foreground">PT</Badge>;
      case 'paid': return <Badge className="bg-accent/20 text-accent-foreground border-accent/30">Paid</Badge>;
      default: return <Badge variant="secondary">Free</Badge>;
    }
  };

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
    <AdminLayout title="Members">
      <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4">
        <Tabs defaultValue="free">
          <TabsList className="w-full">
            <TabsTrigger value="free" className="flex-1 gap-1.5 text-xs">
              <Users className="w-3.5 h-3.5" />
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
    </AdminLayout>
  );
}
