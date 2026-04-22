import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dumbbell, Check, ChevronDown, ChevronRight, Minus, Play, RotateCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { startOfWeek, differenceInWeeks, format, addDays } from 'date-fns';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { NutritionDisclaimerLabel } from '@/components/nutrition/NutritionDisclaimerLabel';
import { MovementExerciseRow } from './MovementExerciseRow';
import { ProgramSessionView } from './ProgramSessionView';

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

interface Block {
  type: string;
  exercises?: any[];
  activity?: string;
  content?: string;
}

interface DayPlan {
  isRest: boolean;
  restNote?: string;
  blocks: Block[];
}

interface WeekPlan {
  days: DayPlan[];
  nutritionNote?: string;
}

function getDaySummary(day: DayPlan): string {
  if (day.isRest) return 'Rest day';
  const parts: string[] = [];
  for (const block of day.blocks) {
    if (block.type === 'strength') {
      const count = block.exercises?.length || 0;
      parts.push(`Strength · ${count} exercise${count !== 1 ? 's' : ''}`);
    } else if (block.type === 'cardio') {
      parts.push(`Cardio${block.activity ? ` · ${block.activity}` : ''}`);
    } else if (block.type === 'mobility') {
      parts.push('Mobility');
    } else if (block.type === 'nutrition') {
      parts.push('Nutrition guidance');
    }
  }
  return parts.join(' + ') || 'Active day';
}

export function OnlineProgramCard() {
  const { user } = useAuth();
  const [program, setProgram] = useState<{ weeks: WeekPlan[]; created_at: string } | null>(null);
  const [currentWeekIdx, setCurrentWeekIdx] = useState(0);
  const [expandedDay, setExpandedDay] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await supabase
        .from('coaching_programs')
        .select('program_data, created_at')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .eq('plan_type', 'online' as any)
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
          setProgram({ weeks: pd.weeks, created_at: data.created_at });
        }
      }
      setLoading(false);
    };
    fetch();
  }, [user]);

  if (loading) return null;

  if (!program) {
    return (
      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Dumbbell className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">Your program</h3>
        </div>
        <p className="text-xs text-muted-foreground">Your coach hasn't delivered a program yet. Check back soon!</p>
      </Card>
    );
  }

  const week = program.weeks[currentWeekIdx];
  const totalWeeks = program.weeks.length;

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Dumbbell className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">Your program</h3>
        </div>
        <Badge variant="outline" className="text-[10px]">
          Week {currentWeekIdx + 1} of {totalWeeks}
        </Badge>
      </div>

      <div className="space-y-1">
        {week.days.map((day, di) => (
          <Collapsible
            key={di}
            open={expandedDay === di}
            onOpenChange={() => setExpandedDay(expandedDay === di ? null : di)}
          >
            <CollapsibleTrigger className="w-full flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-muted/50 transition-colors text-left">
              {expandedDay === di ? (
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              )}
              <span className="text-sm font-medium w-20 shrink-0">{DAY_NAMES[di]}</span>
              <span className="text-xs text-muted-foreground flex-1 truncate">
                {getDaySummary(day)}
              </span>
              {day.isRest ? (
                <Minus className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
              ) : (
                <div className="w-4 h-4 rounded-full border border-border shrink-0" />
              )}
            </CollapsibleTrigger>

            <CollapsibleContent>
              <div className="ml-7 mr-3 mb-2 space-y-2">
                {day.isRest ? (
                  <p className="text-xs text-muted-foreground italic">
                    {day.restNote || 'Rest and recover.'}
                  </p>
                ) : (
                  day.blocks.map((block, bi) => (
                    <div key={bi} className="bg-muted/40 rounded-lg p-2.5 space-y-1.5">
                      {block.type === 'strength' && (
                        <>
                          <p className="text-[10px] uppercase tracking-wider text-primary font-medium">Strength</p>
                          {block.exercises?.map((ex: any, ei: number) => (
                            <MovementExerciseRow
                              key={ei}
                              name={ex.name || 'Exercise'}
                              movementId={ex.movementId}
                              meta={`${ex.sets}×${ex.reps}${ex.weight ? ` @ ${ex.weight}` : ''}`}
                            />
                          ))}
                        </>
                      )}
                      {block.type === 'cardio' && (
                        <>
                          <p className="text-[10px] uppercase tracking-wider text-primary font-medium">Cardio</p>
                          <p className="text-xs">{block.activity || 'Cardio'} — {(block as any).duration || ''}</p>
                          {(block as any).intensity && (
                            <p className="text-[11px] text-muted-foreground">Intensity: {(block as any).intensity}</p>
                          )}
                        </>
                      )}
                      {block.type === 'mobility' && (
                        <>
                          <p className="text-[10px] uppercase tracking-wider text-primary font-medium">Mobility</p>
                          {block.exercises?.map((ex: any, ei: number) => (
                            <MovementExerciseRow
                              key={ei}
                              name={ex.name || 'Stretch'}
                              movementId={ex.movementId}
                              meta={`${ex.duration}${ex.side && ex.side !== 'both' ? ` (${ex.side})` : ''}`}
                            />
                          ))}
                        </>
                      )}
                      {block.type === 'nutrition' && (
                        <>
                          <p className="text-[10px] uppercase tracking-wider text-primary font-medium">Nutrition</p>
                          <p className="text-xs whitespace-pre-wrap">{block.content}</p>
                          <NutritionDisclaimerLabel variant="coach-note" />
                        </>
                      )}
                    </div>
                  ))
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
    </Card>
  );
}
