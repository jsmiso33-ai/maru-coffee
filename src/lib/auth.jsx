import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [role, setRole] = useState(null); // 'admin' | 'member' | null(명단에 없음)
  const [sessionReady, setSessionReady] = useState(!supabase);
  const [roleLoading, setRoleLoading] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setSessionReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      // OAuth 리다이렉트로 돌아온 뒤 주소창의 토큰 해시를 지운다
      if (next && /access_token=/.test(window.location.hash)) {
        history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const userId = session?.user?.id;
  useEffect(() => {
    if (!supabase || !userId) {
      setRole(null);
      return;
    }
    let alive = true;
    setRoleLoading(true);
    supabase.rpc('my_role').then(({ data, error }) => {
      if (!alive) return;
      setRole(error ? null : data);
      setRoleLoading(false);
    });
    return () => { alive = false; };
  }, [userId]);

  const signIn = useCallback(() => {
    if (!supabase) return;
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.href.split('#')[0], queryParams: { prompt: 'select_account' } },
    });
  }, []);

  const signOut = useCallback(() => supabase?.auth.signOut(), []);

  const user = session?.user ?? null;
  const value = {
    user,
    loading: !sessionReady || roleLoading,
    role,
    isMember: role === 'member' || role === 'admin',
    isAdmin: role === 'admin',
    displayName: user?.user_metadata?.full_name || user?.email?.split('@')[0] || '',
    avatar: user?.user_metadata?.avatar_url || null,
    signIn,
    signOut,
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
