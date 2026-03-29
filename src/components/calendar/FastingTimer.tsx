import { useState } from 'react';
import { motion } from 'framer-motion';
import { Timer, Play, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useFastingSessions, formatTimerDisplay } from '@/hooks/useFastingSessions';
import { useAuth } from '@/contexts/AuthContext';
import { NutritionDisclaimerLabel } from '@/components/nutrition/NutritionDisclaimerLabel';

interface FastingTimerProps {
  onFastStarted?: () => void;
  onFastEnded?: () => void;
}

export function FastingTimer({ onFastStarted, onFastEnded }: FastingTimerProps) {
  const { user } = useAuth();
  const { activeSession, elapsedSeconds, startFast, endFast, loading } = useFastingSessions();
  const [showEndConfirmation, setShowEndConfirmation] = useState(false);
  const [isEnding, setIsEnding] = useState(false);

  const isFasting = !!activeSession;

  const handleStartFast = async () => {
    const success = await startFast();
    if (success && onFastStarted) {
      onFastStarted();
    }
  };

  const handleEndFast = async () => {
    setIsEnding(true);
    const success = await endFast();
    setIsEnding(false);
    setShowEndConfirmation(false);
    if (success && onFastEnded) {
      onFastEnded();
    }
  };

  if (!user) {
    return null;
  }

  return (
    <>
      <Card className="p-4 border border-border bg-card/50">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            isFasting ? 'bg-success/20' : 'bg-muted'
          }`}>
            <Timer className={`w-5 h-5 ${isFasting ? 'text-success' : 'text-muted-foreground'}`} />
          </div>
          
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className={`text-sm font-medium ${isFasting ? 'text-success' : 'text-muted-foreground'}`}>
                {isFasting ? 'Fasting' : 'Not fasting'}
              </span>
              {isFasting && (
                <motion.div
                  className="w-2 h-2 rounded-full bg-success"
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              )}
            </div>
            
            {isFasting && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="font-mono text-2xl font-semibold tracking-wider text-foreground"
              >
                {formatTimerDisplay(elapsedSeconds)}
              </motion.div>
            )}
          </div>

          {isFasting ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowEndConfirmation(true)}
              disabled={loading || isEnding}
              className="border-destructive/50 text-destructive hover:bg-destructive/10"
            >
              <Square className="w-4 h-4 mr-1" />
              End Fast
            </Button>
          ) : (
            <Button
              variant="default"
              size="sm"
              onClick={handleStartFast}
              disabled={loading}
            >
              <Play className="w-4 h-4 mr-1" />
              Start Fast
            </Button>
          )}
        </div>
        <NutritionDisclaimerLabel />
      </Card>

      <AlertDialog open={showEndConfirmation} onOpenChange={setShowEndConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>End fast now?</AlertDialogTitle>
            <AlertDialogDescription>
              You've been fasting for {formatTimerDisplay(elapsedSeconds)}. This will complete your fast and add it to your calendar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isEnding}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleEndFast} disabled={isEnding}>
              {isEnding ? 'Ending...' : 'End Fast'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
