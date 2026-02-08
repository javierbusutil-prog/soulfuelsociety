import { useState } from 'react';
import { motion } from 'framer-motion';
import { Flame, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { FastSession, formatDuration } from '@/hooks/useFastingSessions';

interface FastSessionEntryProps {
  session: FastSession;
  index: number;
  onDelete: (sessionId: string) => Promise<boolean>;
}

export function FastSessionEntry({ session, index, onDelete }: FastSessionEntryProps) {
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    await onDelete(session.id);
    setIsDeleting(false);
    setShowDeleteConfirmation(false);
  };

  const durationDisplay = session.duration_minutes 
    ? formatDuration(session.duration_minutes) 
    : 'Unknown duration';

  return (
    <>
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.05 }}
      >
        <Card className="p-4 border bg-success/10 border-success/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-success/20">
              <Flame className="w-5 h-5 text-success" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm">Fast</h4>
              <p className="text-sm text-muted-foreground">{durationDisplay}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowDeleteConfirmation(true)}
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      </motion.div>

      <AlertDialog open={showDeleteConfirmation} onOpenChange={setShowDeleteConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete fast entry?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the {durationDisplay} fast from your calendar. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
