import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useCoachCommunityNotifications() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchCount = async () => {
    if (!user) return;
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('type', 'community_post')
      .eq('read', false);
    setUnreadCount(count || 0);
  };

  const markAsRead = async () => {
    if (!user) return;
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('type', 'community_post')
      .eq('read', false);
    setUnreadCount(0);
  };

  useEffect(() => {
    fetchCount();

    // Real-time subscription
    const channel = supabase
      .channel('coach-community-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user?.id}`,
        },
        (payload) => {
          if ((payload.new as any)?.type === 'community_post') {
            setUnreadCount(prev => prev + 1);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  return { unreadCount, markAsRead, refetch: fetchCount };
}
