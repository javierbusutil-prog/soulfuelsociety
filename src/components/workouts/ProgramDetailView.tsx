import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  Plus, 
  Edit2, 
  Trash2, 
  CheckCircle,
  Eye,
  EyeOff,
  Save,
  Download,
  FileText,
  LogOut
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { toast } from '@/hooks/use-toast';
import { WorkoutProgram, WorkoutSessionTemplate, DAYS_OF_WEEK, SessionContent } from '@/types/workoutPrograms';
import { useSessionTemplates } from '@/hooks/useWorkoutPrograms';
import { EnrollProgramDialog } from './EnrollProgramDialog';
import { ExerciseLink } from './ExerciseLink';

interface ProgramDetailViewProps {
  program: WorkoutProgram;
  isAdmin: boolean;
  isEnrolled: boolean;
  onBack: () => void;
  onUpdate: (id: string, updates: Partial<WorkoutProgram>) => Promise<WorkoutProgram>;
  onEnrollmentChange: () => void;
}

export function ProgramDetailView({ 
  program, 
  isAdmin, 
  isEnrolled,
  onBack, 
  onUpdate,
  onEnrollmentChange,
}: ProgramDetailViewProps) {
  const { sessions, createSession, updateSession, deleteSession, refetch } = useSessionTemplates(program.id);
  const [editingSession, setEditingSession] = useState<WorkoutSessionTemplate | null>(null);
  const [isAddingSession, setIsAddingSession] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // New session form state
  const [newSession, setNewSession] = useState({
    week: 1,
    index: 1,
    title: '',
    notes: '',
  });

  const handleTogglePublish = async () => {
    try {
      await onUpdate(program.id, { published: !program.published });
      toast({ 
        title: program.published ? 'Program unpublished' : 'Program published!',
        description: program.published 
          ? 'Users can no longer see this program' 
          : 'Users can now view and enroll in this program'
      });
    } catch (error) {
      toast({ title: 'Failed to update', variant: 'destructive' });
    }
  };

  const handleAddSession = async () => {
    if (!newSession.title.trim()) {
      toast({ title: 'Session title required', variant: 'destructive' });
      return;
    }

    try {
      await createSession({
        program_id: program.id,
        week_number: newSession.week,
        session_index: newSession.index,
        title: newSession.title.trim(),
        content_json: { notes: newSession.notes } as SessionContent,
      });
      toast({ title: 'Session added!' });
      setIsAddingSession(false);
      setNewSession({ week: 1, index: 1, title: '', notes: '' });
    } catch (error) {
      toast({ title: 'Failed to add session', variant: 'destructive' });
    }
  };

  const handleDeleteSession = async (id: string) => {
    try {
      await deleteSession(id);
      toast({ title: 'Session deleted' });
      setDeleteConfirm(null);
    } catch (error) {
      toast({ title: 'Failed to delete', variant: 'destructive' });
    }
  };

  // Group sessions by week
  const sessionsByWeek = sessions.reduce((acc, session) => {
    if (!acc[session.week_number]) {
      acc[session.week_number] = [];
    }
    acc[session.week_number].push(session);
    return acc;
  }, {} as Record<number, WorkoutSessionTemplate[]>);

  return (
    <div className="max-w-lg mx-auto p-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="font-bold text-xl">{program.title}</h1>
          {!program.ebook_url && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              {program.weeks} weeks • {program.frequency_per_week}x/week
            </div>
          )}
        </div>
        {isAdmin && (
          <Button
            variant={program.published ? 'outline' : 'default'}
            size="sm"
            onClick={handleTogglePublish}
          >
            {program.published ? (
              <>
                <EyeOff className="w-4 h-4 mr-1" />
                Unpublish
              </>
            ) : (
              <>
                <Eye className="w-4 h-4 mr-1" />
                Publish
              </>
            )}
          </Button>
        )}
      </div>

      {/* Description */}
      {program.description && (
        <Card className="p-4 mb-4 bg-card/50">
          <p className="text-sm text-muted-foreground">{program.description}</p>
        </Card>
      )}

      {/* E-Book Program */}
      {program.ebook_url ? (
        <Card className="p-6 bg-card/50 text-center">
          <FileText className="w-16 h-16 mx-auto mb-4 text-primary/60" />
          <h2 className="font-semibold text-lg mb-2">E-Book Program</h2>
          {program.description && (
            <p className="text-sm text-muted-foreground mb-6">{program.description}</p>
          )}
          <div className="flex flex-col gap-2">
            <Button asChild>
              <a href={program.ebook_url} target="_blank" rel="noopener noreferrer">
                <Eye className="w-4 h-4 mr-2" />
                View E-Book
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a href={program.ebook_url} download>
                <Download className="w-4 h-4 mr-2" />
                Download
              </a>
            </Button>
          </div>
        </Card>
      ) : (
        <>
          {/* Enrollment Status / Button */}
          {!isAdmin && (
            <div className="mb-6">
              {isEnrolled ? (
                <Card className="p-4 bg-success/10 border-success/30">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-6 h-6 text-success" />
                    <div className="flex-1">
                      <p className="font-medium">You're enrolled!</p>
                      <p className="text-sm text-muted-foreground">
                        Check your calendar for scheduled workouts
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full mt-3 text-destructive hover:text-destructive hover:bg-destructive/10 gap-2"
                    onClick={async () => {
                      try {
                        // Delete calendar events for this program
                        await supabase
                          .from('calendar_events')
                          .delete()
                          .eq('linked_program_id', program.id);
                        // Delete enrollment
                        await supabase
                          .from('user_program_enrollments')
                          .delete()
                          .eq('program_id', program.id);
                        onEnrollmentChange();
                        toast({ title: 'Unenrolled from program' });
                      } catch {
                        toast({ title: 'Failed to unenroll', variant: 'destructive' });
                      }
                    }}
                  >
                    <LogOut className="w-4 h-4" />
                    Unenroll
                  </Button>
                </Card>
              ) : (
                <EnrollProgramDialog 
                  program={program} 
                  sessions={sessions}
                  onEnrolled={onEnrollmentChange}
                />
              )}
            </div>
          )}

          {/* Week breakdown */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Program Schedule</h2>
              {isAdmin && (
                <Button size="sm" onClick={() => setIsAddingSession(true)}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add Session
                </Button>
              )}
            </div>

            {Array.from({ length: program.weeks }, (_, i) => i + 1).map(week => {
              const weekSessions = sessionsByWeek[week] || [];
              
              return (
                <Card key={week} className="p-4 bg-card/50">
                  <h3 className="font-medium mb-3 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary" />
                    Week {week}
                  </h3>
                  
                  {weekSessions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No sessions added yet
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {weekSessions.map((session, idx) => (
                        <motion.div
                          key={session.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg"
                        >
                          <Badge variant="outline" className="shrink-0">
                            Day {session.session_index}
                          </Badge>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{session.title}</p>
                            {session.content_json?.exercises && session.content_json.exercises.length > 0 && (
                              <div className="mt-1 space-y-0.5">
                                {session.content_json.exercises.map((ex, exIdx) => (
                                  <div key={exIdx} className="text-xs text-muted-foreground flex items-center gap-1">
                                    <ExerciseLink exerciseName={ex.name} />
                                    {ex.sets && ex.reps && (
                                      <span className="text-muted-foreground/60">
                                        — {ex.sets}×{ex.reps}
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                            {session.content_json?.notes && !session.content_json?.exercises?.length && (
                              <p className="text-xs text-muted-foreground truncate">
                                {session.content_json.notes}
                              </p>
                            )}
                          </div>
                          {isAdmin && (
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => setEditingSession(session)}
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                onClick={() => setDeleteConfirm(session.id)}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* Add Session Dialog */}
      <Dialog open={isAddingSession} onOpenChange={setIsAddingSession}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Session</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Week</Label>
                <Input
                  type="number"
                  min={1}
                  max={program.weeks}
                  value={newSession.week}
                  onChange={(e) => setNewSession({ ...newSession, week: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Session #</Label>
                <Input
                  type="number"
                  min={1}
                  max={program.frequency_per_week}
                  value={newSession.index}
                  onChange={(e) => setNewSession({ ...newSession, index: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={newSession.title}
                onChange={(e) => setNewSession({ ...newSession, title: e.target.value })}
                placeholder="e.g., Upper Body Strength"
              />
            </div>
            <div className="space-y-2">
              <Label>Notes / Workout Content</Label>
              <Textarea
                value={newSession.notes}
                onChange={(e) => setNewSession({ ...newSession, notes: e.target.value })}
                placeholder="Exercise details, sets, reps..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddingSession(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddSession}>Add Session</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Session Dialog */}
      {editingSession && (
        <EditSessionDialog
          session={editingSession}
          open={!!editingSession}
          onOpenChange={(open) => !open && setEditingSession(null)}
          onSave={async (updates) => {
            await updateSession(editingSession.id, updates);
            setEditingSession(null);
            toast({ title: 'Session updated!' });
          }}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Session?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The session will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteConfirm && handleDeleteSession(deleteConfirm)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function EditSessionDialog({ 
  session, 
  open, 
  onOpenChange, 
  onSave 
}: { 
  session: WorkoutSessionTemplate;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (updates: Partial<WorkoutSessionTemplate>) => Promise<void>;
}) {
  const [title, setTitle] = useState(session.title);
  const [notes, setNotes] = useState(session.content_json?.notes || '');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      await onSave({
        title,
        content_json: { ...session.content_json, notes } as SessionContent,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Session</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Notes / Workout Content</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            <Save className="w-4 h-4 mr-1" />
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
