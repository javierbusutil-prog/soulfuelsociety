import { useEffect, useMemo, useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bold, Italic, Link2, Loader2, Send, ChevronDown, ChevronUp, Megaphone } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type Audience = 'all' | 'paid' | 'free' | 'custom';

type Member = {
  id: string;
  full_name: string | null;
  email: string | null;
  is_paid: boolean;
  email_unsubscribed: boolean;
};

type BroadcastRow = {
  id: string;
  subject: string;
  body: string;
  audience: string;
  recipient_count: number;
  sent_at: string;
  sent_by: string | null;
  sender_name?: string;
};

const AUDIENCE_LABELS: Record<string, string> = {
  all: 'All members',
  paid: 'Paid members',
  free: 'Free members',
  custom: 'Custom selection',
};

export default function AdminBroadcast() {
  const { user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<Audience>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [sending, setSending] = useState(false);

  const [history, setHistory] = useState<BroadcastRow[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    void loadMembers();
    void loadHistory();
  }, []);

  async function loadMembers() {
    setLoadingMembers(true);
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, email_unsubscribed')
      .order('full_name', { ascending: true });

    if (error) {
      console.error(error);
      toast.error('Failed to load members');
      setLoadingMembers(false);
      return;
    }

    const { data: roles } = await supabase
      .from('user_roles')
      .select('user_id, role');

    const paidSet = new Set(
      (roles ?? [])
        .filter((r: any) => ['paid', 'admin', 'pt_admin'].includes(r.role))
        .map((r: any) => r.user_id)
    );

    setMembers(
      (profiles ?? []).map((p: any) => ({
        id: p.id,
        full_name: p.full_name,
        email: p.email,
        is_paid: paidSet.has(p.id),
        email_unsubscribed: !!p.email_unsubscribed,
      }))
    );
    setLoadingMembers(false);
  }

  async function loadHistory() {
    setLoadingHistory(true);
    const { data, error } = await supabase
      .from('broadcast_emails')
      .select('id, subject, body, audience, recipient_count, sent_at, sent_by')
      .order('sent_at', { ascending: false });
    if (error) {
      console.error(error);
      setLoadingHistory(false);
      return;
    }
    const senderIds = Array.from(
      new Set((data ?? []).map((d: any) => d.sent_by).filter(Boolean))
    );
    let nameMap = new Map<string, string>();
    if (senderIds.length) {
      const { data: senders } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', senderIds as string[]);
      nameMap = new Map((senders ?? []).map((s: any) => [s.id, s.full_name || 'Coach']));
    }
    setHistory(
      (data ?? []).map((d: any) => ({
        ...d,
        sender_name: d.sent_by ? nameMap.get(d.sent_by) ?? 'Coach' : 'Unknown',
      }))
    );
    setLoadingHistory(false);
  }

  const eligibleRecipients = useMemo(() => {
    const usable = members.filter((m) => m.email && !m.email_unsubscribed);
    if (audience === 'all') return usable;
    if (audience === 'paid') return usable.filter((m) => m.is_paid);
    if (audience === 'free') return usable.filter((m) => !m.is_paid);
    return usable.filter((m) => selectedIds.has(m.id));
  }, [members, audience, selectedIds]);

  const filteredCustomList = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = members.filter((m) => m.email && !m.email_unsubscribed);
    if (!q) return list;
    return list.filter(
      (m) =>
        (m.full_name || '').toLowerCase().includes(q) ||
        (m.email || '').toLowerCase().includes(q)
    );
  }, [members, search]);

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllVisible() {
    setSelectedIds(new Set(filteredCustomList.map((m) => m.id)));
  }

  function deselectAll() {
    setSelectedIds(new Set());
  }

  function applyFormat(token: 'bold' | 'italic' | 'link') {
    const el = document.getElementById('broadcast-body') as HTMLTextAreaElement | null;
    if (!el) return;
    const start = el.selectionStart ?? body.length;
    const end = el.selectionEnd ?? body.length;
    const sel = body.slice(start, end) || (token === 'link' ? 'link text' : 'text');
    let inserted = sel;
    if (token === 'bold') inserted = `**${sel}**`;
    if (token === 'italic') inserted = `*${sel}*`;
    if (token === 'link') inserted = `[${sel}](https://)`;
    const next = body.slice(0, start) + inserted + body.slice(end);
    setBody(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + inserted.length, start + inserted.length);
    });
  }

  async function handleSend() {
    if (!subject.trim() || !body.trim()) {
      toast.error('Subject and body are required');
      return;
    }
    if (audience === 'custom' && selectedIds.size === 0) {
      toast.error('Select at least one recipient');
      return;
    }
    if (eligibleRecipients.length === 0) {
      toast.error('No eligible recipients');
      return;
    }
    if (!user) return;

    setSending(true);
    let successCount = 0;
    let failCount = 0;

    await Promise.all(
      eligibleRecipients.map(async (m) => {
        try {
          const { error } = await supabase.functions.invoke('send-broadcast', {
            body: {
              to_email: m.email,
              to_name: m.full_name || '',
              subject,
              body,
              user_id: m.id,
            },
          });
          if (error) throw error;
          successCount++;
        } catch (e) {
          console.error('send-broadcast failed for', m.email, e);
          failCount++;
        }
      })
    );

    const { error: insertErr } = await supabase.from('broadcast_emails').insert({
      subject,
      body,
      audience,
      recipient_ids: audience === 'custom' ? Array.from(selectedIds) : null,
      recipient_count: successCount,
      sent_by: user.id,
    });
    if (insertErr) console.error(insertErr);

    setSending(false);
    if (failCount > 0) {
      toast.warning(`Sent to ${successCount} members (${failCount} failed)`);
    } else {
      toast.success(`Broadcast sent to ${successCount} members`);
    }
    setSubject('');
    setBody('');
    setAudience('all');
    setSelectedIds(new Set());
    void loadHistory();
  }

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Megaphone className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-display text-2xl">Broadcast Email</h1>
            <p className="text-sm text-muted-foreground">Send branded emails to members.</p>
          </div>
        </div>

        <Tabs defaultValue="compose">
          <TabsList>
            <TabsTrigger value="compose">Compose</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="compose" className="space-y-4 mt-4">
            <Card>
              <CardContent className="p-6 space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="What's this email about?"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="broadcast-body">Body</Label>
                    <div className="flex items-center gap-1">
                      <Button type="button" variant="ghost" size="sm" onClick={() => applyFormat('bold')}>
                        <Bold className="w-4 h-4" />
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => applyFormat('italic')}>
                        <Italic className="w-4 h-4" />
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => applyFormat('link')}>
                        <Link2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <Textarea
                    id="broadcast-body"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    rows={10}
                    placeholder="Write your message... line breaks are preserved."
                    className="font-sans"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Audience</Label>
                  <RadioGroup
                    value={audience}
                    onValueChange={(v) => setAudience(v as Audience)}
                    className="grid grid-cols-1 sm:grid-cols-2 gap-2"
                  >
                    {(['all', 'paid', 'free', 'custom'] as Audience[]).map((opt) => (
                      <label
                        key={opt}
                        className={cn(
                          'flex items-center gap-3 rounded-xl border px-3 py-2.5 cursor-pointer transition-colors',
                          audience === opt ? 'border-primary bg-primary/5' : 'border-border'
                        )}
                      >
                        <RadioGroupItem value={opt} />
                        <span className="text-sm font-medium">{AUDIENCE_LABELS[opt]}</span>
                      </label>
                    ))}
                  </RadioGroup>
                </div>

                {audience === 'custom' && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Search by name or email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                      <Button type="button" variant="outline" size="sm" onClick={selectAllVisible}>
                        Select all
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={deselectAll}>
                        Deselect all
                      </Button>
                    </div>
                    <div className="border rounded-xl">
                      <ScrollArea className="h-72">
                        {loadingMembers ? (
                          <div className="p-6 text-sm text-muted-foreground flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" /> Loading members...
                          </div>
                        ) : filteredCustomList.length === 0 ? (
                          <div className="p-6 text-sm text-muted-foreground">No members found.</div>
                        ) : (
                          <ul className="divide-y">
                            {filteredCustomList.map((m) => (
                              <li key={m.id}>
                                <label className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-muted/40">
                                  <Checkbox
                                    checked={selectedIds.has(m.id)}
                                    onCheckedChange={() => toggleSelected(m.id)}
                                  />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{m.full_name || '(no name)'}</p>
                                    <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                                  </div>
                                  {m.is_paid && <Badge variant="secondary" className="text-[10px]">Paid</Badge>}
                                </label>
                              </li>
                            ))}
                          </ul>
                        )}
                      </ScrollArea>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between gap-3 pt-2 border-t">
                  <p className="text-sm text-muted-foreground">
                    This will send to <strong className="text-foreground">{eligibleRecipients.length}</strong> members
                    {' '}<span className="text-xs">(unsubscribed users excluded)</span>
                  </p>
                  <Button onClick={handleSend} disabled={sending || eligibleRecipients.length === 0}>
                    {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                    Send Broadcast
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <Card>
              <CardContent className="p-0">
                {loadingHistory ? (
                  <div className="p-8 text-sm text-muted-foreground flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading history...
                  </div>
                ) : history.length === 0 ? (
                  <div className="p-8 text-sm text-muted-foreground text-center">No broadcasts sent yet.</div>
                ) : (
                  <ul className="divide-y">
                    {history.map((b) => {
                      const open = expanded === b.id;
                      return (
                        <li key={b.id}>
                          <button
                            onClick={() => setExpanded(open ? null : b.id)}
                            className="w-full text-left px-5 py-4 hover:bg-muted/40 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{b.subject}</p>
                                <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
                                  <Badge variant="outline" className="text-[10px]">
                                    {AUDIENCE_LABELS[b.audience] ?? b.audience}
                                  </Badge>
                                  <span>{b.recipient_count} recipients</span>
                                  <span>•</span>
                                  <span>{b.sender_name}</span>
                                  <span>•</span>
                                  <span>{new Date(b.sent_at).toLocaleString()}</span>
                                </div>
                              </div>
                              {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </div>
                          </button>
                          {open && (
                            <div className="px-5 pb-5">
                              <div className="rounded-xl bg-muted/40 p-4 text-sm whitespace-pre-wrap font-sans">
                                {b.body}
                              </div>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}