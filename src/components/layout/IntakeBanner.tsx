import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { X, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function IntakeBanner() {
  const { isPaidMember, profile, user } = useAuth();
  const [dismissed, setDismissed] = useState(false);

  // Show only for paid members who haven't submitted intake
  if (!user || !isPaidMember || profile?.intake_submitted || dismissed) return null;

  return (
    <div className="mx-4 mt-2 mb-0 rounded-xl border-l-4 border-l-primary bg-primary/5 dark:bg-primary/10 px-4 py-3 flex items-center gap-3 relative">
      <ClipboardList className="w-5 h-5 text-primary shrink-0 hidden sm:block" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground leading-tight">Welcome to Soul Fuel!</p>
        <p className="text-xs text-muted-foreground mt-0.5">Your coach is ready for you. Complete your intake form to get started.</p>
      </div>
      <Button asChild size="sm" className="shrink-0 text-xs">
        <Link to="/intake">Start intake form</Link>
      </Button>
      <button
        onClick={() => setDismissed(true)}
        className="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors shrink-0"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4 text-muted-foreground" />
      </button>
    </div>
  );
}
