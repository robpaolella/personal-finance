import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { apiFetch } from '../lib/api';

interface User {
  id: number;
  username: string;
  displayName: string;
  role: 'owner' | 'admin' | 'member';
  permissions: Record<string, boolean>;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isAdmin: () => boolean;
  isOwner: () => boolean;
  hasPermission: (permission: string) => boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    const res = await apiFetch<{ data: User }>('/auth/me');
    setUser(res.data);
  }, []);

  // Validate existing token on mount
  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    fetchMe()
      .catch(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setToken(null);
        setUser(null);
      })
      .finally(() => setIsLoading(false));
  }, [token, fetchMe]);

  const login = useCallback(async (username: string, password: string) => {
    const res = await apiFetch<{ data: { token: string; user: User } }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
      skipAuth: true,
    });

    localStorage.setItem('token', res.data.token);
    localStorage.setItem('user', JSON.stringify(res.data.user));
    setToken(res.data.token);
    // Fetch full user with permissions from /me
    const meRes = await apiFetch<{ data: User }>('/auth/me');
    setUser(meRes.data);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  }, []);

  const isAdmin = useCallback(() => user?.role === 'admin' || user?.role === 'owner', [user]);

  const isOwner = useCallback(() => user?.role === 'owner', [user]);

  const hasPermission = useCallback((permission: string) => {
    if (!user) return false;
    if (user.role === 'admin' || user.role === 'owner') return true;
    return user.permissions[permission] === true;
  }, [user]);

  const refreshUser = useCallback(async () => {
    if (token) await fetchMe();
  }, [token, fetchMe]);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, isAdmin, isOwner, hasPermission, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
