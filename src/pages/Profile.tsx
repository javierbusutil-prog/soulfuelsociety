import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Crown, Settings, HelpCircle, LogOut, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function Profile() {
  const { user, profile, roles, isPaidMember, isAdmin, signOut } = useAuth();

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const menuItems = [
    { label: 'Settings', icon: Settings, href: '/settings' },
    { label: 'Help & Support', icon: HelpCircle, href: '/help' },
  ];

  return (
    <AppLayout title="Profile">
      <div className="max-w-lg mx-auto p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6"
        >
          <Avatar className="w-24 h-24 mx-auto mb-4">
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/20 text-primary text-2xl">
              {getInitials(profile?.full_name)}
            </AvatarFallback>
          </Avatar>
          <h1 className="text-xl font-bold">{profile?.full_name || 'User'}</h1>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
          
          <div className="flex items-center justify-center gap-2 mt-3">
            {isPaidMember ? (
              <Badge className="bg-gradient-primary text-primary-foreground">
                <Crown className="w-3 h-3 mr-1" />
                Paid Member
              </Badge>
            ) : (
              <Badge variant="secondary">Free Member</Badge>
            )}
            {isAdmin && (
              <Badge variant="outline" className="border-primary text-primary">
                Admin
              </Badge>
            )}
          </div>
        </motion.div>

        {!isPaidMember && (
          <Card className="p-4 mb-6 bg-gradient-card border-primary/30">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Crown className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-semibold">Upgrade to Paid</p>
                <p className="text-sm text-muted-foreground">Unlock 1:1 coaching & more</p>
              </div>
              <Button asChild size="sm">
                <Link to="/upgrade">Upgrade</Link>
              </Button>
            </div>
          </Card>
        )}

        <Card className="divide-y divide-border">
          {menuItems.map((item, index) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Link
                to={item.href}
                className="flex items-center gap-4 p-4 hover:bg-secondary/50 transition-colors"
              >
                <item.icon className="w-5 h-5 text-muted-foreground" />
                <span className="flex-1">{item.label}</span>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </Link>
            </motion.div>
          ))}
        </Card>

        <Button
          variant="outline"
          className="w-full mt-6 text-destructive hover:text-destructive"
          onClick={signOut}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </AppLayout>
  );
}
