/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import { apiRequest } from "../lib/api";

export type Role = "ADMIN" | "PROCUREMENT_OFFICER" | "VENDOR" | "MANAGER";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: "ACTIVE" | "INVITED" | "SUSPENDED";
  createdAt: string;
}

interface AuthResponse {
  user: AuthUser;
  accessToken: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  accessToken: string | null;
  isBootstrapping: boolean;
  login: (input: { email: string; password: string }) => Promise<void>;
  signup: (input: { name: string; email: string; password: string; role: Role }) => Promise<void>;
  forgotPassword: (input: { email: string }) => Promise<string>;
  resetPassword: (input: { email: string; otp: string; newPassword: string }) => Promise<string>;
  logout: () => Promise<void>;
}

const accessTokenKey = "vendorbridge_access_token";
const AuthContext = createContext<AuthContextValue | null>(null);

function getStoredAccessToken() {
  return window.localStorage.getItem(accessTokenKey);
}

function storeAccessToken(token: string) {
  window.localStorage.setItem(accessTokenKey, token);
}

function clearStoredAccessToken() {
  window.localStorage.removeItem(accessTokenKey);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(() => getStoredAccessToken());
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  const applyAuthResponse = useCallback((response: AuthResponse) => {
    setUser(response.user);
    setAccessToken(response.accessToken);
    storeAccessToken(response.accessToken);
  }, []);

  const refreshSession = useCallback(async () => {
    const response = await apiRequest<AuthResponse>("/auth/refresh", {
      method: "POST"
    });
    applyAuthResponse(response);
  }, [applyAuthResponse]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const storedToken = getStoredAccessToken();

      try {
        if (storedToken) {
          const response = await apiRequest<{ user: AuthUser }>("/auth/me", {
            headers: {
              Authorization: `Bearer ${storedToken}`
            }
          });

          if (!cancelled) {
            setUser(response.user);
            setAccessToken(storedToken);
          }

          return;
        }

        await refreshSession();
      } catch {
        clearStoredAccessToken();

        if (!cancelled) {
          setUser(null);
          setAccessToken(null);
        }
      } finally {
        if (!cancelled) {
          setIsBootstrapping(false);
        }
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [refreshSession]);

  const login = useCallback(
    async (input: { email: string; password: string }) => {
      const response = await apiRequest<AuthResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify(input)
      });
      applyAuthResponse(response);
    },
    [applyAuthResponse]
  );

  const signup = useCallback(
    async (input: { name: string; email: string; password: string; role: Role }) => {
      const response = await apiRequest<AuthResponse>("/auth/signup", {
        method: "POST",
        body: JSON.stringify(input)
      });
      applyAuthResponse(response);
    },
    [applyAuthResponse]
  );

  const forgotPassword = useCallback(async (input: { email: string }) => {
    const response = await apiRequest<{ message: string }>("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify(input)
    });

    return response.message;
  }, []);

  const resetPassword = useCallback(async (input: { email: string; otp: string; newPassword: string }) => {
    const response = await apiRequest<{ message: string }>("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify(input)
    });

    return response.message;
  }, []);

  const logout = useCallback(async () => {
    clearStoredAccessToken();
    setUser(null);
    setAccessToken(null);

    await apiRequest<void>("/auth/logout", {
      method: "POST"
    }).catch(() => undefined);
  }, []);

  const value = useMemo(
    () => ({
      user,
      accessToken,
      isBootstrapping,
      login,
      signup,
      forgotPassword,
      resetPassword,
      logout
    }),
    [accessToken, forgotPassword, isBootstrapping, login, logout, resetPassword, signup, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const auth = useContext(AuthContext);

  if (!auth) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return auth;
}
