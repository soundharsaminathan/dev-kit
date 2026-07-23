import {
  createUserWithEmailAndPassword,
  type User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from "firebase/auth";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { apiRequest } from "./api";
import {
  AuthContext,
  type AuthContextValue,
  type AuthUser,
} from "./auth-context";
import {
  type AgeRange,
  DEV_USERS,
  type ExperienceLevel,
  findDevUserByLogin,
  type Gender,
  isAuthBypassEnabled,
  resolveLoginEmail,
  STUDIO_ID,
  type UserRole,
} from "./constants";
import { getFirebaseAuth, googleProvider } from "./firebase";
import { setLastLoginIdentifier } from "./last-login";

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
  experienceLevel?: ExperienceLevel | null | undefined;
  scheduleVibe?: string[] | undefined;
  gender?: Gender | null | undefined;
  ageRange?: AgeRange | null | undefined;
  preferredBranchId?: string | null | undefined;
  onboardingCompletedAt?: string | Date | null | undefined;
};

const STORAGE_KEY = "step-up-dev-user";

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
    bio: user.bio ?? null,
    photoUrl: user.photoUrl ?? null,
    instagramUrl: user.instagramUrl ?? null,
    styles: user.styles ?? [],
    experienceLevel: user.experienceLevel ?? null,
    scheduleVibe: user.scheduleVibe ?? [],
    gender: user.gender ?? null,
    ageRange: user.ageRange ?? null,
    preferredBranchId: user.preferredBranchId ?? null,
    onboardingCompletedAt: user.onboardingCompletedAt
      ? String(user.onboardingCompletedAt)
      : null,
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

async function createBypassStudent(input: {
  email: string;
  name: string;
}): Promise<AuthUser> {
  const id = `dev-signup-${Date.now()}`;
  const token = `dev:STUDENT:${id}`;
  const synced = await apiRequest<SyncedApiUser>("/auth/sync", {
    method: "POST",
    token,
    body: {
      name: input.name.trim() || "New dancer",
      email: input.email.trim().toLowerCase(),
      studioId: STUDIO_ID,
    },
  });
  return mapSyncedUser({
    ...synced,
    onboardingCompletedAt: synced.onboardingCompletedAt ?? null,
    styles: synced.styles ?? [],
    experienceLevel: synced.experienceLevel ?? null,
    scheduleVibe: synced.scheduleVibe ?? [],
    gender: synced.gender ?? null,
    ageRange: synced.ageRange ?? null,
    preferredBranchId: synced.preferredBranchId ?? null,
  });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => readStoredDevUser());
  const [loading, setLoading] = useState(() => {
    if (!isAuthBypassEnabled()) {
      return true;
    }
    return Boolean(readStoredDevUser());
  });
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
      const stored = readStoredDevUser();
      if (!stored) {
        setLoading(false);
        return;
      }

      let cancelled = false;
      void (async () => {
        try {
          const me = await apiRequest<SyncedApiUser>("/users/me", {
            token: `dev:${stored.role}:${stored.id}`,
          });
          if (cancelled) {
            return;
          }
          const mapped = mapSyncedUser(me);
          setUser(mapped);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(mapped));
        } catch {
          if (!cancelled) {
            localStorage.removeItem(STORAGE_KEY);
            setUser(null);
          }
        } finally {
          if (!cancelled) {
            setLoading(false);
          }
        }
      })();

      return () => {
        cancelled = true;
      };
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
    setLastLoginIdentifier(devUser.email);
  }, []);

  const signIn = useCallback(
    async (identifier: string, _password: string) => {
      if (isAuthBypassEnabled()) {
        const match = findDevUserByLogin(identifier);
        if (match) {
          loginAsDev(match.role);
          setLastLoginIdentifier(identifier);
          return match;
        }

        const trimmed = identifier.trim().toLowerCase();
        if (!trimmed.includes("@")) {
          throw new Error(
            `No dev account matches “${identifier.trim()}”. Try owner, staff, trainer, student, parent, or an email you registered with.`,
          );
        }

        try {
          const synced = await apiRequest<SyncedApiUser>("/auth/bypass-login", {
            method: "POST",
            body: { email: trimmed },
          });
          const mapped = mapSyncedUser(synced);
          setUser(mapped);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(mapped));
          setLastLoginIdentifier(identifier);
          return mapped;
        } catch {
          throw new Error(
            `No account found for “${trimmed}”. Register first, or use a seeded role like student.`,
          );
        }
      }

      const auth = getFirebaseAuth();
      if (!auth) {
        throw new Error("Firebase is not configured");
      }

      const email = resolveLoginEmail(identifier);
      const credential = await signInWithEmailAndPassword(
        auth,
        email,
        _password,
      );
      const synced = await waitForSync(credential.user.uid);
      setLastLoginIdentifier(identifier);
      return synced;
    },
    [loginAsDev, waitForSync],
  );

  const signUp = useCallback(
    async (email: string, password: string, name: string) => {
      if (isAuthBypassEnabled()) {
        const created = await createBypassStudent({
          email,
          name: name.trim() || "New dancer",
        });
        setUser(created);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(created));
        setLastLoginIdentifier(email);
        return created;
      }

      const auth = getFirebaseAuth();
      if (!auth) {
        throw new Error("Firebase is not configured");
      }

      const credential = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password,
      );
      const displayName = name.trim();
      if (displayName) {
        await updateProfile(credential.user, { displayName });
      }
      const synced = await waitForSync(credential.user.uid);
      setLastLoginIdentifier(email);
      if (displayName && synced.name !== displayName) {
        try {
          const token = await credential.user.getIdToken();
          const patched = await apiRequest<SyncedApiUser>("/users/me", {
            method: "PATCH",
            token,
            body: { name: displayName },
          });
          const mapped = mapSyncedUser(patched);
          setUser(mapped);
          lastSyncedRef.current = {
            uid: credential.user.uid,
            user: mapped,
          };
          return mapped;
        } catch {
          return synced;
        }
      }
      return synced;
    },
    [waitForSync],
  );

  const signInWithGoogle = useCallback(
    async (options?: { asNewStudent?: boolean }) => {
      if (isAuthBypassEnabled()) {
        if (options?.asNewStudent) {
          const created = await createBypassStudent({
            email: `google-${Date.now()}@stepup.dev`,
            name: "New dancer",
          });
          setUser(created);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(created));
          setLastLoginIdentifier(created.email);
          return created;
        }
        loginAsDev("STUDENT");
        return DEV_USERS.STUDENT;
      }

      const auth = getFirebaseAuth();
      if (!auth) {
        throw new Error("Firebase is not configured");
      }

      const credential = await signInWithPopup(auth, googleProvider);
      const synced = await waitForSync(credential.user.uid);
      setLastLoginIdentifier(synced.email);
      return synced;
    },
    [loginAsDev, waitForSync],
  );

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

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      loginAsDev,
      signIn,
      signUp,
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
      signUp,
      signInWithGoogle,
      signOutUser,
      getIdToken,
      updateUser,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
