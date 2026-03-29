import { Link, useLocation } from 'react-router-dom';
import { Users, Dumbbell, Calendar, MessageCircle, User, Apple, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

const navItems = [
  { path: '/community', icon: Users, label: 'Community' },
  { path: '/train', icon: Flame, label: 'Train' },
  { path: '/workouts', icon: Dumbbell, label: 'Workouts', paidOnly: true },
  { path: '/nutrition', icon: Apple, label: 'Nutrition' },
  { path: '/calendar', icon: Calendar, label: 'Calendar' },
  { path: '/coach', icon: MessageCircle, label: 'Coach', paidOnly: true },
  { path: '/profile', icon: User, label: 'Profile' },
];

export function BottomNav() {
  const location = useLocation();
  const { isPaidMember } = useAuth();

  return (
    <nav className="tab-bar z-50" role="navigation" aria-label="Main navigation">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = location.pathname.startsWith(item.path);
          const isLocked = item.paidOnly && !isPaidMember;
          
          return (
            <Link
              key={item.path}
              to={isLocked ? '/upgrade' : item.path}
              aria-current={isActive ? 'page' : undefined}
              aria-label={isLocked ? `${item.label} (requires upgrade)` : item.label}
              className={cn(
                "flex flex-col items-center justify-center w-16 h-full relative transition-colors duration-200",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
                isLocked && "opacity-50"
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
      </div>
    </nav>
  );
}
