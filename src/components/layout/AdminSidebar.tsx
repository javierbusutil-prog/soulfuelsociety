import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  Dumbbell,
  MessageCircle,
  CalendarClock,
  DollarSign,
  LogOut,
  ArrowLeftCircle,
  Clock,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import logoWordmark from '@/assets/logo-wordmark.svg';

const navItems = [
  { path: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/admin/members', icon: Users, label: 'Members' },
  { path: '/admin/programs', icon: Dumbbell, label: 'Programs' },
  { path: '/admin/messages', icon: MessageCircle, label: 'Messages' },
  { path: '/admin/sessions', icon: CalendarClock, label: 'Sessions' },
  { path: '/admin/availability', icon: Clock, label: 'Availability' },
  { path: '/admin/revenue', icon: DollarSign, label: 'Revenue' },
];

export function AdminSidebar() {
  const location = useLocation();
  const { profile, signOut } = useAuth();

  const isActive = (path: string) => {
    if (path === '/admin') return location.pathname === '/admin';
    return location.pathname.startsWith(path);
  };

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <aside className="hidden md:flex flex-col w-56 border-r border-border bg-card/50 h-screen sticky top-0">
      {/* Logo */}
      <div className="h-14 flex items-center px-5 border-b border-border">
        <img src={logoWordmark} alt="Soul Fuel" className="h-5 w-auto" />
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-3 space-y-0.5">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
              isActive(item.path)
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            )}
          >
            <item.icon className="w-4 h-4" />
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Profile footer */}
      <div className="p-3 border-t border-border space-y-2">
        <div className="flex items-center gap-3 px-3 py-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs bg-primary/10 text-primary">
              {getInitials(profile?.full_name || null)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{profile?.full_name || 'Coach'}</p>
            <p className="text-xs text-muted-foreground">Coach</p>
          </div>
        </div>
        <Link
          to="/community"
          className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors w-full"
        >
          <ArrowLeftCircle className="w-4 h-4" />
          Member view
        </Link>
        <button
          onClick={signOut}
          className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors w-full"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
