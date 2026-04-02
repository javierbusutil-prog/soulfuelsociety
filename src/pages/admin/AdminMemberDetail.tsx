import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { ArrowLeft, Dumbbell, Send, ClipboardList, MessageSquare, Activity, Calendar, BookOpen, ArrowUpCircle } from 'lucide-react';
import { toast } from 'sonner';
import { UpgradeToPaidDialog } from '@/components/admin/UpgradeToPaidDialog';

interface ProfileData {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  selected_plan: string | null;
  session_count: number | null;
  group_size: string | null;
  created_at: string;
  subscription_status: string | null;
  phone: string | null;
}

interface MemberProfileData {
  fitness_level: string;
  primary_goal: string;
  training_days_per_week: number;
  injuries_limitations: string | null;
  preferred_days: string[] | null;
  preferred_time: string | null;
  gym_location: string | null;
  program_delivered: boolean;
}

interface WorkoutLogEntry {
  id: string;
  started_at: string;
  completed_at: string | null;
  workout_title: string;
}

interface ThreadMessage {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  sender_name?: string;
}

export default function AdminMemberDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [memberProfile, setMemberProfile] = useState<MemberProfileData | null>(null);
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLogEntry[]>([]);
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [enrolledProgram, setEnrolledProgram] = useState<{ title: string; weeks: number; start_date: string } | null>(null);
  const [hasSupplementalProgram, setHasSupplementalProgram] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (id) fetchAll(id);
  }, [id]);

  const fetchAll = async (userId: string) => {
    setLoading(true);

    // Profile
    const { data: prof } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, selected_plan, session_count, group_size, created_at, subscription_status, phone')
      .eq('id', userId)
      .single();
    if (prof) setProfile(prof as ProfileData);

    // Member profile
    const { data: mp } = await supabase
      .from('member_profiles')
      .select('fitness_level, primary_goal, training_days_per_week, injuries_limitations, preferred_days, preferred_time, gym_location, program_delivered')
      .eq('user_id', userId)
      .single();
    if (mp) setMemberProfile(mp as MemberProfileData);

    // Enrolled program
    const { data: enrollment } = await supabase
      .from('user_program_enrollments')
      .select('start_date, program_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (enrollment) {
      const { data: prog } = await supabase
        .from('workout_programs')
        .select('title, weeks')
        .eq('id', enrollment.program_id)
        .single();
      if (prog) {
        setEnrolledProgram({ title: prog.title, weeks: prog.weeks, start_date: enrollment.start_date });
      }
    }

    // Check for supplemental program (in-person members)
    if (prof?.selected_plan === 'in-person') {
      const { data: suppProg } = await supabase
        .from('coaching_programs')
        .select('id')
        .eq('user_id', userId)
        .eq('is_active', true)
        .eq('plan_type', 'inperson_supplemental' as any)
        .limit(1)
        .maybeSingle();
      setHasSupplementalProgram(!!suppProg);
    }

    // Workout logs (last 10)
    const { data: logs } = await supabase
      .from('workout_logs')
      .select('id, started_at, completed_at, workout_id')
      .eq('user_id', userId)
      .order('started_at', { ascending: false })
      .limit(10);

    if (logs && logs.length > 0) {
      const workoutIds = [...new Set(logs.map(l => l.workout_id))];
      const { data: workouts } = await supabase
        .from('workouts')
        .select('id, title')
        .in('id', workoutIds);
      const titleMap = new Map(workouts?.map(w => [w.id, w.title]) || []);
      setWorkoutLogs(logs.map(l => ({
        id: l.id,
        started_at: l.started_at,
        completed_at: l.completed_at,
        workout_title: titleMap.get(l.workout_id) || 'Workout',
      })));
    }

    // Thread & messages
    const { data: thread } = await supabase
      .from('threads')
      .select('id')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();

    if (thread) {
      setThreadId(thread.id);
      const { data: msgs } = await supabase
        .from('messages')
        .select('id, content, sender_id, created_at')
        .eq('thread_id', thread.id)
        .order('created_at', { ascending: true })
        .limit(50);

      if (msgs && msgs.length > 0) {
        const senderIds = [...new Set(msgs.map(m => m.sender_id))];
        const { data: senders } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', senderIds);
        const nameMap = new Map(senders?.map(s => [s.id, s.full_name || 'Unknown']) || []);
        setMessages(msgs.map(m => ({ ...m, sender_name: nameMap.get(m.sender_id) })));
      }
    }

    setLoading(false);
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !user || !id) return;
    setSending(true);

    let tid = threadId;
    if (!tid) {
      const { data: newThread, error } = await supabase
        .from('threads')
        .insert({ user_id: id, admin_id: user.id })
        .select('id')
        .single();
      if (error || !newThread) {
        toast.error('Could not create thread');
        setSending(false);
        return;
      }
      tid = newThread.id;
      setThreadId(tid);
    }

    const { error } = await supabase
      .from('messages')
      .insert({ thread_id: tid, sender_id: user.id, content: newMessage.trim() });

    if (error) {
      toast.error('Failed to send message');
    } else {
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        content: newMessage.trim(),
        sender_id: user.id,
        created_at: new Date().toISOString(),
        sender_name: 'You',
      }]);
      setNewMessage('');
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
    setSending(false);
  };

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatGoal = (g: string) => g.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  if (loading) {
    return (
      <AdminLayout title="Member">
        <div className="flex justify-center py-20">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  if (!profile) {
    return (
      <AdminLayout title="Member">
        <div className="p-6 text-center text-muted-foreground">Member not found.</div>
      </AdminLayout>
    );
  }

  const totalWorkouts = workoutLogs.length;
  const lastActivity = workoutLogs[0]?.started_at;

  return (
    <AdminLayout title="Member Detail">
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
        {/* Back button */}
        <Button variant="ghost" size="sm" onClick={() => navigate('/admin/members')} className="gap-1.5 -ml-2">
          <ArrowLeft className="w-4 h-4" /> Back to members
        </Button>

        {/* SECTION 1 — Member Info */}
        <Card>
          <CardContent className="p-5 md:p-6">
            <div className="flex items-start gap-4">
              <Avatar className="h-14 w-14 shrink-0">
                {profile.avatar_url && <AvatarImage src={profile.avatar_url} />}
                <AvatarFallback className="text-lg bg-primary/10 text-primary">
                  {getInitials(profile.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold">{profile.full_name || 'Unnamed'}</h2>
                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                  <Badge variant="secondary">{profile.selected_plan || 'No plan'}</Badge>
                  {profile.session_count && (
                    <Badge variant="outline">{profile.session_count} sessions/mo</Badge>
                  )}
                  {profile.group_size && (
                    <Badge variant="outline">
                      {profile.group_size === '2' ? 'Partner' : profile.group_size === '3' ? 'Trio' : 'Solo'}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Member since {format(new Date(profile.created_at), 'MMMM d, yyyy')}
                  {profile.phone && ` · ${profile.phone}`}
                </p>
              </div>
            </div>

            {/* Onboarding responses */}
            {memberProfile && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-5 pt-5 border-t border-border">
                <InfoField label="Fitness level" value={formatGoal(memberProfile.fitness_level)} />
                <InfoField label="Goal" value={formatGoal(memberProfile.primary_goal)} />
                <InfoField label="Training days" value={`${memberProfile.training_days_per_week} days/week`} />
                {memberProfile.injuries_limitations && (
                  <InfoField label="Injuries" value={memberProfile.injuries_limitations} className="col-span-2 md:col-span-3" />
                )}
                {memberProfile.preferred_time && (
                  <InfoField label="Preferred time" value={memberProfile.preferred_time} />
                )}
                {memberProfile.gym_location && (
                  <InfoField label="Gym location" value={memberProfile.gym_location} />
                )}
                {memberProfile.preferred_days && memberProfile.preferred_days.length > 0 && (
                  <InfoField label="Preferred days" value={memberProfile.preferred_days.join(', ')} className="col-span-2" />
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* SECTION 2 — Current Program / Sessions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Dumbbell className="w-4 h-4 text-muted-foreground" />
              {profile.selected_plan === 'in-person' ? 'Session bookings' : 'Current program'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {profile.selected_plan === 'in-person' ? (
              <div className="text-center py-6 space-y-3">
                <Calendar className="w-8 h-8 text-muted-foreground mx-auto" />
                <p className="text-sm text-muted-foreground">Manage in-person sessions from the Sessions tab.</p>
                <Button onClick={() => navigate('/admin/sessions')} variant="outline" className="gap-1.5">
                  Go to sessions
                </Button>
              </div>
            ) : enrolledProgram && memberProfile?.program_delivered ? (
              <div className="space-y-2">
                <p className="font-medium">{enrolledProgram.title}</p>
                <p className="text-sm text-muted-foreground">
                  {enrolledProgram.weeks} weeks · Started {format(new Date(enrolledProgram.start_date), 'MMM d, yyyy')}
                </p>
                <Button size="sm" variant="outline" onClick={() => navigate(`/admin/members/${id}/program`)} className="gap-1.5 mt-2">
                  Update program
                </Button>
              </div>
            ) : (
              <div className="text-center py-6 space-y-3">
                <ClipboardList className="w-8 h-8 text-muted-foreground mx-auto" />
                <p className="text-sm text-muted-foreground">No program delivered yet</p>
                <Button onClick={() => navigate(`/admin/members/${id}/program`)} className="gap-1.5">
                  Build & deliver program
                  <Dumbbell className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Supplemental program section — in-person members only */}
        {profile.selected_plan === 'in-person' && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-muted-foreground" /> Supplemental program
              </CardTitle>
            </CardHeader>
            <CardContent>
              {hasSupplementalProgram ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">A supplemental between-session program has been delivered.</p>
                  <Button size="sm" variant="outline" onClick={() => navigate(`/admin/members/${id}/program`)} className="gap-1.5 mt-1">
                    Update supplemental program
                  </Button>
                </div>
              ) : (
                <div className="text-center py-6 space-y-3">
                  <BookOpen className="w-8 h-8 text-muted-foreground mx-auto" />
                  <p className="text-sm text-muted-foreground">No supplemental program delivered. Add one if this member would benefit from structured between-session work.</p>
                  <Button onClick={() => navigate(`/admin/members/${id}/program`)} className="gap-1.5">
                    Build supplemental program
                    <BookOpen className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* SECTION 3 — Progress & Stats */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="w-4 h-4 text-muted-foreground" /> Progress & stats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-muted/40 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold">{totalWorkouts}</p>
                <p className="text-[11px] text-muted-foreground">Workouts logged</p>
              </div>
              <div className="bg-muted/40 rounded-lg p-3 text-center">
                <p className="text-sm font-medium">
                  {lastActivity ? format(new Date(lastActivity), 'MMM d') : '—'}
                </p>
                <p className="text-[11px] text-muted-foreground">Last activity</p>
              </div>
            </div>

            {workoutLogs.length > 0 ? (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {workoutLogs.map(log => (
                  <div key={log.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{log.workout_title}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {format(new Date(log.started_at), 'MMM d, yyyy · h:mm a')}
                        {log.completed_at && ' · Completed'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No workout activity yet.</p>
            )}
          </CardContent>
        </Card>

        {/* SECTION 4 — Message History */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-muted-foreground" /> Messages
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-80 overflow-y-auto mb-4">
              {messages.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No messages yet. Start the conversation below.</p>
              ) : (
                messages.map(msg => {
                  const isCoach = msg.sender_id === user?.id;
                  return (
                    <div key={msg.id} className={`flex ${isCoach ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] rounded-xl px-3 py-2 ${isCoach ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                        {!isCoach && (
                          <p className="text-[10px] font-medium mb-0.5 opacity-70">{msg.sender_name}</p>
                        )}
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        <p className={`text-[10px] mt-1 ${isCoach ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                          {format(new Date(msg.created_at), 'MMM d, h:mm a')}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="flex gap-2">
              <Textarea
                placeholder="Type a message..."
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                className="min-h-[40px] max-h-24 resize-none"
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              <Button size="icon" onClick={handleSend} disabled={sending || !newMessage.trim()} className="shrink-0">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

function InfoField({ label, value, className = '' }: { label: string; value: string; className?: string }) {
  return (
    <div className={className}>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">{label}</p>
      <p className="text-sm">{value}</p>
    </div>
  );
}
