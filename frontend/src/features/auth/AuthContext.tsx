import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { login as loginRequest } from '../../api/auth';
import { clearToken, getToken, setToken } from '../../api/client';
import type { AuthUser } from '../../lib/types';

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const USER_KEY = 'simpleinvoice.user';

function loadStoredUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() =>
    getToken() ? loadStoredUser() : null,
  );

  const logout = useCallback(() => {
    clearToken();
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await loginRequest(email, password);
    setToken(res.accessToken);
    localStorage.setItem(USER_KEY, JSON.stringify(res.user));
    setUser(res.user);
  }, []);

  // React to 401s emitted by the axios interceptor (e.g. expired token).
  useEffect(() => {
    const handler = () => logout();
    window.addEventListener('simpleinvoice:unauthorized', handler);
    return () => window.removeEventListener('simpleinvoice:unauthorized', handler);
  }, [logout]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, isAuthenticated: !!user, login, logout }),
    [user, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
