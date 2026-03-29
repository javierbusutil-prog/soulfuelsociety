import { useLocation, Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  Dumbbell,
  MessageCircle,
  CalendarClock,
  DollarSign,
} from 'lucide-react';

const navItems = [
  { path: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/admin/members', icon: Users, label: 'Members' },
  { path: '/admin/programs', icon: Dumbbell, label: 'Programs' },
  { path: '/admin/messages', icon: MessageCircle, label: 'Messages' },
  { path: '/admin/sessions', icon: CalendarClock, label: 'Sessions' },
  { path: '/admin/revenue', icon: DollarSign, label: 'Revenue' },
];

export function AdminBottomNav() {
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/admin') return location.pathname === '/admin';
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border safe-area-bottom">
      <div className="flex justify-around items-center h-16 px-1">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              'flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-colors min-w-0',
              isActive(item.path)
                ? 'text-primary'
                : 'text-muted-foreground'
            )}
          >
            <item.icon className="w-5 h-5" />
            <span className="text-[10px] font-medium truncate">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
