import { useLocation, Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  MessageCircle,
  CalendarClock,
  DollarSign,
  Clock,
  ArrowLeftRight,
  MessagesSquare,
  Activity,
  Sunrise,
} from 'lucide-react';
import { useCoachCommunityNotifications } from '@/hooks/useCoachCommunityNotifications';

const navItems = [
  { path: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/admin/members', icon: Users, label: 'Members' },
  { path: '/admin/movements', icon: Activity, label: 'Moves' },
  { path: '/admin/daily-dose', icon: Sunrise, label: 'Dose' },
  { path: '/admin/community', icon: MessagesSquare, label: 'Community', hasBadge: true },
  { path: '/admin/messages', icon: MessageCircle, label: 'Messages' },
  { path: '/admin/sessions', icon: CalendarClock, label: 'Sessions' },
  { path: '/admin/availability', icon: Clock, label: 'Hours' },
];

export function AdminBottomNav() {
  const location = useLocation();
  const { unreadCount, markAsRead } = useCoachCommunityNotifications();

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
            onClick={() => {
              if (item.hasBadge) markAsRead();
            }}
            className={cn(
              'flex flex-col items-center gap-0.5 px-1.5 py-1.5 rounded-lg transition-colors min-w-0 relative',
              isActive(item.path)
                ? 'text-primary'
                : 'text-muted-foreground'
            )}
          >
            <div className="relative">
              <item.icon className="w-5 h-5" />
              {item.hasBadge && unreadCount > 0 && (
                <span className="absolute -top-1 -right-2 min-w-[14px] h-[14px] flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[8px] font-bold px-0.5">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
            <span className="text-[10px] font-medium truncate">{item.label}</span>
          </Link>
        ))}
        <Link
          to="/community"
          className="flex flex-col items-center gap-0.5 px-1.5 py-1.5 rounded-lg transition-colors min-w-0 text-muted-foreground"
        >
          <ArrowLeftRight className="w-5 h-5" />
          <span className="text-[10px] font-medium truncate">Member</span>
        </Link>
      </div>
    </nav>
  );
}
