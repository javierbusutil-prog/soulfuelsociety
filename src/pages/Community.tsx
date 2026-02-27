import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Pin, Heart, MessageCircle, Loader2, ChevronDown, ImagePlus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Post, Group, Profile } from '@/types/database';
import { formatDistanceToNow, isToday, isYesterday, format } from 'date-fns';
import { PostDetailDialog } from '@/components/community/PostDetailDialog';

interface PostWithProfile extends Post {
  profiles: Profile;
  comment_count: number;
  reaction_count: number;
  user_reacted: boolean;
}

export default function Community() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [posts, setPosts] = useState<PostWithProfile[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [selectedPost, setSelectedPost] = useState<PostWithProfile | null>(null);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  useEffect(() => {
    if (selectedGroup) {
      fetchPosts(selectedGroup);
    }
  }, [selectedGroup, user]);

  // Real-time subscription for new/updated/deleted posts
  useEffect(() => {
    if (!selectedGroup) return;

    const channel = supabase
      .channel(`posts-${selectedGroup}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'posts',
          filter: `group_id=eq.${selectedGroup}`,
        },
        () => {
          fetchPosts(selectedGroup);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedGroup, user]);

  useEffect(() => {
    scrollToBottom();
  }, [posts]);

  const fetchGroups = async () => {
    const { data } = await supabase.from('groups').select('*').order('is_default', { ascending: false });
    if (data) {
      setGroups(data as Group[]);
      if (data.length > 0 && !selectedGroup) {
        setSelectedGroup(data[0].id);
      }
    }
  };

  const fetchPosts = async (groupId: string) => {
    setLoading(true);

    const { data: postsData } = await supabase
      .from('posts')
      .select('*')
      .eq('group_id', groupId)
      .order('created_at', { ascending: true });

    if (postsData) {
      const postsWithProfiles = await Promise.all(
        postsData.map(async (post) => {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', post.user_id)
            .single();
          const [commentsResult, reactionsResult, userReactionResult] = await Promise.all([
            supabase.from('comments').select('id', { count: 'exact', head: true }).eq('post_id', post.id),
            supabase.from('reactions').select('id', { count: 'exact', head: true }).eq('post_id', post.id),
            user ? supabase.from('reactions').select('id').eq('post_id', post.id).eq('user_id', user.id).maybeSingle() : Promise.resolve({ data: null }),
          ]);

          return {
            ...post,
            profiles: profileData as Profile,
            comment_count: commentsResult.count || 0,
            reaction_count: reactionsResult.count || 0,
            user_reacted: !!userReactionResult.data,
          };
        })
      );

      setPosts(postsWithProfiles);
    }

    setLoading(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      return; // 10MB limit
    }
    setMediaFile(file);
    setMediaPreview(URL.createObjectURL(file));
  };

  const clearMedia = () => {
    setMediaFile(null);
    if (mediaPreview) URL.revokeObjectURL(mediaPreview);
    setMediaPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSendMessage = async () => {
    if ((!newMessage.trim() && !mediaFile) || !user || !selectedGroup || sending) return;

    setSending(true);
    let mediaUrl: string | null = null;

    // Upload media if present
    if (mediaFile) {
      const ext = mediaFile.name.split('.').pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('community-media')
        .upload(path, mediaFile);

      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from('community-media')
          .getPublicUrl(path);
        mediaUrl = urlData.publicUrl;
      }
    }

    const { error } = await supabase.from('posts').insert({
      group_id: selectedGroup,
      user_id: user.id,
      content: newMessage.trim() || (mediaFile ? '📷 Photo' : ''),
      media_url: mediaUrl,
    });

    if (!error) {
      setNewMessage('');
      clearMedia();
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
      fetchPosts(selectedGroup);
    }
    setSending(false);
  };

  const handleReaction = async (postId: string, hasReacted: boolean) => {
    if (!user) return;

    if (hasReacted) {
      await supabase.from('reactions').delete().eq('post_id', postId).eq('user_id', user.id);
    } else {
      await supabase.from('reactions').insert({ post_id: postId, user_id: user.id, emoji: '❤️' });
    }

    if (selectedGroup) {
      fetchPosts(selectedGroup);
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMM d, yyyy');
  };

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMessage(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  };

  // Group posts by date
  const groupedPosts: { date: string; posts: PostWithProfile[] }[] = [];
  let currentDate = '';
  for (const post of posts) {
    const label = getDateLabel(post.created_at);
    if (label !== currentDate) {
      currentDate = label;
      groupedPosts.push({ date: label, posts: [post] });
    } else {
      groupedPosts[groupedPosts.length - 1].posts.push(post);
    }
  }

  const selectedGroupData = groups.find(g => g.id === selectedGroup);

  return (
    <AppLayout title="Community" hideHeader>
      <div className="flex flex-col h-[calc(100vh-5rem)] max-w-lg mx-auto">
        {/* Chat header */}
        <div className="bg-primary text-primary-foreground px-4 py-3 flex items-center gap-3 shrink-0">
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold text-base truncate">
              {selectedGroupData?.name || 'Community'}
            </h1>
            <p className="text-xs opacity-80">
              {posts.length} messages
            </p>
          </div>
        </div>

        {/* Group tabs - horizontal scroll */}
        {groups.length > 1 && (
          <div className="flex gap-1.5 overflow-x-auto hide-scrollbar px-3 py-2 bg-secondary/50 border-b border-border shrink-0">
            {groups.map((group) => (
              <button
                key={group.id}
                onClick={() => setSelectedGroup(group.id)}
                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedGroup === group.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background text-muted-foreground hover:text-foreground'
                }`}
              >
                {group.name}
              </button>
            ))}
          </div>
        )}

        {/* Messages area */}
        <div
          className="flex-1 overflow-y-auto px-3 py-2"
          style={{
            backgroundImage: 'radial-gradient(circle at 20% 50%, hsl(var(--secondary) / 0.3) 0%, transparent 50%), radial-gradient(circle at 80% 20%, hsl(var(--secondary) / 0.2) 0%, transparent 40%)',
          }}
        >
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : posts.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-muted-foreground">
                <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No messages yet. Say hello! 👋</p>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              {groupedPosts.map((group) => (
                <div key={group.date}>
                  {/* Date separator */}
                  <div className="flex justify-center my-3">
                    <span className="bg-secondary/80 text-muted-foreground text-[11px] font-medium px-3 py-1 rounded-full">
                      {group.date}
                    </span>
                  </div>

                  {/* Messages for this date */}
                  {group.posts.map((post, index) => {
                    const isOwn = user?.id === post.user_id;
                    const showAvatar = !isOwn && (
                      index === 0 ||
                      group.posts[index - 1]?.user_id !== post.user_id
                    );
                    const showName = showAvatar;

                    return (
                      <MessageBubble
                        key={post.id}
                        post={post}
                        isOwn={isOwn}
                        showAvatar={showAvatar}
                        showName={showName}
                        onReaction={() => handleReaction(post.id, post.user_reacted)}
                        onOpenThread={() => setSelectedPost(post)}
                        getInitials={getInitials}
                      />
                    );
                  })}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input bar */}
        {user && (
          <div className="shrink-0 bg-background border-t border-border px-3 py-2 space-y-2">
            {/* Media preview */}
            {mediaPreview && (
              <div className="relative inline-block">
                <img src={mediaPreview} alt="Preview" className="h-20 rounded-lg object-cover border border-border" />
                <button
                  onClick={clearMedia}
                  className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center shadow-sm"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
            <div className="flex items-end gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="shrink-0 h-10 w-10 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                <ImagePlus className="w-5 h-5" />
              </button>
              <textarea
                ref={textareaRef}
                value={newMessage}
                onChange={handleTextareaInput}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Type a message"
                rows={1}
                className="flex-1 resize-none rounded-2xl border border-input bg-card px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 max-h-[120px]"
              />
              <Button
                size="icon"
                className="rounded-full h-10 w-10 shrink-0"
                onClick={handleSendMessage}
                disabled={(!newMessage.trim() && !mediaFile) || sending}
              >
                {sending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        )}
      </div>

      <PostDetailDialog
        post={selectedPost}
        open={!!selectedPost}
        onOpenChange={(open) => !open && setSelectedPost(null)}
        onPostUpdated={() => selectedGroup && fetchPosts(selectedGroup)}
      />
    </AppLayout>
  );
}

interface MessageBubbleProps {
  post: PostWithProfile;
  isOwn: boolean;
  showAvatar: boolean;
  showName: boolean;
  onReaction: () => void;
  onOpenThread: () => void;
  getInitials: (name: string | null) => string;
}

function MessageBubble({ post, isOwn, showAvatar, showName, onReaction, onOpenThread, getInitials }: MessageBubbleProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-1.5 mb-0.5 ${isOwn ? 'justify-end' : 'justify-start'} ${showAvatar ? 'mt-2' : ''}`}
    >
      {/* Avatar space */}
      {!isOwn && (
        <div className="w-7 shrink-0">
          {showAvatar && (
            <Avatar className="w-7 h-7">
              <AvatarImage src={post.profiles?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/15 text-primary text-[10px]">
                {getInitials(post.profiles?.full_name)}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      )}

      {/* Bubble */}
      <div
        className={`relative max-w-[75%] group ${
          isOwn
            ? 'bg-primary text-primary-foreground rounded-2xl rounded-br-md'
            : 'bg-card border border-border/50 text-foreground rounded-2xl rounded-bl-md'
        } px-3 py-2 shadow-sm cursor-pointer`}
        onClick={onOpenThread}
      >
        {/* Sender name */}
        {showName && !isOwn && (
          <p className="text-[11px] font-semibold text-primary mb-0.5">
            {post.profiles?.full_name || 'Anonymous'}
          </p>
        )}

        {/* Pinned indicator */}
        {post.is_pinned && (
          <div className={`flex items-center gap-1 text-[10px] mb-1 ${isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
            <Pin className="w-2.5 h-2.5" />
            <span>Pinned</span>
          </div>
        )}

        {/* Content */}
        <p className="text-sm whitespace-pre-wrap break-words">{post.content}</p>

        {/* Media */}
        {post.media_url && (
          <img
            src={post.media_url}
            alt=""
            className="mt-1.5 rounded-lg w-full max-h-60 object-cover"
          />
        )}

        {/* Time + meta */}
        <div className={`flex items-center gap-2 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
          <span className={`text-[10px] ${isOwn ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
            {format(new Date(post.created_at), 'h:mm a')}
          </span>
          {post.comment_count > 0 && (
            <span className={`flex items-center gap-0.5 text-[10px] ${isOwn ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
              <MessageCircle className="w-2.5 h-2.5" />
              {post.comment_count}
            </span>
          )}
        </div>

        {/* Reaction badge */}
        {post.reaction_count > 0 && (
          <div
            className={`absolute -bottom-2.5 ${isOwn ? 'left-1' : 'right-1'} bg-card border border-border rounded-full px-1.5 py-0.5 flex items-center gap-0.5 shadow-sm`}
            onClick={(e) => { e.stopPropagation(); onReaction(); }}
          >
            <span className="text-[10px]">❤️</span>
            <span className="text-[10px] text-muted-foreground">{post.reaction_count}</span>
          </div>
        )}
      </div>

      {/* Double-tap hint for reactions - show on hover */}
      {!isOwn && (
        <button
          onClick={(e) => { e.stopPropagation(); onReaction(); }}
          className={`self-center opacity-0 group-hover:opacity-100 transition-opacity ${
            post.user_reacted ? 'text-primary' : 'text-muted-foreground'
          }`}
        >
          <Heart className={`w-3.5 h-3.5 ${post.user_reacted ? 'fill-current' : ''}`} />
        </button>
      )}
    </motion.div>
  );
}
