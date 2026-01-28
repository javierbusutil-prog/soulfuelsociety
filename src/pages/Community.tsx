import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Pin, MessageCircle, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Post, Group, Profile } from '@/types/database';
import { formatDistanceToNow } from 'date-fns';
import { CreatePostDialog } from '@/components/community/CreatePostDialog';
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
  const [createPostOpen, setCreatePostOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<PostWithProfile | null>(null);

  useEffect(() => {
    fetchGroups();
  }, []);

  useEffect(() => {
    if (selectedGroup) {
      fetchPosts(selectedGroup);
    }
  }, [selectedGroup, user]);

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
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false });

    if (postsData) {
      // Fetch profiles and counts for each post
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

  const pinnedPosts = posts.filter(p => p.is_pinned);
  const regularPosts = posts.filter(p => !p.is_pinned);

  return (
    <AppLayout title="Community">
      <div className="max-w-lg mx-auto">
        {/* Group tabs */}
        <div className="flex gap-2 overflow-x-auto hide-scrollbar px-4 py-3 border-b border-border">
          {groups.map((group) => (
            <Button
              key={group.id}
              variant={selectedGroup === group.id ? 'default' : 'secondary'}
              size="sm"
              onClick={() => setSelectedGroup(group.id)}
              className="whitespace-nowrap"
            >
              {group.name}
            </Button>
          ))}
        </div>

        {/* Posts feed */}
        <div className="p-4 space-y-4">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="p-4 animate-pulse">
                  <div className="flex gap-3">
                    <div className="w-10 h-10 bg-muted rounded-full" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded w-1/3" />
                      <div className="h-3 bg-muted rounded w-1/4" />
                    </div>
                  </div>
                  <div className="mt-3 space-y-2">
                    <div className="h-3 bg-muted rounded" />
                    <div className="h-3 bg-muted rounded w-4/5" />
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <>
              {/* Pinned posts */}
              {pinnedPosts.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase font-medium">
                    <Pin className="w-3 h-3" />
                    Pinned
                  </div>
                  {pinnedPosts.map((post, index) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      index={index}
                      onReaction={() => handleReaction(post.id, post.user_reacted)}
                      onClick={() => setSelectedPost(post)}
                      getInitials={getInitials}
                    />
                  ))}
                </div>
              )}

              {/* Regular posts */}
              {regularPosts.map((post, index) => (
                <PostCard
                  key={post.id}
                  post={post}
                  index={index + pinnedPosts.length}
                  onReaction={() => handleReaction(post.id, post.user_reacted)}
                  onClick={() => setSelectedPost(post)}
                  getInitials={getInitials}
                />
              ))}

              {posts.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No posts yet. Be the first to share!</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* FAB for new post */}
        <Button
          size="icon-lg"
          className="fixed bottom-24 right-4 rounded-full shadow-lg glow-primary"
          onClick={() => setCreatePostOpen(true)}
        >
          <Plus className="w-6 h-6" />
        </Button>

        <CreatePostDialog
          open={createPostOpen}
          onOpenChange={setCreatePostOpen}
          groupId={selectedGroup || ''}
          onSuccess={() => selectedGroup && fetchPosts(selectedGroup)}
        />

        <PostDetailDialog
          post={selectedPost}
          open={!!selectedPost}
          onOpenChange={(open) => !open && setSelectedPost(null)}
          onPostUpdated={() => selectedGroup && fetchPosts(selectedGroup)}
        />
      </div>
    </AppLayout>
  );
}

interface PostCardProps {
  post: PostWithProfile;
  index: number;
  onReaction: () => void;
  onClick: () => void;
  getInitials: (name: string | null) => string;
}

function PostCard({ post, index, onReaction, onClick, getInitials }: PostCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card 
        className="p-4 bg-card/50 border-border/50 hover:bg-card/70 transition-colors cursor-pointer"
        onClick={onClick}
      >
        <div className="flex gap-3">
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
              {post.is_pinned && (
                <Pin className="w-3 h-3 text-primary" />
              )}
            </div>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
            </span>
          </div>
        </div>

        <p className="mt-3 text-sm whitespace-pre-wrap">{post.content}</p>

        {post.media_url && (
          <img
            src={post.media_url}
            alt=""
            className="mt-3 rounded-lg w-full max-h-80 object-cover"
          />
        )}

        <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border/50">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onReaction();
            }}
            className={`flex items-center gap-1.5 text-sm transition-colors ${
              post.user_reacted ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Heart className={`w-4 h-4 ${post.user_reacted ? 'fill-current' : ''}`} />
            {post.reaction_count > 0 && <span>{post.reaction_count}</span>}
          </button>
          <button 
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            {post.comment_count > 0 && <span>{post.comment_count}</span>}
          </button>
        </div>
      </Card>
    </motion.div>
  );
}
