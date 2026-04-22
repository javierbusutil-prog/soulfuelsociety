import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, ChevronDown, ChevronRight, Minus, Play, RotateCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { startOfWeek, differenceInWeeks } from 'date-fns';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { NutritionDisclaimerLabel } from '@/components/nutrition/NutritionDisclaimerLabel';
import { MovementExerciseRow } from './MovementExerciseRow';
import { ProgramSessionView } from './ProgramSessionView';

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

interface DayPlan {
  isRest: boolean;
  restNote?: string;
  blocks: any[];
}

interface WeekPlan {
  days: DayPlan[];
}

function mergeAdjacentBlocks(blocks: any[]): any[] {
  const out: any[] = [];
  for (const b of blocks) {
    const last = out[out.length - 1];
    if (last && last.type === b.type && (b.type === 'strength' || b.type === 'mobility')) {
      last.exercises = [...(last.exercises || []), ...(b.exercises || [])];
    } else {
      out.push(JSON.parse(JSON.stringify(b)));
    }
  }
  return out;
}

function getDaySummary(day: DayPlan): string {
  if (day.isRest) return 'Rest day';
  const merged = mergeAdjacentBlocks(day.blocks);
  const parts: string[] = [];
  for (const block of merged) {
    if (block.type === 'strength') {
      const c = block.exercises?.length || 0;
      parts.push(`Strength · ${c} exercise${c !== 1 ? 's' : ''}`);
    }
    else if (block.type === 'cardio') parts.push('Cardio');
    else if (block.type === 'mobility') {
      const c = block.exercises?.length || 0;
      parts.push(`Mobility${c ? ` · ${c} exercise${c !== 1 ? 's' : ''}` : ''}`);
    }
    else if (block.type === 'nutrition') parts.push('Nutrition');
  }
  return parts.join(' + ') || 'Active day';
}

export function SupplementalProgramCard() {
  const { user } = useAuth();
  const [program, setProgram] = useState<{ id: string; weeks: WeekPlan[]; created_at: string } | null>(null);
  const [currentWeekIdx, setCurrentWeekIdx] = useState(0);
  const [expandedDay, setExpandedDay] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [inProgressDays, setInProgressDays] = useState<Set<number>>(new Set());
  const [activeSession, setActiveSession] = useState<{ week: number; day: number } | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await supabase
        .from('coaching_programs')
        .select('id, program_data, created_at')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .eq('plan_type', 'inperson_supplemental' as any)
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        const pd = data.program_data as any;
        if (pd?.weeks && Array.isArray(pd.weeks)) {
          const programStart = startOfWeek(new Date(data.created_at), { weekStartsOn: 1 });
          const now = startOfWeek(new Date(), { weekStartsOn: 1 });
          const weekDiff = differenceInWeeks(now, programStart);
          const idx = Math.max(0, Math.min(weekDiff, pd.weeks.length - 1));
          setCurrentWeekIdx(idx);
          setProgram({ id: data.id, weeks: pd.weeks, created_at: data.created_at });

          const { data: logs } = await (supabase as any)
            .from('workout_logs')
            .select('program_day')
            .eq('user_id', user.id)
            .eq('coaching_program_id', data.id)
            .eq('program_week', idx)
            .is('completed_at', null);
          if (logs) {
            setInProgressDays(new Set(logs.map((l: any) => l.program_day)));
          }
        }
      }
      setLoading(false);
    };
    fetch();
  }, [user, reloadKey]);

  if (loading || !program) return null;

  const week = program.weeks[currentWeekIdx];

  return (
    <Card className="p-4 space-y-3 border-accent/30 bg-accent/5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-accent-foreground" />
          <h3 className="text-sm font-semibold">Between-session work</h3>
        </div>
        <Badge variant="outline" className="text-[10px]">
          Week {currentWeekIdx + 1} of {program.weeks.length}
        </Badge>
      </div>

      <div className="space-y-1">
        {week.days.map((day, di) => (
          <Collapsible
            key={di}
            open={expandedDay === di}
            onOpenChange={() => setExpandedDay(expandedDay === di ? null : di)}
          >
            <CollapsibleTrigger className="w-full flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors text-left">
              {expandedDay === di ? (
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              )}
              <span className="text-sm font-medium w-20 shrink-0">{DAY_NAMES[di]}</span>
              <span className="text-xs text-muted-foreground flex-1 truncate">{getDaySummary(day)}</span>
              {day.isRest && <Minus className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />}
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="ml-7 mr-3 mb-2 space-y-2">
                {day.isRest ? (
                  <p className="text-xs text-muted-foreground italic">{day.restNote || 'Rest and recover.'}</p>
                ) : (
                  mergeAdjacentBlocks(day.blocks).map((block: any, bi: number) => (
                    <div key={bi} className="bg-muted/40 rounded-lg p-2.5 space-y-1.5">
                      <p className="text-[10px] uppercase tracking-wider text-primary font-medium">{block.type}</p>
                      {block.type === 'strength' && block.exercises?.map((ex: any, ei: number) => (
                        <MovementExerciseRow
                          key={ei}
                          name={ex.name}
                          movementId={ex.movementId}
                          meta={`${ex.sets}×${ex.reps}${ex.weight ? ` @ ${ex.weight} lb` : ''}`}
                        />
                      ))}
                      {block.type === 'cardio' && <p className="text-xs">{block.activity} — {block.duration}</p>}
                      {block.type === 'mobility' && block.exercises?.map((ex: any, ei: number) => (
                        <MovementExerciseRow
                          key={ei}
                          name={ex.name}
                          movementId={ex.movementId}
                          meta={ex.duration}
                        />
                      ))}
                      {block.type === 'nutrition' && (
                        <>
                          <p className="text-xs whitespace-pre-wrap">{block.content}</p>
                          <NutritionDisclaimerLabel variant="coach-note" />
                        </>
                      )}
                    </div>
                  ))
                )}
                {!day.isRest && day.blocks.length > 0 && (
                  <Button
                    size="sm"
                    variant={inProgressDays.has(di) ? 'secondary' : 'default'}
                    className="w-full text-xs gap-1.5 mt-2"
                    onClick={() => setActiveSession({ week: currentWeekIdx, day: di })}
                  >
                    {inProgressDays.has(di) ? (
                      <>
                        <RotateCw className="w-3.5 h-3.5" /> Resume workout
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5" /> Start workout
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>

      <div className="pt-2 border-t border-border">
        <Button asChild size="sm" variant="outline" className="w-full text-xs">
          <Link to="/workouts">View full program</Link>
        </Button>
      </div>

      {activeSession && program && (
        <Dialog open={!!activeSession} onOpenChange={o => !o && setActiveSession(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base">
                {DAY_NAMES[activeSession.day]} · Week {activeSession.week + 1}
              </DialogTitle>
            </DialogHeader>
            <ProgramSessionView
              programId={program.id}
              week={activeSession.week}
              day={activeSession.day}
              dayBlocks={program.weeks[activeSession.week].days[activeSession.day].blocks}
              onBack={() => {
                setActiveSession(null);
                setReloadKey(k => k + 1);
              }}
              onComplete={() => {
                setActiveSession(null);
                setReloadKey(k => k + 1);
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}
