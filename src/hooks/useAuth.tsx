import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { clearLocalCache } from '../lib/queryClient';
import { syncPushSubscription } from '../lib/push';

interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
  /** True after following a password-reset email link. */
  passwordRecovery: boolean;
  clearPasswordRecovery: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [passwordRecovery, setPasswordRecovery] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      setLoading(false);
      if (event === 'SIGNED_OUT') clearLocalCache();
      if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true);
      // Re-associate this device's push subscription with whoever just signed in.
      if (event === 'SIGNED_IN') setTimeout(() => void syncPushSubscription().catch(console.warn), 0);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        loading,
        passwordRecovery,
        clearPasswordRecovery: () => setPasswordRecovery(false),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

/** Signed-in user's id. Only use inside routes guarded by <RequireAuth>. */
export function useUserId(): string {
  const { user } = useAuth();
  if (!user) throw new Error('useUserId called without a signed-in user');
  return user.id;
}
