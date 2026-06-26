import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState } from 'react';

import { SHOP_ID } from '@/lib/config';
import type { Profile, UserRole } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';

type SignUpParams = {
  email: string;
  password: string;
  fullName: string;
  role: UserRole;
  /** Staff role label for barbers (e.g. "Senior Barber"); the shop itself is provisioned separately. */
  title?: string;
};

type SessionContextValue = {
  session: Session | null;
  profile: Profile | null;
  /** True until the initial session + profile have been resolved. */
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (params: SignUpParams) => Promise<{ needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, role, phone, avatar_url, shop_id')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return (data as Profile) ?? null;
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load(nextSession: Session | null) {
      if (!active) return;
      if (nextSession?.user) {
        // Resolve the profile BEFORE publishing the session. Otherwise there is a
        // render where session is set but profile is still null, which makes every
        // role guard in RootNavigator false and drops the user onto the unguarded
        // /catalog fallback. Setting profile first (and session last) keeps the auth
        // screen up until the role is known, then both flip together.
        let p: Profile | null = null;
        try {
          p = await fetchProfile(nextSession.user.id);
        } catch {
          p = null;
        }
        if (!active) return;
        setProfile(p);
        setSession(nextSession);
      } else {
        setSession(null);
        setProfile(null);
      }
      if (active) setLoading(false);
    }

    supabase.auth.getSession().then(({ data }) => load(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      load(nextSession);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value: SessionContextValue = {
    session,
    profile,
    loading,
    async signIn(email, password) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    },
    async signUp({ email, password, fullName, role, title }) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName, role, title, shop_id: SHOP_ID } },
      });
      if (error) throw error;
      // No session means email confirmation is required for this project.
      return { needsConfirmation: !data.session };
    },
    async signOut() {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
    async refreshProfile() {
      if (session?.user) setProfile(await fetchProfile(session.user.id));
    },
  };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within a SessionProvider');
  return ctx;
}
