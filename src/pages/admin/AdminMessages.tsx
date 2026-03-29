import { useEffect, useState, useRef } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { Send, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

interface ThreadSummary {
  thread_id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  last_message: string;
  last_message_at: string;
  has_unread: boolean;
}

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  sender_name?: string;
}

export default function AdminMessages() {
  const { user } = useAuth();
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [selectedThread, setSelectedThread] = useState<ThreadSummary | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchThreads();
  }, []);

  const fetchThreads = async () => {
    setLoading(true);
    const { data: allThreads } = await supabase
      .from('threads')
      .select('id, user_id')
      .order('created_at', { ascending: false });

    if (!allThreads || allThreads.length === 0) {
      setLoading(false);
      return;
    }

    const userIds = allThreads.map(t => t.user_id);
    const threadIds = allThreads.map(t => t.id);

    const [{ data: profiles }, { data: latestMessages }] = await Promise.all([
      supabase.from('profiles').select('id, full_name, avatar_url').in('id', userIds),
      supabase.from('messages').select('thread_id, content, created_at, sender_id').in('thread_id', threadIds).order('created_at', { ascending: false }),
    ]);

    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
    const messageMap = new Map<string, any>();
    latestMessages?.forEach(m => {
      if (!messageMap.has(m.thread_id)) messageMap.set(m.thread_id, m);
    });

    const summaries: ThreadSummary[] = allThreads
      .map(t => {
        const prof = profileMap.get(t.user_id);
        const lastMsg = messageMap.get(t.id);
        return {
          thread_id: t.id,
          user_id: t.user_id,
          full_name: prof?.full_name || 'Unknown',
          avatar_url: prof?.avatar_url || null,
          last_message: lastMsg?.content || '',
          last_message_at: lastMsg?.created_at || t.id,
          has_unread: lastMsg ? lastMsg.sender_id !== user?.id : false,
        };
      })
      .filter(t => t.last_message)
      .sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());

    setThreads(summaries);
    setLoading(false);
  };

  const openThread = async (thread: ThreadSummary) => {
    setSelectedThread(thread);
    const { data: msgs } = await supabase
      .from('messages')
      .select('id, content, sender_id, created_at')
      .eq('thread_id', thread.thread_id)
      .order('created_at', { ascending: true });

    if (msgs) {
      const senderIds = [...new Set(msgs.map(m => m.sender_id))];
      const { data: senders } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', senderIds);
      const nameMap = new Map(senders?.map(s => [s.id, s.full_name || 'Unknown']) || []);
      setMessages(msgs.map(m => ({ ...m, sender_name: nameMap.get(m.sender_id) })));
    }
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !user || !selectedThread) return;
    setSending(true);

    const { error } = await supabase
      .from('messages')
      .insert({ thread_id: selectedThread.thread_id, sender_id: user.id, content: newMessage.trim() });

    if (error) {
      toast.error('Failed to send');
    } else {
      const msg: Message = {
        id: crypto.randomUUID(),
        content: newMessage.trim(),
        sender_id: user.id,
        created_at: new Date().toISOString(),
        sender_name: 'You',
      };
      setMessages(prev => [...prev, msg]);
      setNewMessage('');
      setThreads(prev => prev.map(t =>
        t.thread_id === selectedThread.thread_id
          ? { ...t, last_message: msg.content, last_message_at: msg.created_at, has_unread: false }
          : t
      ));
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
    setSending(false);
  };

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <AdminLayout title="Messages">
      <div className="flex h-[calc(100vh-4rem)] md:h-[calc(100vh-2rem)]">
        {/* Thread List */}
        <div className={`w-full md:w-80 border-r border-border overflow-y-auto ${selectedThread ? 'hidden md:block' : ''}`}>
          <div className="p-3 border-b border-border">
            <h3 className="text-sm font-semibold text-muted-foreground">Conversations</h3>
          </div>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : threads.length === 0 ? (
            <div className="p-6 text-center">
              <MessageSquare className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No conversations yet</p>
            </div>
          ) : (
            threads.map(t => (
              <button
                key={t.thread_id}
                onClick={() => openThread(t)}
                className={`w-full text-left p-3 border-b border-border/50 hover:bg-muted/40 transition-colors flex items-center gap-3 ${
                  selectedThread?.thread_id === t.thread_id ? 'bg-muted/60' : ''
                }`}
              >
                <div className="relative">
                  <Avatar className="h-9 w-9">
                    {t.avatar_url && <AvatarImage src={t.avatar_url} />}
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">{getInitials(t.full_name)}</AvatarFallback>
                  </Avatar>
                  {t.has_unread && (
                    <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-primary rounded-full border-2 border-background" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{t.full_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{t.last_message}</p>
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {format(new Date(t.last_message_at), 'MMM d')}
                </span>
              </button>
            ))
          )}
        </div>

        {/* Chat Panel */}
        <div className={`flex-1 flex flex-col ${!selectedThread ? 'hidden md:flex' : 'flex'}`}>
          {!selectedThread ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">Select a conversation</p>
              </div>
            </div>
          ) : (
            <>
              <div className="p-3 border-b border-border flex items-center gap-3">
                <Button variant="ghost" size="sm" className="md:hidden" onClick={() => setSelectedThread(null)}>
                  ← Back
                </Button>
                <Avatar className="h-8 w-8">
                  {selectedThread.avatar_url && <AvatarImage src={selectedThread.avatar_url} />}
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">{getInitials(selectedThread.full_name)}</AvatarFallback>
                </Avatar>
                <p className="font-medium text-sm">{selectedThread.full_name}</p>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map(msg => {
                  const isCoach = msg.sender_id === user?.id;
                  return (
                    <div key={msg.id} className={`flex ${isCoach ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] rounded-xl px-3 py-2 ${isCoach ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                        {!isCoach && <p className="text-[10px] font-medium mb-0.5 opacity-70">{msg.sender_name}</p>}
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        <p className={`text-[10px] mt-1 ${isCoach ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                          {format(new Date(msg.created_at), 'MMM d, h:mm a')}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              <div className="p-3 border-t border-border flex gap-2">
                <Textarea
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  className="min-h-[40px] max-h-20 resize-none"
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
                  }}
                />
                <Button size="icon" onClick={handleSend} disabled={sending || !newMessage.trim()} className="shrink-0">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
