import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function UpgradeBanner() {
  const { isPaidMember, user } = useAuth();
  const [dismissed, setDismissed] = useState(false);

  // Only show for logged-in free users
  if (!user || isPaidMember || dismissed) return null;

  return (
    <div className="mx-4 mt-2 mb-0 rounded-xl border-l-4 border-l-[hsl(265,60%,55%)] bg-[hsl(265,60%,96%)] dark:bg-[hsl(265,30%,15%)] px-4 py-3 flex items-center gap-3 relative">
      <Sparkles className="w-5 h-5 text-[hsl(265,60%,55%)] shrink-0 hidden sm:block" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground leading-tight">Ready to train with a real coach?</p>
        <p className="text-xs text-muted-foreground mt-0.5">Get a personalized program and 1:1 access to Javier & Elizabeth.</p>
      </div>
      <Button asChild size="sm" variant="outline" className="shrink-0 text-xs border-[hsl(265,60%,55%)] text-[hsl(265,60%,55%)] hover:bg-[hsl(265,60%,90%)]">
        <Link to="/train">See plans</Link>
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
