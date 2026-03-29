import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, Send, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import { CoachingDashboard } from '@/components/dashboard/CoachingDashboard';
import { supabase } from '@/integrations/supabase/client';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  tag: string | null;
}

interface Thread {
  id: string;
  user_id: string;
  admin_id: string | null;
}

export default function Coach() {
  const { user, isPaidMember } = useAuth();
  const [thread, setThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [coachProfile, setCoachProfile] = useState<{ full_name: string; avatar_url: string | null } | null>(null);

  useEffect(() => {
    if (isPaidMember && user) {
      fetchThread();
    } else {
      setLoading(false);
    }
  }, [isPaidMember, user]);

  const fetchThread = async () => {
    if (!user) return;
    
    try {
      const { data: existingThread } = await supabase
        .from('threads')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingThread) {
        setThread(existingThread);
        await fetchMessages(existingThread.id);
        
        if (existingThread.admin_id) {
          const { data: coach } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('id', existingThread.admin_id)
            .single();
          if (coach) setCoachProfile(coach);
        }
      }
    } catch (error) {
      console.error('Error fetching thread:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (threadId: string) => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true });
    
    if (data) setMessages(data);
  };

  const createThread = async () => {
    if (!user) return null;
    
    const { data, error } = await supabase
      .from('threads')
      .insert({ user_id: user.id })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating thread:', error);
      return null;
    }
    
    setThread(data);
    return data;
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !user) return;
    
    setSending(true);
    try {
      let currentThread = thread;
      
      if (!currentThread) {
        currentThread = await createThread();
        if (!currentThread) return;
      }

      const { error } = await supabase
        .from('messages')
        .insert({
          thread_id: currentThread.id,
          sender_id: user.id,
          content: newMessage.trim(),
        });

      if (error) throw error;

      setNewMessage('');
      await fetchMessages(currentThread.id);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  // Free user - show coaching program card
  if (!isPaidMember) {
    return (
      <AppLayout title="Coach">
        <div className="max-w-lg mx-auto p-4">
          <CoachingDashboard />
        </div>
      </AppLayout>
    );
  }

  // Loading state
  if (loading) {
    return (
      <AppLayout title="My Coach">
        <div className="max-w-lg mx-auto p-4 flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  // Paid user - messaging interface
  return (
    <AppLayout title="My Coach">
      <div className="max-w-lg mx-auto flex flex-col h-[calc(100vh-8rem)]">
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={coachProfile?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10">
                <User className="h-6 w-6 text-primary" />
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="font-semibold">{coachProfile?.full_name || 'Your Coach'}</h2>
              <p className="text-sm text-muted-foreground">Your private 1:1 coaching space</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <MessageCircle className="w-12 h-12 text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground mb-1">No messages yet</p>
              <p className="text-sm text-muted-foreground/70">
                Start a conversation with your coach
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => {
                const isOwnMessage = message.sender_id === user?.id;
                const isSystemMessage = message.tag === 'system';

                if (isSystemMessage) {
                  return (
                    <div key={message.id} className="flex justify-center">
                      <div className="bg-muted px-3 py-1.5 rounded-full text-xs text-muted-foreground">
                        {message.content}
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={message.id}
                    className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                        isOwnMessage
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-secondary-foreground'
                      }`}
                    >
                      {message.tag === 'note' && (
                        <p className="text-xs opacity-70 mb-1">📝 Coach Note</p>
                      )}
                      <p className="text-sm">{message.content}</p>
                      <p className={`text-xs mt-1 ${isOwnMessage ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                        {format(new Date(message.created_at), 'h:mm a')}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Message Input */}
        <div className="p-4 border-t border-border">
          <div className="flex gap-2">
            <Textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Message your coach..."
              className="min-h-[44px] max-h-32 resize-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
            />
            <Button 
              size="icon" 
              onClick={sendMessage} 
              disabled={!newMessage.trim() || sending}
              className="shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
