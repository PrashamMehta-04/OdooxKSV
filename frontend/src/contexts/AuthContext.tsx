import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (data: SignupData) => Promise<void>;
  logout: () => void;
}

interface SignupData {
  name: string;
  email: string;
  password: string;
  role: string;
  vendorName?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem('vendorbridge_token');
    localStorage.removeItem('vendorbridge_user');
    setUser(null);
    setToken(null);
  }, []);

  // Restore session on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('vendorbridge_token');
    const storedUser = localStorage.getItem('vendorbridge_user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        // ignore
      }
      // Verify token with backend
      api.get('/auth/me')
        .then((res) => {
          if (res.data.success) {
            setUser(res.data.data?.user || res.data.data);
          } else {
            logout();
          }
        })
        .catch(() => {
          logout();
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [logout]);

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.data.success) {
      const { token: newToken, user: newUser } = res.data.data;
      localStorage.setItem('vendorbridge_token', newToken);
      localStorage.setItem('vendorbridge_user', JSON.stringify(newUser));
      setToken(newToken);
      setUser(newUser);
    } else {
      throw new Error(res.data.message || 'Login failed');
    }
  };

  const signup = async (data: SignupData) => {
    const res = await api.post('/auth/signup', data);
    if (res.data.success) {
      const { token: newToken, user: newUser } = res.data.data;
      localStorage.setItem('vendorbridge_token', newToken);
      localStorage.setItem('vendorbridge_user', JSON.stringify(newUser));
      setToken(newToken);
      setUser(newUser);
    } else {
      throw new Error(res.data.message || 'Signup failed');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        login,
        signup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider');
  return ctx;
};

export default AuthContext;
