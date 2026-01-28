import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Heart, MessageCircle, Pin, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Post, Profile, Comment } from '@/types/database';
import { formatDistanceToNow } from 'date-fns';
import { toast } from '@/hooks/use-toast';

interface CommentWithProfile extends Comment {
  profiles: Profile;
}

interface PostWithProfile extends Post {
  profiles: Profile;
  comment_count: number;
  reaction_count: number;
  user_reacted: boolean;
}

interface PostDetailDialogProps {
  post: PostWithProfile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPostUpdated: () => void;
}

export function PostDetailDialog({ post, open, onOpenChange, onPostUpdated }: PostDetailDialogProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<CommentWithProfile[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && post) {
      fetchComments();
    }
  }, [open, post]);

  const fetchComments = async () => {
    if (!post) return;
    setLoading(true);

    const { data: commentsData } = await supabase
      .from('comments')
      .select('*')
      .eq('post_id', post.id)
      .order('created_at', { ascending: true });

    if (commentsData) {
      const commentsWithProfiles = await Promise.all(
        commentsData.map(async (comment) => {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', comment.user_id)
            .single();
          return {
            ...comment,
            profiles: profileData as Profile,
          };
        })
      );
      setComments(commentsWithProfiles);
    }

    setLoading(false);
  };

  const handleSubmitComment = async () => {
    if (!user || !post || !newComment.trim()) return;

    setSubmitting(true);

    const { error } = await supabase.from('comments').insert({
      post_id: post.id,
      user_id: user.id,
      content: newComment.trim(),
    });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to post comment. Please try again.',
        variant: 'destructive',
      });
    } else {
      setNewComment('');
      fetchComments();
      onPostUpdated();
      toast({
        title: 'Comment posted',
        description: 'Your comment has been added.',
      });
    }

    setSubmitting(false);
  };

  const handleReaction = async () => {
    if (!user || !post) return;

    if (post.user_reacted) {
      await supabase.from('reactions').delete().eq('post_id', post.id).eq('user_id', user.id);
    } else {
      await supabase.from('reactions').insert({ post_id: post.id, user_id: user.id, emoji: '❤️' });
    }

    onPostUpdated();
  };

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (!post) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] p-0 gap-0 flex flex-col">
        <DialogHeader className="p-4 border-b border-border">
          <DialogTitle className="sr-only">Post Details</DialogTitle>
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10">
              <AvatarImage src={post.profiles?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/20 text-primary text-xs">
                {getInitials(post.profiles?.full_name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm truncate">
                  {post.profiles?.full_name || 'Anonymous'}
                </span>
                {post.is_pinned && <Pin className="w-3 h-3 text-primary" />}
              </div>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
              </span>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 max-h-[60vh]">
          <div className="p-4">
            {/* Post content */}
            <p className="text-sm whitespace-pre-wrap">{post.content}</p>

            {post.media_url && (
              <img
                src={post.media_url}
                alt=""
                className="mt-3 rounded-lg w-full max-h-80 object-cover"
              />
            )}

            {/* Reactions bar */}
            <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border/50">
              <button
                onClick={handleReaction}
                className={`flex items-center gap-1.5 text-sm transition-colors ${
                  post.user_reacted ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Heart className={`w-4 h-4 ${post.user_reacted ? 'fill-current' : ''}`} />
                {post.reaction_count > 0 && <span>{post.reaction_count}</span>}
              </button>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <MessageCircle className="w-4 h-4" />
                <span>{comments.length} {comments.length === 1 ? 'comment' : 'comments'}</span>
              </div>
            </div>

            {/* Comments section */}
            <div className="mt-4 pt-4 border-t border-border">
              <h4 className="text-sm font-medium mb-3">Comments</h4>

              {loading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : comments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No comments yet. Be the first to comment!
                </p>
              ) : (
                <div className="space-y-4">
                  <AnimatePresence mode="popLayout">
                    {comments.map((comment, index) => (
                      <motion.div
                        key={comment.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex gap-3"
                      >
                        <Avatar className="w-8 h-8 flex-shrink-0">
                          <AvatarImage src={comment.profiles?.avatar_url || undefined} />
                          <AvatarFallback className="bg-secondary text-xs">
                            {getInitials(comment.profiles?.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="bg-secondary/50 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm">
                                {comment.profiles?.full_name || 'Anonymous'}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                              </span>
                            </div>
                            <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        {/* Comment input */}
        {user && (
          <div className="p-4 border-t border-border bg-background">
            <div className="flex gap-2">
              <Textarea
                placeholder="Write a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="min-h-[60px] resize-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    handleSubmitComment();
                  }
                }}
              />
              <Button
                size="icon"
                onClick={handleSubmitComment}
                disabled={!newComment.trim() || submitting}
                className="self-end"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Press Ctrl+Enter to submit
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
