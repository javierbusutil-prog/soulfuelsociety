import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { User, Session, RealtimeChannel } from '@supabase/supabase-js';
import debounce from 'lodash.debounce';
import { supabase } from '@/integrations/supabase/client';
import { Profile, UserRole, AppRole } from '@/types/database';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: AppRole[];
  loading: boolean;
  isAdmin: boolean;
  isPTAdmin: boolean;
  isPaidMember: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<{ userId: string; channel: RealtimeChannel } | null>(null);

  const fetchProfile = async (userId: string) => {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (profileData) {
      setProfile(profileData as Profile);
    }

    const { data: rolesData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);
    
    if (rolesData) {
      setRoles(rolesData.map(r => r.role as AppRole));
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  const checkSubscription = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session?.access_token) {
        return;
      }
      const { data } = await supabase.functions.invoke('check-subscription');
      if (data?.subscribed) {
        // Refresh profile to pick up updated subscription_status and role
        const currentUser = (await supabase.auth.getUser()).data.user;
        if (currentUser) {
          await fetchProfile(currentUser.id);
        }
      }
    } catch (e) {
      console.error('Subscription check failed:', e);
    }
  };

  useEffect(() => {
    // Debounced refetch — collapses near-simultaneous role + profile change events into one fetch
    const debouncedFetch = debounce((uid: string) => {
      fetchProfile(uid);
    }, 200);

    const subscribeUserState = (uid: string) => {
      // Guard against double-subscribing (e.g., on TOKEN_REFRESHED for the same user)
      if (channelRef.current?.userId === uid) return;
      // Tear down any existing channel for a previous user
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current.channel);
        channelRef.current = null;
      }
      const channel = supabase
        .channel(`user-state-${uid}`)
        .on(
          'postgres_changes' as any,
          { event: '*', schema: 'public', table: 'user_roles', filter: `user_id=eq.${uid}` },
          () => debouncedFetch(uid)
        )
        .on(
          'postgres_changes' as any,
          { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${uid}` },
          () => debouncedFetch(uid)
        )
        .subscribe();
      channelRef.current = { userId: uid, channel };
    };

    const teardownChannel = () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current.channel);
        channelRef.current = null;
      }
    };

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Await profile fetch before setting loading to false
          // Use setTimeout to avoid potential deadlock with Supabase client
          setTimeout(async () => {
            await fetchProfile(session.user.id);
            checkSubscription();
            subscribeUserState(session.user.id);
            setLoading(false);
          }, 0);
        } else {
          setProfile(null);
          setRoles([]);
          teardownChannel();
          setLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        await fetchProfile(session.user.id);
        checkSubscription();
        subscribeUserState(session.user.id);
      }
      
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
      debouncedFetch.cancel();
      teardownChannel();
    };
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: fullName },
      },
    });
    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRoles([]);
  };

  const isAdmin = roles.includes('admin');
  const isPTAdmin = roles.includes('pt_admin');
  const isPaidMember = roles.includes('paid') || isAdmin || isPTAdmin;

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      roles,
      loading,
      isAdmin,
      isPTAdmin,
      isPaidMember,
      signUp,
      signIn,
      signOut,
      refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
