import {
  type User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { apiRequest } from "./api";
import {
  DEV_USERS,
  type DevUser,
  findDevUserByLogin,
  isAuthBypassEnabled,
  resolveLoginEmail,
  STUDIO_ID,
  type UserRole,
} from "./constants";
import { getFirebaseAuth, googleProvider } from "./firebase";

export type AuthUser = DevUser & {
  bio?: string | null | undefined;
  photoUrl?: string | null | undefined;
  instagramUrl?: string | null | undefined;
  styles?: string[] | undefined;
};

type SyncedApiUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  studioId: string | null;
  bio?: string | null | undefined;
  photoUrl?: string | null | undefined;
  instagramUrl?: string | null | undefined;
  styles?: string[] | undefined;
};

export type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  loginAsDev: (role: UserRole) => void;
  signIn: (identifier: string, password: string) => Promise<AuthUser>;
  signInWithGoogle: () => Promise<AuthUser>;
  signOutUser: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
  updateUser: (patch: Partial<AuthUser>) => void;
};

const STORAGE_KEY = "step-up-dev-user";

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredDevUser(): AuthUser | null {
  if (!isAuthBypassEnabled()) {
    return null;
  }

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

function mapSyncedUser(user: SyncedApiUser): AuthUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    studioId: user.studioId ?? STUDIO_ID,
    bio: user.bio,
    photoUrl: user.photoUrl,
    instagramUrl: user.instagramUrl,
    styles: user.styles,
  };
}

async function syncFirebaseUser(firebaseUser: FirebaseUser): Promise<AuthUser> {
  const token = await firebaseUser.getIdToken();
  const synced = await apiRequest<SyncedApiUser>("/auth/sync", {
    method: "POST",
    token,
    body: {
      name: firebaseUser.displayName || undefined,
      email: firebaseUser.email || undefined,
      studioId: STUDIO_ID,
    },
  });
  return mapSyncedUser(synced);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => readStoredDevUser());
  const [loading, setLoading] = useState(!isAuthBypassEnabled());
  const syncWaitersRef = useRef(
    new Map<
      string,
      {
        resolve: (user: AuthUser) => void;
        reject: (error: unknown) => void;
      }[]
    >(),
  );
  const lastSyncedRef = useRef<{ uid: string; user: AuthUser } | null>(null);

  const settleSyncWaiters = useCallback(
    (uid: string, result: AuthUser | null, error?: unknown) => {
      if (result) {
        lastSyncedRef.current = { uid, user: result };
      } else if (lastSyncedRef.current?.uid === uid) {
        lastSyncedRef.current = null;
      }

      const waiters = syncWaitersRef.current.get(uid);
      if (!waiters?.length) {
        return;
      }
      syncWaitersRef.current.delete(uid);
      for (const waiter of waiters) {
        if (result) {
          waiter.resolve(result);
        } else {
          waiter.reject(error ?? new Error("Unable to sync account"));
        }
      }
    },
    [],
  );

  const waitForSync = useCallback((uid: string) => {
    if (lastSyncedRef.current?.uid === uid) {
      return Promise.resolve(lastSyncedRef.current.user);
    }

    return new Promise<AuthUser>((resolve, reject) => {
      const existing = syncWaitersRef.current.get(uid) ?? [];
      existing.push({ resolve, reject });
      syncWaitersRef.current.set(uid, existing);

      if (lastSyncedRef.current?.uid === uid) {
        syncWaitersRef.current.delete(uid);
        resolve(lastSyncedRef.current.user);
      }
    });
  }, []);

  useEffect(() => {
    if (isAuthBypassEnabled()) {
      setLoading(false);
      return;
    }

    const auth = getFirebaseAuth();
    if (!auth) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      void (async () => {
        if (!firebaseUser) {
          lastSyncedRef.current = null;
          if (!cancelled) {
            setUser(null);
            setLoading(false);
          }
          return;
        }

        if (!cancelled) {
          setLoading(true);
        }

        try {
          const synced = await syncFirebaseUser(firebaseUser);
          if (!cancelled) {
            setUser(synced);
            settleSyncWaiters(firebaseUser.uid, synced);
          }
        } catch (error) {
          if (!cancelled) {
            setUser(null);
            settleSyncWaiters(firebaseUser.uid, null, error);
            await signOut(auth).catch(() => undefined);
          }
        } finally {
          if (!cancelled) {
            setLoading(false);
          }
        }
      })();
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [settleSyncWaiters]);

  const loginAsDev = useCallback((role: UserRole) => {
    const devUser = DEV_USERS[role];
    setUser(devUser);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(devUser));
  }, []);

  const signIn = useCallback(
    async (identifier: string, password: string) => {
      if (isAuthBypassEnabled()) {
        const match = findDevUserByLogin(identifier);
        if (!match) {
          throw new Error(
            `No dev account matches “${identifier.trim()}”. Try owner, staff, trainer, student, parent, or trainer-1.`,
          );
        }
        loginAsDev(match.role);
        return match;
      }

      const auth = getFirebaseAuth();
      if (!auth) {
        throw new Error("Firebase is not configured");
      }

      const email = resolveLoginEmail(identifier);
      const credential = await signInWithEmailAndPassword(
        auth,
        email,
        password,
      );
      return waitForSync(credential.user.uid);
    },
    [loginAsDev, waitForSync],
  );

  const signInWithGoogle = useCallback(async () => {
    if (isAuthBypassEnabled()) {
      loginAsDev("STUDENT");
      return DEV_USERS.STUDENT;
    }

    const auth = getFirebaseAuth();
    if (!auth) {
      throw new Error("Firebase is not configured");
    }

    const credential = await signInWithPopup(auth, googleProvider);
    return waitForSync(credential.user.uid);
  }, [loginAsDev, waitForSync]);

  const signOutUser = useCallback(async () => {
    if (isAuthBypassEnabled()) {
      localStorage.removeItem(STORAGE_KEY);
      setUser(null);
      return;
    }

    const auth = getFirebaseAuth();
    if (auth) {
      await signOut(auth);
    }
    setUser(null);
  }, []);

  const getIdToken = useCallback(async () => {
    if (isAuthBypassEnabled()) {
      if (!user) {
        return null;
      }
      return `dev:${user.role}:${user.id}`;
    }

    const auth = getFirebaseAuth();
    if (!auth?.currentUser) {
      return null;
    }

    return auth.currentUser.getIdToken();
  }, [user]);

  const updateUser = useCallback((patch: Partial<AuthUser>) => {
    setUser((current) => {
      if (!current) {
        return current;
      }
      const next = { ...current, ...patch };
      if (isAuthBypassEnabled()) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      }
      if (lastSyncedRef.current?.user.id === current.id) {
        lastSyncedRef.current = {
          uid: lastSyncedRef.current.uid,
          user: next,
        };
      }
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      loginAsDev,
      signIn,
      signInWithGoogle,
      signOutUser,
      getIdToken,
      updateUser,
    }),
    [
      user,
      loading,
      loginAsDev,
      signIn,
      signInWithGoogle,
      signOutUser,
      getIdToken,
      updateUser,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
