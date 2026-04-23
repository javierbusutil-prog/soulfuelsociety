import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { DailyDoseFormDialog, DailyDosePost } from '@/components/admin/DailyDoseFormDialog';

const todayIso = () => format(new Date(), 'yyyy-MM-dd');

type StatusKind = 'draft' | 'scheduled' | 'live' | 'published';

function getStatus(p: DailyDosePost): StatusKind {
  const today = todayIso();
  if (!p.is_published) return 'draft';
  if (p.published_date > today) return 'scheduled';
  if (p.published_date === today) return 'live';
  return 'published';
}

function StatusPill({ kind }: { kind: StatusKind }) {
  if (kind === 'draft') {
    return <Badge variant="secondary" className="text-[10px]">Draft</Badge>;
  }
  if (kind === 'scheduled') {
    return <Badge className="text-[10px] bg-primary/15 text-primary hover:bg-primary/15 border-transparent">Scheduled</Badge>;
  }
  if (kind === 'live') {
    return (
      <Badge className="text-[10px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/15 border-transparent gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        Live today
      </Badge>
    );
  }
  return <Badge variant="outline" className="text-[10px]">Published</Badge>;
}

export default function AdminDailyDose() {
  const [posts, setPosts] = useState<DailyDosePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<DailyDosePost | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DailyDosePost | null>(null);

  const fetchPosts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('daily_dose_posts' as any)
      .select('*')
      .order('published_date', { ascending: false });
    if (error) {
      toast.error('Failed to load posts');
      console.error(error);
    } else {
      setPosts((data || []) as unknown as DailyDosePost[]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchPosts(); }, []);

  const handleNew = () => {
    setEditingPost(null);
    setDialogOpen(true);
  };

  const handleEdit = (p: DailyDosePost) => {
    setEditingPost(p);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase
      .from('daily_dose_posts' as any)
      .delete()
      .eq('id', deleteTarget.id);
    if (error) {
      toast.error('Failed to delete: ' + error.message);
    } else {
      toast.success('Post deleted');
      fetchPosts();
    }
    setDeleteTarget(null);
  };

  return (
    <AdminLayout title="Daily Dose">
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              Daily workout posts published to all members.
            </p>
          </div>
          <Button onClick={handleNew} className="gap-1.5">
            <Plus className="w-4 h-4" /> New post
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : posts.length === 0 ? (
          <Card>
            <CardContent className="p-10 text-center">
              <p className="text-sm text-muted-foreground">
                No Daily Dose posts yet. Tap <span className="font-medium text-foreground">New post</span> to create your first.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {posts.map(p => {
              const status = getStatus(p);
              const dateLabel = format(new Date(p.published_date + 'T00:00:00'), 'EEE, MMM d, yyyy');
              return (
                <Card key={p.id}>
                  <CardContent className="p-3 md:p-4 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-xs text-muted-foreground">{dateLabel}</p>
                        <StatusPill kind={status} />
                      </div>
                      <p className="text-sm font-semibold mt-0.5 truncate">{p.title}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button size="sm" variant="ghost" onClick={() => handleEdit(p)} className="gap-1 h-8">
                        <Pencil className="w-3.5 h-3.5" /> Edit
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setDeleteTarget(p)}
                        className="h-8 w-8 text-destructive"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <DailyDoseFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        post={editingPost}
        onSaved={fetchPosts}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this Daily Dose post?</AlertDialogTitle>
            <AlertDialogDescription>
              Members who logged workouts from it will keep their workout history, but the post itself will be gone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
