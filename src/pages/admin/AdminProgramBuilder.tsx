import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  ArrowLeft, Plus, Trash2, Dumbbell, Heart, Bike,
  Apple, Eye, Send, ChevronDown, ChevronRight, AlertTriangle,
  Copy, CopyPlus
} from 'lucide-react';

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const WEEK_LABELS = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];

type BlockType = 'strength' | 'cardio' | 'mobility' | 'nutrition';

interface StrengthExercise {
  name: string;
  sets: string;
  reps: string;
  weight: string;
  note: string;
}

interface StrengthBlock { type: 'strength'; exercises: StrengthExercise[]; }
interface CardioBlock { type: 'cardio'; activity: string; duration: string; intensity: string; note: string; }
interface MobilityExercise { name: string; duration: string; side: string; note: string; }
interface MobilityBlock { type: 'mobility'; exercises: MobilityExercise[]; }
interface NutritionBlock { type: 'nutrition'; content: string; }
type Block = StrengthBlock | CardioBlock | MobilityBlock | NutritionBlock;

interface DayPlan {
  isRest: boolean;
  restNote: string;
  blocks: Block[];
}

interface WeekPlan {
  days: DayPlan[];
  nutritionNote: string; // week-level nutrition
}

interface MemberContext {
  full_name: string | null;
  fitness_level: string;
  primary_goal: string;
  training_days_per_week: number;
  injuries_limitations: string | null;
  preferred_days: string[] | null;
  selected_plan: string | null;
}

const emptyDay = (): DayPlan => ({ isRest: true, restNote: '', blocks: [] });
const emptyWeek = (): WeekPlan => ({ days: DAY_NAMES.map(() => emptyDay()), nutritionNote: '' });

export default function AdminProgramBuilder() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [context, setContext] = useState<MemberContext | null>(null);
  const [weeks, setWeeks] = useState<WeekPlan[]>(WEEK_LABELS.map(() => emptyWeek()));
  const [loading, setLoading] = useState(true);
  const [delivering, setDelivering] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [openWeeks, setOpenWeeks] = useState<Set<number>>(new Set([0]));
  const [openDays, setOpenDays] = useState<Set<string>>(new Set());
  const [existingVersion, setExistingVersion] = useState(0);
  const [isUpdate, setIsUpdate] = useState(false);

  useEffect(() => {
    if (id) fetchContext(id);
  }, [id]);

  const fetchContext = async (userId: string) => {
    setLoading(true);
    const [{ data: prof }, { data: mp }] = await Promise.all([
      supabase.from('profiles').select('full_name, selected_plan').eq('id', userId).single(),
      supabase.from('member_profiles').select('fitness_level, primary_goal, training_days_per_week, injuries_limitations, preferred_days').eq('user_id', userId).single(),
    ]);

    if (prof && mp) {
      setContext({ full_name: prof.full_name, selected_plan: prof.selected_plan, ...(mp as any) });
    }

    const isSupplemental = prof?.selected_plan === 'in-person';
    const planTypeFilter = isSupplemental ? 'inperson_supplemental' : 'online';

    const { data: existingProg } = await supabase
      .from('coaching_programs')
      .select('version, program_data')
      .eq('user_id', userId)
      .eq('is_active', true)
      .eq('plan_type', planTypeFilter as any)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingProg) {
      setExistingVersion(existingProg.version);
      setIsUpdate(true);
      const pd = existingProg.program_data as any;
      if (pd?.weeks && Array.isArray(pd.weeks)) {
        setWeeks(pd.weeks);
        setOpenWeeks(new Set([0]));
      }
    }
    setLoading(false);
  };

  const toggleWeek = (wi: number) => {
    setOpenWeeks(prev => {
      const n = new Set(prev);
      n.has(wi) ? n.delete(wi) : n.add(wi);
      return n;
    });
  };

  const dayKey = (wi: number, di: number) => `${wi}-${di}`;
  const toggleDay = (wi: number, di: number) => {
    const k = dayKey(wi, di);
    setOpenDays(prev => {
      const n = new Set(prev);
      n.has(k) ? n.delete(k) : n.add(k);
      return n;
    });
  };

  const updateDay = (wi: number, di: number, updater: (d: DayPlan) => DayPlan) => {
    setWeeks(prev => prev.map((w, i) => i !== wi ? w : {
      ...w,
      days: w.days.map((d, j) => j !== di ? d : updater(d))
    }));
  };

  const setDayRest = (wi: number, di: number, isRest: boolean) => {
    updateDay(wi, di, d => ({ ...d, isRest, blocks: isRest ? [] : d.blocks }));
    if (!isRest) setOpenDays(prev => new Set(prev).add(dayKey(wi, di)));
  };

  const addBlock = (wi: number, di: number, type: BlockType) => {
    const newBlock: Block = type === 'strength'
      ? { type: 'strength', exercises: [{ name: '', sets: '3', reps: '10', weight: '', note: '' }] }
      : type === 'cardio'
      ? { type: 'cardio', activity: '', duration: '', intensity: '', note: '' }
      : type === 'mobility'
      ? { type: 'mobility', exercises: [{ name: '', duration: '', side: 'both', note: '' }] }
      : { type: 'nutrition', content: '' };
    updateDay(wi, di, d => ({ ...d, blocks: [...d.blocks, newBlock] }));
  };

  const removeBlock = (wi: number, di: number, bi: number) => {
    updateDay(wi, di, d => ({ ...d, blocks: d.blocks.filter((_, i) => i !== bi) }));
  };

  const moveBlock = (wi: number, di: number, bi: number, dir: -1 | 1) => {
    updateDay(wi, di, d => {
      const blocks = [...d.blocks];
      const target = bi + dir;
      if (target < 0 || target >= blocks.length) return d;
      [blocks[bi], blocks[target]] = [blocks[target], blocks[bi]];
      return { ...d, blocks };
    });
  };

  const updateBlock = (wi: number, di: number, bi: number, updater: (b: Block) => Block) => {
    updateDay(wi, di, d => ({
      ...d,
      blocks: d.blocks.map((b, i) => i === bi ? updater(b) : b)
    }));
  };

  // Copy day to another day
  const copyDayTo = (srcWi: number, srcDi: number, tgtWi: number, tgtDi: number) => {
    const srcDay = JSON.parse(JSON.stringify(weeks[srcWi].days[srcDi]));
    updateDay(tgtWi, tgtDi, () => srcDay);
    toast.success(`Copied ${DAY_NAMES[srcDi]} to ${WEEK_LABELS[tgtWi]} ${DAY_NAMES[tgtDi]}`);
  };

  // Copy week to another week
  const copyWeekTo = (srcWi: number, tgtWi: number) => {
    const srcWeek = JSON.parse(JSON.stringify(weeks[srcWi]));
    setWeeks(prev => prev.map((w, i) => i === tgtWi ? srcWeek : w));
    toast.success(`Copied ${WEEK_LABELS[srcWi]} to ${WEEK_LABELS[tgtWi]}`);
  };

  const isSupplemental = context?.selected_plan === 'in-person';
  const currentPlanType = isSupplemental ? 'inperson_supplemental' : 'online';

  const handleDeliver = async () => {
    if (!user || !id) return;
    setDelivering(true);
    try {
      const newVersion = existingVersion + 1;
      if (isUpdate) {
        await supabase
          .from('coaching_programs')
          .update({ is_active: false } as any)
          .eq('user_id', id)
          .eq('is_active', true)
          .eq('plan_type', currentPlanType as any);
      }

      const { error: insertError } = await supabase
        .from('coaching_programs')
        .insert({
          user_id: id,
          coach_id: user.id,
          version: newVersion,
          is_active: true,
          program_data: { weeks } as any,
          plan_type: currentPlanType,
        } as any);
      if (insertError) throw insertError;

      await supabase
        .from('member_profiles')
        .update({ program_delivered: true } as any)
        .eq('user_id', id);

      const notifTitle = isSupplemental
        ? (isUpdate ? 'Your coach has updated your supplemental program.' : 'Your coach has added a supplemental program to support your training between sessions.')
        : (isUpdate ? 'Your coach has updated your program.' : 'Your personalized program is ready — open it in your dashboard.');
      await supabase.from('notifications').insert({
        user_id: id,
        type: 'program_delivered',
        title: notifTitle,
        body: isUpdate ? 'Check your Workouts tab for the latest version.' : 'Head to your Workouts tab to get started.',
      } as any);

      toast.success(isUpdate ? 'Program updated!' : 'Program delivered!');
      setPreviewOpen(false);
      navigate(`/admin/members/${id}`);
    } catch (e: any) {
      console.error(e);
      toast.error('Failed to deliver program: ' + (e.message || 'Unknown error'));
    } finally {
      setDelivering(false);
    }
  };

  const formatGoal = (g: string) => g.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  const hasContent = weeks.some(w => w.days.some(d => !d.isRest && d.blocks.length > 0));

  if (loading) {
    return (
      <AdminLayout title="Program Builder">
        <div className="flex justify-center py-20">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Program Builder">
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-5 pb-24">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/members/${id}`)} className="gap-1.5 -ml-2">
          <ArrowLeft className="w-4 h-4" /> Back to member
        </Button>

        {/* Member Context */}
        {context && (
          <Card>
            <CardContent className="p-4 md:p-5">
              <h2 className="text-lg font-bold mb-1">
                {isSupplemental ? 'Supplemental program — between-session work' : `${isUpdate ? 'Update' : 'Build'} program for ${context.full_name}`}
              </h2>
              {isSupplemental && (
                <p className="text-sm text-muted-foreground mb-2">This supports {context.full_name}'s training between in-person sessions.</p>
              )}
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{formatGoal(context.fitness_level)}</Badge>
                <Badge variant="secondary">{formatGoal(context.primary_goal)}</Badge>
                <Badge variant="outline">{context.training_days_per_week} days/week</Badge>
                {context.preferred_days && context.preferred_days.length > 0 && (
                  <Badge variant="outline">Prefers: {context.preferred_days.join(', ')}</Badge>
                )}
              </div>
              {context.injuries_limitations && (
                <div className="flex items-start gap-2 mt-3 p-2.5 rounded-lg bg-destructive/10 border border-destructive/20">
                  <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-destructive">Injuries / Limitations</p>
                    <p className="text-sm mt-0.5">{context.injuries_limitations}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 4-week builder */}
        {WEEK_LABELS.map((weekLabel, wi) => (
          <Collapsible key={wi} open={openWeeks.has(wi)} onOpenChange={() => toggleWeek(wi)}>
            <Card>
              <CardHeader className="p-3 md:p-4 pb-0">
                <div className="flex items-center justify-between">
                  <CollapsibleTrigger className="flex items-center gap-2 text-left flex-1">
                    {openWeeks.has(wi) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    <CardTitle className="text-sm font-semibold">{weekLabel}</CardTitle>
                    <Badge variant="outline" className="text-[10px]">
                      {weeks[wi].days.filter(d => !d.isRest).length} active days
                    </Badge>
                  </CollapsibleTrigger>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="ghost" className="text-xs gap-1 h-7">
                        <CopyPlus className="w-3 h-3" /> Copy week
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {WEEK_LABELS.map((lbl, ti) => ti !== wi && (
                        <DropdownMenuItem key={ti} onClick={() => copyWeekTo(wi, ti)}>
                          Copy to {lbl}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>

              <CollapsibleContent>
                <CardContent className="p-3 md:p-4 space-y-3">
                  {DAY_NAMES.map((dayName, di) => {
                    const day = weeks[wi].days[di];
                    const isDayOpen = openDays.has(dayKey(wi, di));

                    return (
                      <Collapsible key={di} open={isDayOpen} onOpenChange={() => toggleDay(wi, di)}>
                        <div className={`border border-border rounded-lg ${day.isRest ? 'opacity-60' : ''}`}>
                          <div className="flex items-center justify-between p-2.5">
                            <CollapsibleTrigger className="flex items-center gap-2 text-left flex-1">
                              {isDayOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                              <span className="text-sm font-medium">{dayName}</span>
                              {day.isRest && <Badge variant="secondary" className="text-[10px]">Rest</Badge>}
                              {!day.isRest && day.blocks.length > 0 && (
                                <Badge variant="outline" className="text-[10px]">{day.blocks.length} block{day.blocks.length > 1 ? 's' : ''}</Badge>
                              )}
                            </CollapsibleTrigger>
                            <div className="flex items-center gap-1">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button size="icon" variant="ghost" className="h-6 w-6">
                                    <Copy className="w-3 h-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {WEEK_LABELS.map((wl, twi) => (
                                    <DropdownMenuSub key={twi}>
                                      <DropdownMenuSubTrigger className="text-xs">{wl}</DropdownMenuSubTrigger>
                                      <DropdownMenuSubContent>
                                        {DAY_NAMES.map((dn, tdi) => (twi !== wi || tdi !== di) && (
                                          <DropdownMenuItem key={tdi} onClick={() => copyDayTo(wi, di, twi, tdi)} className="text-xs">
                                            {dn}
                                          </DropdownMenuItem>
                                        ))}
                                      </DropdownMenuSubContent>
                                    </DropdownMenuSub>
                                  ))}
                                </DropdownMenuContent>
                              </DropdownMenu>
                              <Button
                                size="sm"
                                variant={day.isRest ? 'default' : 'outline'}
                                className="text-xs h-6 px-2"
                                onClick={() => setDayRest(wi, di, !day.isRest)}
                              >
                                {day.isRest ? 'Add workout' : 'Rest'}
                              </Button>
                            </div>
                          </div>

                          <CollapsibleContent>
                            {day.isRest ? (
                              <div className="px-2.5 pb-2.5">
                                <Input
                                  placeholder="Recovery note (optional)"
                                  value={day.restNote}
                                  onChange={e => updateDay(wi, di, d => ({ ...d, restNote: e.target.value }))}
                                  className="h-8 text-sm"
                                />
                              </div>
                            ) : (
                              <div className="px-2.5 pb-2.5 space-y-3">
                                {day.blocks.map((block, bi) => (
                                  <BlockEditor
                                    key={bi}
                                    block={block}
                                    blockIdx={bi}
                                    totalBlocks={day.blocks.length}
                                    onUpdate={(updater) => updateBlock(wi, di, bi, updater)}
                                    onRemove={() => removeBlock(wi, di, bi)}
                                    onMove={(dir) => moveBlock(wi, di, bi, dir)}
                                  />
                                ))}
                                <div className="flex flex-wrap gap-2 pt-1">
                                  <Button size="sm" variant="outline" className="text-xs gap-1 h-7" onClick={() => addBlock(wi, di, 'strength')}>
                                    <Dumbbell className="w-3 h-3" /> Strength
                                  </Button>
                                  <Button size="sm" variant="outline" className="text-xs gap-1 h-7" onClick={() => addBlock(wi, di, 'cardio')}>
                                    <Bike className="w-3 h-3" /> Cardio
                                  </Button>
                                  <Button size="sm" variant="outline" className="text-xs gap-1 h-7" onClick={() => addBlock(wi, di, 'mobility')}>
                                    <Heart className="w-3 h-3" /> Mobility
                                  </Button>
                                  <Button size="sm" variant="outline" className="text-xs gap-1 h-7" onClick={() => addBlock(wi, di, 'nutrition')}>
                                    <Apple className="w-3 h-3" /> Nutrition
                                  </Button>
                                </div>
                              </div>
                            )}
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    );
                  })}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        ))}

        {/* Bottom bar */}
        <div className="fixed bottom-0 left-0 right-0 md:left-64 p-4 bg-background/95 backdrop-blur border-t border-border z-10">
          <div className="max-w-4xl mx-auto flex gap-3">
            <Button className="flex-1 gap-1.5" disabled={!hasContent} onClick={() => setPreviewOpen(true)}>
              <Eye className="w-4 h-4" /> Preview & deliver
            </Button>
          </div>
        </div>

        {/* Preview Dialog */}
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Program Preview — {context?.full_name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              {WEEK_LABELS.map((weekLabel, wi) => (
                <div key={wi}>
                  <h3 className="text-sm font-bold mb-3 border-b border-border pb-1">{weekLabel}</h3>
                  <div className="space-y-2">
                    {DAY_NAMES.map((dayName, di) => {
                      const day = weeks[wi].days[di];
                      if (day.isRest) {
                        return (
                          <div key={di} className="flex items-center gap-2 py-1.5 opacity-50">
                            <p className="text-sm font-medium">{dayName}</p>
                            <Badge variant="secondary" className="text-[10px]">Rest</Badge>
                            {day.restNote && <span className="text-xs text-muted-foreground italic">— {day.restNote}</span>}
                          </div>
                        );
                      }
                      return (
                        <Card key={di} className="border-border/50">
                          <CardHeader className="p-2.5 pb-1">
                            <CardTitle className="text-xs font-semibold">{dayName}</CardTitle>
                          </CardHeader>
                          <CardContent className="p-2.5 pt-0 space-y-1.5">
                            {day.blocks.map((block, bi) => (
                              <PreviewBlock key={bi} block={block} />
                            ))}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPreviewOpen(false)}>Back to edit</Button>
              <Button onClick={handleDeliver} disabled={delivering} className="gap-1.5">
                <Send className="w-4 h-4" />
                {delivering ? 'Delivering...' : isUpdate ? 'Update program' : 'Deliver program'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}

/* ========= Block Editor ========= */
function BlockEditor({
  block, blockIdx, totalBlocks, onUpdate, onRemove, onMove
}: {
  block: Block;
  blockIdx: number;
  totalBlocks: number;
  onUpdate: (updater: (b: Block) => Block) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const typeLabel = block.type === 'strength' ? 'Strength' : block.type === 'cardio' ? 'Cardio & Conditioning' : block.type === 'mobility' ? 'Mobility & Stretching' : 'Nutrition Guidance';
  const TypeIcon = block.type === 'strength' ? Dumbbell : block.type === 'cardio' ? Bike : block.type === 'mobility' ? Heart : Apple;

  return (
    <div className="border border-border rounded-lg p-3 space-y-3 bg-muted/20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TypeIcon className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">{typeLabel}</span>
        </div>
        <div className="flex items-center gap-1">
          {blockIdx > 0 && (
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onMove(-1)}>
              <ChevronDown className="w-3 h-3 rotate-180" />
            </Button>
          )}
          {blockIdx < totalBlocks - 1 && (
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onMove(1)}>
              <ChevronDown className="w-3 h-3" />
            </Button>
          )}
          <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={onRemove}>
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {block.type === 'strength' && <StrengthEditor block={block} onUpdate={(b) => onUpdate(() => b)} />}
      {block.type === 'cardio' && <CardioEditor block={block} onUpdate={(b) => onUpdate(() => b)} />}
      {block.type === 'mobility' && <MobilityEditor block={block} onUpdate={(b) => onUpdate(() => b)} />}
      {block.type === 'nutrition' && (
        <Textarea
          placeholder="Nutrition guidance, macro targets, meal timing notes..."
          value={block.content}
          onChange={e => onUpdate(() => ({ type: 'nutrition', content: e.target.value }))}
          className="min-h-[80px]"
        />
      )}
    </div>
  );
}

/* ========= Strength Editor ========= */
function StrengthEditor({ block, onUpdate }: { block: StrengthBlock; onUpdate: (b: StrengthBlock) => void }) {
  const updateExercise = (idx: number, field: keyof StrengthExercise, value: string) => {
    const exercises = block.exercises.map((e, i) => i === idx ? { ...e, [field]: value } : e);
    onUpdate({ ...block, exercises });
  };
  const addExercise = () => onUpdate({ ...block, exercises: [...block.exercises, { name: '', sets: '3', reps: '10', weight: '', note: '' }] });
  const removeExercise = (idx: number) => {
    if (block.exercises.length <= 1) return;
    onUpdate({ ...block, exercises: block.exercises.filter((_, i) => i !== idx) });
  };

  return (
    <div className="space-y-3">
      {block.exercises.map((ex, idx) => (
        <div key={idx} className="space-y-2 pb-2 border-b border-border/50 last:border-0 last:pb-0">
          <div className="flex gap-2">
            <Input placeholder="Exercise name" value={ex.name} onChange={e => updateExercise(idx, 'name', e.target.value)} className="flex-1 h-8 text-sm" />
            {block.exercises.length > 1 && (
              <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive shrink-0" onClick={() => removeExercise(idx)}>
                <Trash2 className="w-3 h-3" />
              </Button>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Input placeholder="Sets" value={ex.sets} onChange={e => updateExercise(idx, 'sets', e.target.value)} className="h-8 text-sm" />
            <Input placeholder="Reps" value={ex.reps} onChange={e => updateExercise(idx, 'reps', e.target.value)} className="h-8 text-sm" />
            <Input placeholder="Weight/guidance" value={ex.weight} onChange={e => updateExercise(idx, 'weight', e.target.value)} className="h-8 text-sm" />
          </div>
          <Input placeholder="Coaching note (optional)" value={ex.note} onChange={e => updateExercise(idx, 'note', e.target.value)} className="h-8 text-sm" />
        </div>
      ))}
      <Button size="sm" variant="ghost" className="text-xs gap-1" onClick={addExercise}>
        <Plus className="w-3 h-3" /> Add exercise
      </Button>
    </div>
  );
}

/* ========= Cardio Editor ========= */
function CardioEditor({ block, onUpdate }: { block: CardioBlock; onUpdate: (b: CardioBlock) => void }) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <Input placeholder="Activity (run, row, AMRAP...)" value={block.activity} onChange={e => onUpdate({ ...block, activity: e.target.value })} className="h-8 text-sm" />
        <Input placeholder="Duration / rounds" value={block.duration} onChange={e => onUpdate({ ...block, duration: e.target.value })} className="h-8 text-sm" />
      </div>
      <Input placeholder="Intensity guidance" value={block.intensity} onChange={e => onUpdate({ ...block, intensity: e.target.value })} className="h-8 text-sm" />
      <Input placeholder="Coaching note (optional)" value={block.note} onChange={e => onUpdate({ ...block, note: e.target.value })} className="h-8 text-sm" />
    </div>
  );
}

/* ========= Mobility Editor ========= */
function MobilityEditor({ block, onUpdate }: { block: MobilityBlock; onUpdate: (b: MobilityBlock) => void }) {
  const updateExercise = (idx: number, field: string, value: string) => {
    const exercises = block.exercises.map((e, i) => i === idx ? { ...e, [field]: value } : e);
    onUpdate({ ...block, exercises });
  };
  const addExercise = () => onUpdate({ ...block, exercises: [...block.exercises, { name: '', duration: '', side: 'both', note: '' }] });
  const removeExercise = (idx: number) => {
    if (block.exercises.length <= 1) return;
    onUpdate({ ...block, exercises: block.exercises.filter((_, i) => i !== idx) });
  };

  return (
    <div className="space-y-3">
      {block.exercises.map((ex, idx) => (
        <div key={idx} className="flex gap-2 items-start">
          <Input placeholder="Exercise/stretch" value={ex.name} onChange={e => updateExercise(idx, 'name', e.target.value)} className="flex-1 h-8 text-sm" />
          <Input placeholder="Duration/reps" value={ex.duration} onChange={e => updateExercise(idx, 'duration', e.target.value)} className="w-24 h-8 text-sm" />
          <select
            value={ex.side}
            onChange={e => updateExercise(idx, 'side', e.target.value)}
            className="h-8 text-sm rounded-md border border-input bg-background px-2"
          >
            <option value="both">Both</option>
            <option value="left">Left</option>
            <option value="right">Right</option>
          </select>
          {block.exercises.length > 1 && (
            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive shrink-0" onClick={() => removeExercise(idx)}>
              <Trash2 className="w-3 h-3" />
            </Button>
          )}
        </div>
      ))}
      <Button size="sm" variant="ghost" className="text-xs gap-1" onClick={addExercise}>
        <Plus className="w-3 h-3" /> Add exercise
      </Button>
    </div>
  );
}

/* ========= Preview Block ========= */
function PreviewBlock({ block }: { block: Block }) {
  if (block.type === 'strength') {
    return (
      <div className="space-y-1">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-1">
          <Dumbbell className="w-3 h-3" /> Strength
        </p>
        {block.exercises.map((ex, i) => (
          <div key={i} className="text-sm pl-4">
            <span className="font-medium">{ex.name || 'Unnamed'}</span>
            <span className="text-muted-foreground"> — {ex.sets}×{ex.reps}{ex.weight ? ` @ ${ex.weight}` : ''}</span>
            {ex.note && <p className="text-xs text-muted-foreground italic">{ex.note}</p>}
          </div>
        ))}
      </div>
    );
  }
  if (block.type === 'cardio') {
    return (
      <div className="space-y-1">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-1">
          <Bike className="w-3 h-3" /> Cardio
        </p>
        <div className="text-sm pl-4">
          <span className="font-medium">{block.activity || 'Activity'}</span>
          <span className="text-muted-foreground"> — {block.duration}{block.intensity ? ` · ${block.intensity}` : ''}</span>
          {block.note && <p className="text-xs text-muted-foreground italic">{block.note}</p>}
        </div>
      </div>
    );
  }
  if (block.type === 'mobility') {
    return (
      <div className="space-y-1">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-1">
          <Heart className="w-3 h-3" /> Mobility
        </p>
        {block.exercises.map((ex, i) => (
          <div key={i} className="text-sm pl-4">
            <span className="font-medium">{ex.name || 'Unnamed'}</span>
            {ex.duration && <span className="text-muted-foreground"> — {ex.duration}</span>}
            {ex.side && ex.side !== 'both' && <span className="text-muted-foreground"> ({ex.side})</span>}
            {ex.note && <p className="text-xs text-muted-foreground italic">{ex.note}</p>}
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="space-y-1">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-1">
        <Apple className="w-3 h-3" /> Nutrition
      </p>
      <p className="text-sm pl-4 whitespace-pre-wrap">{block.content || 'No notes'}</p>
    </div>
  );
}
