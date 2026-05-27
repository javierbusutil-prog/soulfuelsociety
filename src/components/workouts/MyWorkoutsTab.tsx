import { useEffect, useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ChevronRight, Dumbbell, CheckCircle2, Play } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { WorkoutBlocksDisplay } from '@/components/workouts/WorkoutBlocksDisplay';
import { ProgramSessionView } from '@/components/dashboard/ProgramSessionView';
import { getBlocksFromSource } from '@/lib/workoutBlocks';
import { summarizeBlocks, getDateLabel } from '@/lib/dailyDose';

interface MyWorkoutPost {
  id: string;
  title: string | null;
  coach_note: string | null;
  workout_data: any;
  published_date: string;
}

export function MyWorkoutsTab() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<MyWorkoutPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loggedPostIds, setLoggedPostIds] = useState<Set<string>>(new Set());
  const [activePost, setActivePost] = useState<MyWorkoutPost | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('daily_dose_posts')
      .select('id, title, coach_note, workout_data, published_date')
      .eq('audience_user_id', user.id)
      .eq('is_published', true)
      .order('published_date', { ascending: false });

    if (error) {
      console.error('MyWorkoutsTab: failed to load posts', error);
      setPosts([]);
      setLoggedPostIds(new Set());
      setLoading(false);
      return;
    }

    const loaded = (data ?? []) as MyWorkoutPost[];
    setPosts(loaded);

    const allIds = loaded.map(p => p.id);
    if (allIds.length) {
      const { data: logs } = await (supabase as any)
        .from('workout_logs')
        .select('daily_dose_post_id')
        .eq('user_id', user.id)
        .in('daily_dose_post_id', allIds)
        .not('completed_at', 'is', null);
      setLoggedPostIds(new Set(((logs as any[]) || []).map(l => l.daily_dose_post_id)));
    } else {
      setLoggedPostIds(new Set());
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load, reloadKey]);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-20 rounded-lg bg-muted animate-pulse" />
        <div className="h-20 rounded-lg bg-muted animate-pulse" />
        <div className="h-20 rounded-lg bg-muted animate-pulse" />
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Dumbbell className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
        <p className="text-sm font-medium">No workouts yet</p>
        <p className="text-xs text-muted-foreground mt-1">
          Your coach will post your workouts here.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {posts.map((post) => (
        <MyWorkoutCard
          key={post.id}
          post={post}
          logged={loggedPostIds.has(post.id)}
          onLog={() => setActivePost(post)}
        />
      ))}

      {activePost && (
        <Dialog open={!!activePost} onOpenChange={o => !o && setActivePost(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base">{activePost.title ?? 'Workout'}</DialogTitle>
            </DialogHeader>
            <ProgramSessionView
              source={{ kind: 'daily_dose', postId: activePost.id }}
              dayBlocks={getBlocksFromSource(activePost.workout_data)}
              onBack={() => {
                setActivePost(null);
                setReloadKey(k => k + 1);
              }}
              onComplete={() => {
                setActivePost(null);
                setReloadKey(k => k + 1);
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function LogButton({ logged, onClick }: { logged: boolean; onClick: () => void }) {
  return (
    <Button
      onClick={onClick}
      className="w-full gap-1.5"
      size="sm"
      variant={logged ? 'outline' : 'default'}
    >
      {logged ? (
        <>
          <CheckCircle2 className="w-3.5 h-3.5" /> View logged workout
        </>
      ) : (
        <>
          <Play className="w-3.5 h-3.5" /> Log this workout
        </>
      )}
    </Button>
  );
}

function MyWorkoutCard({ post, logged, onLog }: { post: MyWorkoutPost; logged: boolean; onLog: () => void }) {
  const [open, setOpen] = useState(false);
  const blocks = getBlocksFromSource(post.workout_data);
  return (
    <Card className="overflow-hidden">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="w-full text-left p-4 hover:bg-muted/50 transition-colors">
          <div className="flex items-start gap-3">
            <div className={cn('mt-1 shrink-0 transition-transform', open && 'rotate-90')}>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                {getDateLabel(post.published_date)}
              </p>
              <h3 className="text-base font-semibold mt-0.5">
                {post.title ?? 'Untitled workout'}
              </h3>
              {blocks.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  {summarizeBlocks(blocks, { includeNutrition: false })}
                </p>
              )}
            </div>
            {logged && (
              <CheckCircle2 className="w-4 h-4 text-primary fill-primary/15 shrink-0 mt-1" />
            )}
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-4 pl-11 space-y-3">
            {post.coach_note && (
              <p className="text-sm italic text-muted-foreground whitespace-pre-wrap">
                {post.coach_note}
              </p>
            )}
            <WorkoutBlocksDisplay
              blocks={blocks}
              variant="comfortable"
              headerStyle="primary-icon"
              showNutrition={false}
              emptyState={
                <div className="text-sm text-muted-foreground">No workout details.</div>
              }
            />
            {blocks.length > 0 && <LogButton logged={logged} onClick={onLog} />}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}