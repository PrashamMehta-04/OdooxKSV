import { createContext, useContext, useEffect, useState } from 'react';
import { apiFetch, clearToken, getToken, setToken } from './api';
import type { AuthUser, LoginPayload, RegisterPayload } from './types';

type AuthState = {
  user: AuthUser | null;
  ready: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  async function refresh() {
    const token = getToken();
    if (!token) {
      setUser(null);
      setReady(true);
      return;
    }

    try {
      const response = await apiFetch<AuthUser>('/auth/me', { method: 'GET' });
      setUser(response);
    } catch {
      clearToken();
      setUser(null);
    } finally {
      setReady(true);
    }
  }

  async function login(payload: LoginPayload) {
    const response = await apiFetch<{ user: AuthUser; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setToken(response.token);
    setUser(response.user);
  }

  async function register(payload: RegisterPayload) {
    const response = await apiFetch<{ user: AuthUser; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setToken(response.token);
    setUser(response.user);
  }

  function logout() {
    clearToken();
    setUser(null);
    window.location.hash = '#/login';
  }

  useEffect(() => {
    void refresh();
  }, []);

  return (
    <AuthContext.Provider value={{ user, ready, login, register, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return value;
}
