import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Session, UserStatus } from '../types';
import { sessionService } from '../services/sessionService';
import {
  clearSessionTokenCookie,
  getSessionTokenFromCookie,
  setSessionTokenCookie,
} from '../utils/cookie';

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
    const token = getSessionTokenFromCookie();
    const currentSession = await sessionService.getSession(token);
    setSession(currentSession);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const setSessionToken = useCallback((token: string) => {
    setSessionTokenCookie(token);
  }, []);

  const logout = useCallback(async (all: boolean = false) => {
    const token = getSessionTokenFromCookie();
    if (token) {
      await sessionService.logout(token, all);
    }
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
