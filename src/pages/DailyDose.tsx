import { useEffect, useState, useCallback } from 'react';
import { format } from 'date-fns';
import { Sunrise, ChevronRight, CheckCircle2, Play } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ProgramSessionView } from '@/components/dashboard/ProgramSessionView';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { getBlocksFromSource, summarizeBlocks } from '@/lib/workoutBlocks';
import { getDateLabel } from '@/lib/dailyDose';
import { WorkoutBlocksDisplay } from '@/components/workouts/WorkoutBlocksDisplay';

interface DailyDosePost {
  id: string;
  published_date: string;
  title: string;
  coach_note: string | null;
  cover_image_url: string | null;
  workout_data: any;
  is_published: boolean;
}

const todayIso = () => format(new Date(), 'yyyy-MM-dd');
const BATCH_SIZE = 30;

function PostBlocks({ post }: { post: DailyDosePost }) {
  return (
    <WorkoutBlocksDisplay
      blocks={getBlocksFromSource(post.workout_data)}
      variant="comfortable"
      headerStyle="primary-icon"
      showNutrition={false}
      emptyState={<div className="text-sm text-muted-foreground">No workout details.</div>}
    />
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

function TodayCard({ post, logged, onLog }: { post: DailyDosePost; logged: boolean; onLog: () => void }) {
  const blocks = getBlocksFromSource(post.workout_data);
  return (
    <Card className="overflow-hidden border-primary/40 border-2 shadow-sm">
      {post.cover_image_url && (
        <img
          src={post.cover_image_url}
          alt=""
          className="w-full h-[200px] object-cover"
        />
      )}
      <div className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Badge className="bg-primary text-primary-foreground hover:bg-primary text-[10px] tracking-wider">TODAY</Badge>
          {logged && (
            <Badge variant="outline" className="text-[10px] gap-1">
              <CheckCircle2 className="w-3 h-3" /> Logged
            </Badge>
          )}
        </div>
        <h2 className="text-2xl font-bold leading-tight">{post.title}</h2>
        {post.coach_note && (
          <p className="text-sm italic text-muted-foreground whitespace-pre-wrap">{post.coach_note}</p>
        )}
        {blocks.length > 0 && (
          <p className="text-xs text-muted-foreground">{summarizeBlocks(blocks, { includeNutrition: false })}</p>
        )}
        <PostBlocks post={post} />
        {blocks.length > 0 && <LogButton logged={logged} onClick={onLog} />}
      </div>
    </Card>
  );
}

function RecentCard({ post, logged, onLog }: { post: DailyDosePost; logged: boolean; onLog: () => void }) {
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
              <h3 className="text-base font-semibold mt-0.5">{post.title}</h3>
              {blocks.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">{summarizeBlocks(blocks, { includeNutrition: false })}</p>
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
              <p className="text-sm italic text-muted-foreground whitespace-pre-wrap">{post.coach_note}</p>
            )}
            <PostBlocks post={post} />
            {blocks.length > 0 && <LogButton logged={logged} onClick={onLog} />}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

export default function DailyDose() {
  const { user } = useAuth();
  const [today, setToday] = useState<DailyDosePost | null>(null);
  const [recentPosts, setRecentPosts] = useState<DailyDosePost[]>([]);
  const [recentOffset, setRecentOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loggedPostIds, setLoggedPostIds] = useState<Set<string>>(new Set());
  const [activePost, setActivePost] = useState<DailyDosePost | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const fetchRecentPosts = useCallback(async (offset: number) => {
    const todayStr = todayIso();
    const res = await (supabase as any)
      .from('daily_dose_posts')
      .select('*')
      .eq('is_published', true)
      .lt('published_date', todayStr)
      .is('audience_user_id', null)
      .order('published_date', { ascending: false })
      .range(offset, offset + BATCH_SIZE - 1);
    return ((res?.data as DailyDosePost[]) ?? []);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const todayStr = todayIso();

    const [todayRes, recentResults] = await Promise.all([
      (supabase as any)
        .from('daily_dose_posts')
        .select('*')
        .eq('is_published', true)
        .eq('published_date', todayStr)
        .is('audience_user_id', null)
        .limit(1),
      fetchRecentPosts(0),
    ]);

    const todayPost = ((todayRes?.data as DailyDosePost[] | null) ?? [])[0] ?? null;
    const recent = recentResults;
    setToday(todayPost);
    setRecentPosts(recent);
    setRecentOffset(BATCH_SIZE);
    setHasMore(recent.length === BATCH_SIZE);

    if (user) {
      const allIds = [todayPost?.id, ...recent.map(p => p.id)].filter(Boolean) as string[];
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
    }
    setLoading(false);
  }, [user, fetchRecentPosts]);

  const handleLoadMore = useCallback(async () => {
    setLoadingMore(true);
    const next = await fetchRecentPosts(recentOffset);
    setRecentPosts(prev => [...prev, ...next]);
    setRecentOffset(prev => prev + BATCH_SIZE);
    setHasMore(next.length === BATCH_SIZE);

    if (user && next.length) {
      const ids = next.map(p => p.id);
      const { data: logs } = await (supabase as any)
        .from('workout_logs')
        .select('daily_dose_post_id')
        .eq('user_id', user.id)
        .in('daily_dose_post_id', ids)
        .not('completed_at', 'is', null);
      setLoggedPostIds(prev => {
        const merged = new Set(prev);
        ((logs as any[]) || []).forEach(l => merged.add(l.daily_dose_post_id));
        return merged;
      });
    }
    setLoadingMore(false);
  }, [fetchRecentPosts, recentOffset, user]);

  useEffect(() => {
    load();
  }, [load, reloadKey]);

  return (
    <AppLayout title="Daily Dose">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <header className="space-y-1">
          <div className="flex items-center gap-2">
            <Sunrise className="w-5 h-5 text-primary" />
            <h1 className="text-2xl font-bold">Daily Dose</h1>
          </div>
          <p className="text-sm text-muted-foreground">Today's workout, fresh from the coach.</p>
        </header>

        {loading ? (
          <div className="space-y-4">
            <div className="h-64 rounded-lg bg-muted animate-pulse" />
            <div className="h-20 rounded-lg bg-muted animate-pulse" />
          </div>
        ) : (
          <>
            {today ? (
              <TodayCard
                post={today}
                logged={loggedPostIds.has(today.id)}
                onLog={() => setActivePost(today)}
              />
            ) : (
              <Card className="p-6 text-center">
                <Sunrise className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  {recentPosts.length === 0
                    ? 'No Daily Dose posts yet. Coach will post soon.'
                    : 'No Daily Dose today — check back tomorrow.'}
                </p>
              </Card>
            )}

            {recentPosts.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-xs uppercase tracking-wider text-muted-foreground font-medium px-1">
                  Recent
                </h2>
                <div className="space-y-3">
                  {recentPosts.map(post => (
                    <RecentCard
                      key={post.id}
                      post={post}
                      logged={loggedPostIds.has(post.id)}
                      onLog={() => setActivePost(post)}
                    />
                  ))}
                </div>
                {hasMore && (
                  <div className="pt-2 flex justify-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleLoadMore}
                      disabled={loadingMore}
                    >
                      {loadingMore ? 'Loading…' : 'Load More'}
                    </Button>
                  </div>
                )}
              </section>
            )}
          </>
        )}

        {activePost && (
          <Dialog open={!!activePost} onOpenChange={o => !o && setActivePost(null)}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-base">{activePost.title}</DialogTitle>
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
    </AppLayout>
  );
}