import { Link, useLocation } from 'react-router-dom';
import { Home, Dumbbell, Calendar, MessageCircle, ShoppingBag, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';

const navItems = [
  { path: '/community', icon: Home, label: 'Home' },
  { path: '/workouts', icon: Dumbbell, label: 'Workouts' },
  { path: '/calendar', icon: Calendar, label: 'Calendar' },
  { path: '/coach', icon: MessageCircle, label: 'Coach', paidOnly: true },
  { path: '/store', icon: ShoppingBag, label: 'Store' },
  { path: '/profile', icon: User, label: 'Profile' },
];

export function BottomNav() {
  const location = useLocation();
  const { isPaidMember } = useAuth();

  return (
    <nav className="tab-bar z-50">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = location.pathname.startsWith(item.path);
          const isLocked = item.paidOnly && !isPaidMember;
          
          return (
            <Link
              key={item.path}
              to={isLocked ? '/upgrade' : item.path}
              className={cn(
                "flex flex-col items-center justify-center w-16 h-full relative transition-colors duration-200",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
                isLocked && "opacity-50"
              )}
            >
              <div className="relative">
                <item.icon className={cn("w-6 h-6", isActive && "stroke-[2.5]")} />
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full"
                    transition={{ type: "spring", bounce: 0.3, duration: 0.5 }}
                  />
                )}
              </div>
              <span className={cn(
                "text-[10px] mt-1 font-medium",
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
