import { Link, useLocation } from 'react-router-dom';
import { Users, Dumbbell, Calendar, MessageCircle, User, Apple, Flame, Lock, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

const navItems = [
  { path: '/community', icon: Users, label: 'Community' },
  { path: '/nutrition', icon: Apple, label: 'Nutrition' },
  { path: '/calendar', icon: Calendar, label: 'Calendar' },
  { path: '/workouts', icon: Dumbbell, label: 'Workouts', paidOnly: true },
  { path: '/coach', icon: MessageCircle, label: 'Coach', paidOnly: true },
  { path: '/train', icon: Flame, label: 'The Team' },
  { path: '/profile', icon: User, label: 'Profile' },
];

export function BottomNav() {
  const location = useLocation();
  const { isPaidMember, isAdmin } = useAuth();

  return (
    <nav className="tab-bar z-50" role="navigation" aria-label="Main navigation">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = location.pathname.startsWith(item.path);
          const isLocked = item.paidOnly && !isPaidMember;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              aria-current={isActive ? 'page' : undefined}
              aria-label={isLocked ? `${item.label} (locked preview)` : item.label}
              className={cn(
                "flex flex-col items-center justify-center w-14 h-full relative transition-colors duration-200",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
                isLocked && "opacity-70"
              )}
            >
              <div className="relative">
                <item.icon 
                  aria-hidden="true"
                  className={cn(
                    "w-5 h-5 transition-all duration-200",
                    isActive ? "stroke-[2]" : "stroke-[1.5]"
                  )} 
                />
                {isLocked && (
                  <Lock className="w-2.5 h-2.5 absolute -top-1 -right-1.5 text-muted-foreground" />
                )}
              </div>
              <span className={cn(
                "text-[10px] mt-1.5 font-medium tracking-wide",
                isActive && "text-primary"
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
        {isAdmin && (
          <Link
            to="/admin"
            className="flex flex-col items-center justify-center w-14 h-full relative transition-colors duration-200 text-muted-foreground hover:text-foreground"
          >
            <ShieldCheck className="w-5 h-5 stroke-[1.5]" />
            <span className="text-[10px] mt-1.5 font-medium tracking-wide">Coach</span>
          </Link>
        )}
      </div>
    </nav>
  );
}
