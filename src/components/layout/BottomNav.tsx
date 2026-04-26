import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Users, Dumbbell, Calendar, MessageCircle, User, Apple, Flame, Lock, ShieldCheck, Sunrise, MoreHorizontal, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

const navItems = [
  { path: '/daily-dose', icon: Sunrise, label: 'Daily Dose' },
  { path: '/workouts', icon: Dumbbell, label: 'Workouts', paidOnly: true },
  { path: '/calendar', icon: Calendar, label: 'Calendar' },
  { path: '/nutrition', icon: Apple, label: 'Nutrition' },
  { path: '/community', icon: Users, label: 'Community' },
  { path: '/profile', icon: User, label: 'Profile' },
];

const moreItems = [
  { path: '/coach', icon: MessageCircle, label: 'Coach', paidOnly: true },
  { path: '/train', icon: Flame, label: 'The Team' },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isPaidMember, isAdmin } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);

  const isMoreActive = moreItems.some((item) => location.pathname.startsWith(item.path));

  const handleMoreItemClick = (path: string) => {
    setMoreOpen(false);
    navigate(path);
  };

  return (
    <>
      <nav className="tab-bar z-50" role="navigation" aria-label="Main navigation">
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto overflow-x-auto">
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

          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-label="More"
            aria-expanded={moreOpen}
            className={cn(
              "flex flex-col items-center justify-center w-14 h-full relative transition-colors duration-200",
              (moreOpen || isMoreActive) ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <MoreHorizontal
              aria-hidden="true"
              className={cn(
                "w-5 h-5 transition-all duration-200",
                (moreOpen || isMoreActive) ? "stroke-[2]" : "stroke-[1.5]"
              )}
            />
            <span className={cn(
              "text-[10px] mt-1.5 font-medium tracking-wide",
              (moreOpen || isMoreActive) && "text-primary"
            )}>
              More
            </span>
          </button>

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

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl pb-8">
          <SheetHeader className="mb-4">
            <SheetTitle>More</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col">
            {moreItems.map((item) => {
              const isLocked = item.paidOnly && !isPaidMember;
              return (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => handleMoreItemClick(item.path)}
                  aria-label={isLocked ? `${item.label} (locked preview)` : item.label}
                  className={cn(
                    "flex items-center justify-between w-full py-4 px-2 text-left border-b border-border last:border-b-0 transition-colors hover:bg-muted/50 rounded-md",
                    isLocked && "opacity-70"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <item.icon className="w-5 h-5 stroke-[1.5] text-foreground" aria-hidden="true" />
                      {isLocked && (
                        <Lock className="w-2.5 h-2.5 absolute -top-1 -right-1.5 text-muted-foreground" />
                      )}
                    </div>
                    <span className="text-base font-medium text-foreground">{item.label}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                </button>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
