"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  getSessionInfo,
  loginWithSession,
  logoutSession,
  type SessionInfo,
} from "@/lib/api";

type SessionContextValue = {
  session: SessionInfo | null;
  loading: boolean;
  error: string | null;
  canWrite: boolean;
  refreshSession: () => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshSession = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getSessionInfo();
      setSession(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load session.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      setLoading(true);
      setError(null);
      try {
        const data = await getSessionInfo();
        if (!cancelled) {
          setSession(data);
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : "Failed to load session.";
          setError(message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadSession();

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    setError(null);
    try {
      const data = await loginWithSession(username, password);
      setSession(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed.";
      setError(message);
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    setError(null);
    try {
      await logoutSession();
      const data = await getSessionInfo();
      setSession(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Logout failed.";
      setError(message);
      throw err;
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({
      session,
      loading,
      error,
      canWrite: Boolean(session?.is_authenticated && (session.is_staff || session.has_office_role)),
      refreshSession,
      login,
      logout,
      clearError,
    }),
    [session, loading, error, refreshSession, login, logout, clearError],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSessionAuth() {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSessionAuth must be used within SessionProvider");
  }
  return ctx;
}
