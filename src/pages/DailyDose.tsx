import { useEffect, useState, useCallback } from 'react';
import { format, parseISO, differenceInCalendarDays, subDays } from 'date-fns';
import { Sunrise, ChevronRight, Bike, Dumbbell, Heart, CheckCircle2, Play } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MovementExerciseRow } from '@/components/dashboard/MovementExerciseRow';
import { ProgramSessionView } from '@/components/dashboard/ProgramSessionView';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

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

function getDateLabel(dateStr: string): string {
  const d = parseISO(dateStr);
  const diff = differenceInCalendarDays(new Date(), d);
  if (diff === 1) return 'Yesterday';
  return format(d, 'EEE, MMM d');
}

function getBlocks(workoutData: any): any[] {
  if (!workoutData) return [];
  if (Array.isArray(workoutData)) return workoutData;
  if (Array.isArray(workoutData?.blocks)) return workoutData.blocks;
  return [];
}

function getBlockSummary(blocks: any[]): string {
  const parts: string[] = [];
  const strength = blocks.filter(b => b.type === 'strength');
  const cardio = blocks.filter(b => b.type === 'cardio');
  const mobility = blocks.filter(b => b.type === 'mobility');
  if (strength.length) {
    const count = strength.reduce((n, b) => n + (b.exercises?.length || 0), 0);
    parts.push(`Strength · ${count} exercise${count !== 1 ? 's' : ''}`);
  }
  if (cardio.length) {
    parts.push(`Cardio · ${cardio.length} ${cardio.length === 1 ? 'activity' : 'activities'}`);
  }
  if (mobility.length) {
    const count = mobility.reduce((n, b) => n + (b.exercises?.length || 0), 0);
    parts.push(`Mobility · ${count} exercise${count !== 1 ? 's' : ''}`);
  }
  return parts.join(' + ') || 'Workout';
}

function BlockDetail({ blocks }: { blocks: any[] }) {
  if (!blocks.length) {
    return <p className="text-xs text-muted-foreground italic">No workout details.</p>;
  }
  return (
    <div className="space-y-2">
      {blocks.map((block, bi) => (
        <div key={bi} className="bg-muted/40 rounded-lg p-3 space-y-1.5">
          {block.type === 'strength' && (
            <>
              <div className="flex items-center gap-1.5">
                <Dumbbell className="w-3 h-3 text-primary" />
                <p className="text-[10px] uppercase tracking-wider text-primary font-medium">Strength</p>
              </div>
              {block.exercises?.map((ex: any, ei: number) => (
                <MovementExerciseRow
                  key={ei}
                  name={ex.name || 'Exercise'}
                  movementId={ex.movementId}
                  meta={`${ex.sets || ''}${ex.sets && ex.reps ? '×' : ''}${ex.reps || ''}${ex.weight ? ` @ ${ex.weight} lb` : ''}`}
                />
              ))}
            </>
          )}
          {block.type === 'cardio' && (
            <>
              <div className="flex items-center gap-1.5">
                <Bike className="w-3 h-3 text-primary" />
                <p className="text-[10px] uppercase tracking-wider text-primary font-medium">Cardio</p>
              </div>
              <p className="text-xs">
                {block.activity || 'Cardio'}{block.duration ? ` — ${block.duration}` : ''}
              </p>
              {block.intensity && (
                <p className="text-[11px] text-muted-foreground">Intensity: {block.intensity}</p>
              )}
              {block.note && <p className="text-[11px] text-muted-foreground italic">{block.note}</p>}
            </>
          )}
          {block.type === 'mobility' && (
            <>
              <div className="flex items-center gap-1.5">
                <Heart className="w-3 h-3 text-primary" />
                <p className="text-[10px] uppercase tracking-wider text-primary font-medium">Mobility</p>
              </div>
              {block.exercises?.map((ex: any, ei: number) => (
                <MovementExerciseRow
                  key={ei}
                  name={ex.name || 'Stretch'}
                  movementId={ex.movementId}
                  meta={`${ex.duration || ''}${ex.side && ex.side !== 'both' ? ` (${ex.side})` : ''}`}
                />
              ))}
            </>
          )}
        </div>
      ))}
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

function TodayCard({ post, logged, onLog }: { post: DailyDosePost; logged: boolean; onLog: () => void }) {
  const blocks = getBlocks(post.workout_data);
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
        <p className="text-xs text-muted-foreground">{getBlockSummary(blocks)}</p>
        <BlockDetail blocks={blocks} />
        <LogButton logged={logged} onClick={onLog} />
      </div>
    </Card>
  );
}

function RecentCard({ post, logged, onLog }: { post: DailyDosePost; logged: boolean; onLog: () => void }) {
  const [open, setOpen] = useState(false);
  const blocks = getBlocks(post.workout_data);
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
              <p className="text-xs text-muted-foreground mt-1">{getBlockSummary(blocks)}</p>
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
            <BlockDetail blocks={blocks} />
            <LogButton logged={logged} onClick={onLog} />
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

export default function DailyDose() {
  const { user } = useAuth();
  const [today, setToday] = useState<DailyDosePost | null>(null);
  const [recent, setRecent] = useState<DailyDosePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loggedPostIds, setLoggedPostIds] = useState<Set<string>>(new Set());
  const [activePost, setActivePost] = useState<DailyDosePost | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    const todayStr = todayIso();
    const fourteenAgo = format(subDays(new Date(), 14), 'yyyy-MM-dd');

    const [todayRes, recentRes] = await Promise.all([
      (supabase as any)
        .from('daily_dose_posts')
        .select('*')
        .eq('is_published', true)
        .eq('published_date', todayStr)
        .maybeSingle(),
      (supabase as any)
        .from('daily_dose_posts')
        .select('*')
        .eq('is_published', true)
        .lt('published_date', todayStr)
        .gte('published_date', fourteenAgo)
        .order('published_date', { ascending: false }),
    ]);

    const todayPost = (todayRes?.data as DailyDosePost | null) ?? null;
    const recentPosts = ((recentRes?.data as DailyDosePost[]) ?? []);
    setToday(todayPost);
    setRecent(recentPosts);

    if (user) {
      const allIds = [todayPost?.id, ...recentPosts.map(p => p.id)].filter(Boolean) as string[];
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
  }, [user]);

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
                  {recent.length === 0
                    ? 'No Daily Dose posts yet. Coach will post soon.'
                    : 'No Daily Dose today — check back tomorrow.'}
                </p>
              </Card>
            )}

            {recent.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-xs uppercase tracking-wider text-muted-foreground font-medium px-1">
                  Recent
                </h2>
                <div className="space-y-3">
                  {recent.map(post => (
                    <RecentCard
                      key={post.id}
                      post={post}
                      logged={loggedPostIds.has(post.id)}
                      onLog={() => setActivePost(post)}
                    />
                  ))}
                </div>
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
                dayBlocks={getBlocks(activePost.workout_data)}
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