import React, { createContext, useState, useEffect, useCallback } from 'react';
import { getSupabase } from '../services/supabase';
export const TokenContext = createContext();
export const TokenProvider = ({ children }) => {
  const [token, updateToken] = useState(null);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [authReady, setAuthReady] = useState(false);
  const [profileUpdateTrigger, setProfileUpdateTrigger] = useState(0);
  useEffect(() => {
    let disposed = false, subscription;
    const apply = session => {
      if (disposed) return;
      const accessToken = session?.access_token || null;
      // Retain the existing API interceptor contract; Supabase manages refresh tokens.
      if (accessToken) localStorage.setItem('token', accessToken);
      else localStorage.removeItem('token');
      updateToken(accessToken);
      setEmail(session?.user?.email || '');
      setName(session?.user?.user_metadata?.full_name || session?.user?.user_metadata?.name || '');
      setAuthReady(true);
    };
    getSupabase().then(async client => {
      if (disposed) return;
      subscription = client.auth.onAuthStateChange((event, session) => apply(session)).data.subscription;
      const { data } = await client.auth.getSession();
      apply(data.session);
    }).catch(() => apply(null));
    return () => { disposed = true; subscription?.unsubscribe(); };
  }, []);
  const setToken = useCallback(async value => {
    if (value === null) {
      localStorage.removeItem('token');
      updateToken(null);
      setEmail(''); setName('');
      try { await (await getSupabase()).auth.signOut({ scope: 'local' }); } catch {}
    }
  }, []);
  const triggerProfileUpdate = () => setProfileUpdateTrigger(n => n + 1);
  // Wait for stored-session restoration before protected pages decide to redirect.
  if (!authReady) return <div role="status">Loading your session…</div>;
  return <TokenContext.Provider value={{ token, setToken, email, setEmail, name, setName, authReady, profileUpdateTrigger, triggerProfileUpdate }}>{children}</TokenContext.Provider>;
};
