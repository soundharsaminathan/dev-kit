import {
  createContext,
  createElement,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { apiRequest, createApiClient, type ApiClient } from "./api";
import {
  homePathForUser,
  isAuthBypassEnabled,
  SEED_PASSWORD,
  SESSION_STORAGE_KEY,
  type UserRole,
} from "./constants";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  companyId: string | null;
  branchId?: string | null;
};

type SessionPayload = {
  token: string;
  user: AuthUser;
};

type LoginResponse = {
  accessToken?: string;
  token?: string;
  user: AuthUser;
};

export type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  api: ApiClient;
  login: (email: string, password: string) => Promise<AuthUser>;
  loginAsSeed: (email: string) => Promise<AuthUser>;
  loginAs: (userId: string) => Promise<AuthUser>;
  logout: () => void;
  refreshMe: () => Promise<AuthUser | null>;
  homePath: string;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function readSession(): SessionPayload | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SessionPayload;
    if (!parsed?.token || !parsed?.user?.role) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeSession(session: SessionPayload | null) {
  if (!session) {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    return;
  }
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

function normalizeLogin(data: LoginResponse): SessionPayload {
  const token = data.accessToken ?? data.token;
  if (!token) {
    throw new Error("Login response missing token");
  }
  return { token, user: data.user };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const initial = readSession();
  const [token, setToken] = useState<string | null>(initial?.token ?? null);
  const [user, setUser] = useState<AuthUser | null>(initial?.user ?? null);
  const [loading] = useState(false);

  const logout = useCallback(() => {
    writeSession(null);
    setToken(null);
    setUser(null);
  }, []);

  const api = useMemo(
    () =>
      createApiClient(() => token, {
        onUnauthorized: logout,
      }),
    [token, logout],
  );

  const applySession = useCallback((session: SessionPayload) => {
    writeSession(session);
    setToken(session.token);
    setUser(session.user);
    return session.user;
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const data = await apiRequest<LoginResponse>("/auth/login", {
        method: "POST",
        body: { email, password },
      });
      return applySession(normalizeLogin(data));
    },
    [applySession],
  );

  const loginAsSeed = useCallback(
    async (email: string) => {
      if (!isAuthBypassEnabled()) {
        throw new Error("Auth bypass is disabled");
      }
      const data = await apiRequest<LoginResponse>("/auth/login", {
        method: "POST",
        body: { email, password: SEED_PASSWORD },
      });
      return applySession(normalizeLogin(data));
    },
    [applySession],
  );

  const loginAs = useCallback(
    async (userId: string) => {
      if (!isAuthBypassEnabled()) {
        throw new Error("Auth bypass is disabled");
      }
      const data = await apiRequest<LoginResponse>("/auth/bypass", {
        method: "POST",
        body: { userId },
      });
      return applySession(normalizeLogin(data));
    },
    [applySession],
  );

  const refreshMe = useCallback(async () => {
    if (!token) return null;
    try {
      const me = await apiRequest<AuthUser>("/auth/me", { token });
      const session = { token, user: me };
      writeSession(session);
      setUser(me);
      return me;
    } catch {
      logout();
      return null;
    }
  }, [token, logout]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      loading,
      api,
      login,
      loginAsSeed,
      loginAs,
      logout,
      refreshMe,
      homePath: user ? homePathForUser(user.role) : "/login",
    }),
    [user, token, loading, api, login, loginAsSeed, loginAs, logout, refreshMe],
  );

  return createElement(AuthContext.Provider, { value }, children);
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
