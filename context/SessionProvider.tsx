import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Session, UserStatus } from '../types';
import { sessionService } from '../services/sessionService';
import { clearSessionTokenCookie, getSessionTokenFromCookie, setSessionTokenCookie } from '../utils/cookie';
import { AUTH_POLL_INTERVAL_MS, USE_AUTH_FLOW } from '../constants';

type SessionContextValue = {
  session: Session;
  loading: boolean;
  refresh: () => Promise<void>;
  setSessionToken: (token: string) => void;
  logout: (all?: boolean) => Promise<void>;
  clearSession: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside SessionProvider');
  return ctx;
}

export const SessionProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [session, setSession] = useState<Session>({ status: UserStatus.UNKNOWN });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);

    // ✅ HttpOnly cookie не читается JS → в auth-flow передаём null
    const token = USE_AUTH_FLOW ? null : getSessionTokenFromCookie();

    const currentSession = await sessionService.getSession(token);
    setSession(currentSession);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // polling оставляем только если loginToken реально есть (в BFF режиме его нет)
  useEffect(() => {
    if (!USE_AUTH_FLOW) return;
    if (session.status !== UserStatus.ANONYMOUS || !session.loginToken) return;

    let active = true;
    const poll = async () => {
      const res = await sessionService.checkAuth(session.loginToken as string);
      if (!active) return;

      if (res.status === 'authorized') {
        await refresh();
        return;
      }
      if (res.status === 'denied') {
        sessionService.clearAuthFlow();
        await refresh();
      }
    };

    poll();
    const timer = window.setInterval(poll, AUTH_POLL_INTERVAL_MS);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [refresh, session.loginToken, session.status]);

  const setSessionToken = useCallback((token: string) => {
    setSessionTokenCookie(token);
  }, []);

  const logout = useCallback(async (all: boolean = false) => {
    const token = USE_AUTH_FLOW ? null : getSessionTokenFromCookie();
    await sessionService.logout(token, all);

    clearSessionTokenCookie();
    setSession({ status: UserStatus.UNKNOWN });
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({
      session,
      loading,
      refresh,
      setSessionToken,
      logout,
      clearSession: logout,
    }),
    [session, loading, refresh, setSessionToken, logout]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
};
