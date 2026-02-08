import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface FastSession {
  id: string;
  user_id: string;
  start_at: string;
  end_at: string | null;
  duration_minutes: number | null;
  status: 'active' | 'completed' | 'deleted';
  created_at: string;
  updated_at: string;
}

export const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hours === 0) return `${mins}m`;
  return `${hours}h ${mins}m`;
};

export const formatTimerDisplay = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export function useFastingSessions() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<FastSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSession, setActiveSession] = useState<FastSession | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Fetch all sessions (not deleted)
  const fetchSessions = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('fast_sessions')
      .select('*')
      .eq('user_id', user.id)
      .neq('status', 'deleted')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching fast sessions:', error);
      return;
    }

    // Cast to our type - the database schema matches
    const typedSessions = (data || []) as unknown as FastSession[];
    setSessions(typedSessions);

    // Find active session
    const active = typedSessions.find(s => s.status === 'active');
    setActiveSession(active || null);

    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Calculate elapsed time for active session
  useEffect(() => {
    if (!activeSession) {
      setElapsedSeconds(0);
      return;
    }

    const calculateElapsed = () => {
      const start = new Date(activeSession.start_at).getTime();
      const now = Date.now();
      return Math.floor((now - start) / 1000);
    };

    setElapsedSeconds(calculateElapsed());

    const interval = setInterval(() => {
      setElapsedSeconds(calculateElapsed());
    }, 1000);

    return () => clearInterval(interval);
  }, [activeSession]);

  // Start a new fast
  const startFast = async (): Promise<boolean> => {
    if (!user) {
      toast({
        title: 'Not logged in',
        description: 'Please log in to start a fast.',
        variant: 'destructive',
      });
      return false;
    }

    if (activeSession) {
      toast({
        title: 'Fast already active',
        description: 'You already have an active fast running.',
        variant: 'destructive',
      });
      return false;
    }

    const { data, error } = await supabase
      .from('fast_sessions')
      .insert({
        user_id: user.id,
        start_at: new Date().toISOString(),
        status: 'active',
      })
      .select()
      .single();

    if (error) {
      console.error('Error starting fast:', error);
      toast({
        title: 'Error',
        description: 'Failed to start fast. Please try again.',
        variant: 'destructive',
      });
      return false;
    }

    toast({
      title: 'Fast started',
      description: 'Your fasting timer has begun. Good luck!',
    });

    await fetchSessions();
    return true;
  };

  // End the current fast
  const endFast = async (): Promise<boolean> => {
    if (!user || !activeSession) return false;

    const endAt = new Date();
    const startAt = new Date(activeSession.start_at);
    const durationMinutes = Math.round((endAt.getTime() - startAt.getTime()) / 60000);

    const { error } = await supabase
      .from('fast_sessions')
      .update({
        end_at: endAt.toISOString(),
        duration_minutes: durationMinutes,
        status: 'completed',
      })
      .eq('id', activeSession.id);

    if (error) {
      console.error('Error ending fast:', error);
      toast({
        title: 'Error',
        description: 'Failed to end fast. Please try again.',
        variant: 'destructive',
      });
      return false;
    }

    toast({
      title: 'Fast completed!',
      description: `You fasted for ${formatDuration(durationMinutes)}. Great job!`,
    });

    await fetchSessions();
    return true;
  };

  // Soft delete a fast session
  const deleteFastSession = async (sessionId: string): Promise<boolean> => {
    if (!user) return false;

    const { error } = await supabase
      .from('fast_sessions')
      .update({ status: 'deleted' })
      .eq('id', sessionId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting fast session:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete fast. Please try again.',
        variant: 'destructive',
      });
      return false;
    }

    toast({
      title: 'Fast deleted',
      description: 'The fast entry has been removed.',
    });

    await fetchSessions();
    return true;
  };

  // Get completed sessions for a specific date
  const getSessionsForDate = useCallback((date: Date): FastSession[] => {
    const dateStart = new Date(date);
    dateStart.setHours(0, 0, 0, 0);
    const dateEnd = new Date(date);
    dateEnd.setHours(23, 59, 59, 999);

    return sessions.filter(session => {
      if (session.status !== 'completed' || !session.end_at) return false;
      const endAt = new Date(session.end_at);
      return endAt >= dateStart && endAt <= dateEnd;
    });
  }, [sessions]);

  // Get all completed sessions
  const completedSessions = useMemo(() => {
    return sessions.filter(s => s.status === 'completed');
  }, [sessions]);

  return {
    sessions,
    completedSessions,
    activeSession,
    elapsedSeconds,
    loading,
    startFast,
    endFast,
    deleteFastSession,
    getSessionsForDate,
    refetch: fetchSessions,
  };
}
