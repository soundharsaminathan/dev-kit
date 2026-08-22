import type { User as FirebaseUser } from "firebase/auth";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { flushSync } from "react-dom";
import { ApiError, apiRequest } from "./api";
import {
  AuthContext,
  type AuthContextValue,
  type AuthUser,
} from "./auth-context";
import { mapAuthError } from "./auth-errors";
import { shouldKeepHydratedSession } from "./auth-session";
import {
  type AgeRange,
  type ExperienceLevel,
  type Gender,
  isAuthBypassEnabled,
  resolveLoginEmail,
  SEED_SYSTEM_ADMIN,
  type UserRole,
} from "./constants";
import { resolveDisplayName } from "./display-name";
import {
  getFirebaseAuthAsync,
  getGoogleProviderAsync,
  loadFirebase,
} from "./firebase";
import { setLastLoginIdentifier } from "./last-login";

const AUTH_BOOTSTRAP_TIMEOUT_MS = 12_000;

function userHasPasswordProvider(firebaseUser: FirebaseUser | null): boolean {
  if (!firebaseUser) {
    return false;
  }
  return firebaseUser.providerData.some(
    (provider) => provider.providerId === "password",
  );
}

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
  dateOfBirth?: string | null | undefined;
  age?: number | null | undefined;
  guardianName?: string | null | undefined;
  alternateMobile?: string | null | undefined;
  preferredBranchId?: string | null | undefined;
  onboardingCompletedAt?: string | Date | null | undefined;
  mustChangePassword?: boolean | undefined;
};

const STORAGE_KEY = "step-up-dev-user";
/** Last successful Firebase→API sync — hydrates protected shell before /auth/sync. */
const SESSION_CACHE_KEY = "step-up-session-user";

type SessionCache = {
  uid: string;
  user: AuthUser;
};

function readStoredBypassUser(): AuthUser | null {
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

function readSessionCache(): SessionCache | null {
  if (typeof window === "undefined" || isAuthBypassEnabled()) {
    return null;
  }
  try {
    const raw = localStorage.getItem(SESSION_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SessionCache;
    if (
      !parsed?.uid ||
      !parsed?.user?.id ||
      !parsed?.user?.role ||
      !parsed?.user?.email
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeSessionCache(uid: string, user: AuthUser) {
  try {
    localStorage.setItem(SESSION_CACHE_KEY, JSON.stringify({ uid, user }));
  } catch {
    // quota / private mode
  }
}

function clearSessionCache() {
  try {
    localStorage.removeItem(SESSION_CACHE_KEY);
  } catch {
    // ignore
  }
}

function mapSyncedUser(user: SyncedApiUser): AuthUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    studioId: user.studioId,
    bio: user.bio ?? null,
    photoUrl: user.photoUrl ?? null,
    instagramUrl: user.instagramUrl ?? null,
    styles: user.styles ?? [],
    experienceLevel: user.experienceLevel ?? null,
    scheduleVibe: user.scheduleVibe ?? [],
    gender: user.gender ?? null,
    ageRange: user.ageRange ?? null,
    dateOfBirth: user.dateOfBirth ?? null,
    age: user.age ?? null,
    guardianName: user.guardianName ?? null,
    alternateMobile: user.alternateMobile ?? null,
    preferredBranchId: user.preferredBranchId ?? null,
    onboardingCompletedAt: user.onboardingCompletedAt
      ? String(user.onboardingCompletedAt)
      : null,
    mustChangePassword: Boolean(user.mustChangePassword),
  };
}

async function syncFirebaseUser(
  firebaseUser: FirebaseUser,
  options?: { studioId?: string; create?: boolean; name?: string },
): Promise<AuthUser> {
  const token = await firebaseUser.getIdToken();
  const name = resolveDisplayName(
    options?.name || firebaseUser.displayName,
    firebaseUser.email,
  );
  const synced = await apiRequest<SyncedApiUser>("/auth/sync", {
    method: "POST",
    token,
    body: {
      ...(name ? { name } : {}),
      email: firebaseUser.email || undefined,
      ...(options?.create ? { create: true } : {}),
      ...(options?.studioId ? { studioId: options.studioId } : {}),
    },
  });
  return mapSyncedUser(synced);
}

async function createBypassStudent(input: {
  email: string;
  name: string;
  studioId?: string;
}): Promise<AuthUser> {
  const id = `dev-signup-${Date.now()}`;
  const token = `dev:STUDENT:${id}`;
  const synced = await apiRequest<SyncedApiUser>("/auth/sync", {
    method: "POST",
    token,
    body: {
      name: input.name.trim() || "New dancer",
      email: input.email.trim().toLowerCase(),
      create: true,
      ...(input.studioId ? { studioId: input.studioId } : {}),
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
  const [user, setUser] = useState<AuthUser | null>(() =>
    readStoredBypassUser(),
  );
  const [hasPasswordProvider, setHasPasswordProvider] = useState(false);
  const [emailVerified, setEmailVerified] = useState(() =>
    isAuthBypassEnabled() ? Boolean(readStoredBypassUser()) : false,
  );
  const [loading, setLoading] = useState(() => !isAuthBypassEnabled());
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
  const pendingSyncOptionsRef = useRef<{
    studioId?: string;
    create?: boolean;
    name?: string;
  } | null>(null);

  const needsEmailVerification =
    !isAuthBypassEnabled() &&
    Boolean(user) &&
    hasPasswordProvider &&
    !emailVerified;

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
      setHasPasswordProvider(false);
      setEmailVerified(true);
      setLoading(false);
      const stored = readStoredBypassUser();
      if (!stored) {
        return;
      }

      // Hydrate from localStorage immediately — never block the shell on
      // /users/me (that race forced DanceLoader + e2e 90s waits).
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
          setEmailVerified(true);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(mapped));
        } catch (error) {
          if (cancelled) {
            return;
          }
          // Drop stale bypass sessions when the account was deleted.
          if (error instanceof ApiError && error.status === 401) {
            localStorage.removeItem(STORAGE_KEY);
            setUser(null);
            setEmailVerified(false);
          }
        }
      })();

      return () => {
        cancelled = true;
      };
    }

    let cancelled = false;
    let settled = false;
    let unsubscribe: (() => void) | undefined;
    const finishLoading = () => {
      if (!cancelled && !settled) {
        settled = true;
        setLoading(false);
      }
    };

    // Firebase can hang (IndexedDB / network). Never leave DanceLoader forever.
    const bootstrapTimeout = window.setTimeout(() => {
      finishLoading();
    }, AUTH_BOOTSTRAP_TIMEOUT_MS);

    void (async () => {
      // Public routes: defer Firebase parse/eval until idle so /login TBT
      // is not dominated by Auth SDK. Sign-in handlers still await loadFirebase().
      const path = window.location.pathname;
      const isPublic =
        path === "/" ||
        path === "" ||
        path.startsWith("/login") ||
        path.startsWith("/register") ||
        path.startsWith("/forgot-password") ||
        path.startsWith("/join") ||
        path.startsWith("/studio/");
      if (isPublic) {
        await new Promise<void>((resolve) => {
          if (typeof requestIdleCallback === "function") {
            requestIdleCallback(() => resolve(), { timeout: 2_500 });
          } else {
            window.setTimeout(() => resolve(), 1);
          }
        });
      }
      if (cancelled) {
        return;
      }

      const [{ auth }, { onAuthStateChanged, signOut }] = await Promise.all([
        loadFirebase(),
        import("firebase/auth"),
      ]);
      if (cancelled) {
        return;
      }
      if (!auth) {
        finishLoading();
        return;
      }

      unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        void (async () => {
          if (!firebaseUser) {
            lastSyncedRef.current = null;
            clearSessionCache();
            if (!cancelled) {
              setUser(null);
              setHasPasswordProvider(false);
              setEmailVerified(false);
              finishLoading();
            }
            return;
          }

          // Firebase has verified the session. Hydrate the last synced profile
          // so the protected shell can paint while /auth/sync revalidates —
          // never show protected routes without a Firebase user.
          const cached = readSessionCache();
          const cacheHit = cached?.uid === firebaseUser.uid;

          if (!cancelled) {
            setHasPasswordProvider(userHasPasswordProvider(firebaseUser));
            setEmailVerified(firebaseUser.emailVerified);
            if (cacheHit) {
              setUser(cached.user);
              lastSyncedRef.current = {
                uid: firebaseUser.uid,
                user: cached.user,
              };
              finishLoading();
            } else {
              settled = false;
              setLoading(true);
            }
          }

          try {
            const pendingSync = pendingSyncOptionsRef.current;
            pendingSyncOptionsRef.current = null;
            const synced = await Promise.race([
              syncFirebaseUser(
                firebaseUser,
                pendingSync
                  ? {
                      ...(pendingSync.create ? { create: true } : {}),
                      ...(pendingSync.studioId
                        ? { studioId: pendingSync.studioId }
                        : {}),
                      ...(pendingSync.name ? { name: pendingSync.name } : {}),
                    }
                  : undefined,
              ),
              new Promise<never>((_, reject) => {
                window.setTimeout(() => {
                  reject(new Error("Account sync timed out"));
                }, AUTH_BOOTSTRAP_TIMEOUT_MS);
              }),
            ]);
            if (!cancelled) {
              writeSessionCache(firebaseUser.uid, synced);
              setUser(synced);
              setHasPasswordProvider(userHasPasswordProvider(firebaseUser));
              setEmailVerified(firebaseUser.emailVerified);
              settleSyncWaiters(firebaseUser.uid, synced);
            }
          } catch (error) {
            if (!cancelled) {
              if (shouldKeepHydratedSession(error, cacheHit) && cached) {
                settleSyncWaiters(firebaseUser.uid, cached.user);
              } else {
                clearSessionCache();
                setUser(null);
                setHasPasswordProvider(false);
                setEmailVerified(false);
                settleSyncWaiters(firebaseUser.uid, null, error);
                await signOut(auth).catch(() => undefined);
              }
            }
          } finally {
            finishLoading();
          }
        })();
      });
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(bootstrapTimeout);
      unsubscribe?.();
    };
  }, [settleSyncWaiters]);

  const commitBypassSession = useCallback((next: AuthUser) => {
    // Flush so RouterProvider context updates before login navigates —
    // otherwise /admin beforeLoad still sees the previous role and bounces
    // SYSTEM_ADMIN to "/" (which never auto-redirects).
    flushSync(() => {
      setUser(next);
      setEmailVerified(true);
      setHasPasswordProvider(false);
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const loginAsSystemAdmin = useCallback(async () => {
    try {
      const synced = await apiRequest<SyncedApiUser>("/auth/bypass-login", {
        method: "POST",
        body: { email: SEED_SYSTEM_ADMIN.email },
      });
      const mapped = mapSyncedUser(synced);
      commitBypassSession(mapped);
      setLastLoginIdentifier(SEED_SYSTEM_ADMIN.email);
      return mapped;
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        throw new Error(
          "Auth bypass is disabled on the API. Set AUTH_BYPASS=true, or sign in with Firebase.",
        );
      }
      throw new Error(
        "System admin is missing. Run pnpm --filter @step-up/api prisma:seed.",
      );
    }
  }, [commitBypassSession]);

  const signIn = useCallback(
    async (identifier: string, _password: string) => {
      if (isAuthBypassEnabled()) {
        let email: string;
        try {
          email = resolveLoginEmail(identifier).toLowerCase();
        } catch {
          throw new Error(
            `No account matches “${identifier.trim()}”. Use an email, or admin for the seeded system admin.`,
          );
        }

        try {
          const synced = await apiRequest<SyncedApiUser>("/auth/bypass-login", {
            method: "POST",
            body: { email },
          });
          const mapped = mapSyncedUser(synced);
          commitBypassSession(mapped);
          setLastLoginIdentifier(identifier);
          return mapped;
        } catch {
          throw new Error(
            `No account found for “${email}”. Create users from /admin, or register as a student.`,
          );
        }
      }

      const auth = await getFirebaseAuthAsync();
      if (!auth) {
        throw new Error(
          "Firebase is not configured. Copy apps/step-up/.env.example to apps/step-up/.env (VITE_AUTH_BYPASS=true) and restart the web app.",
        );
      }

      const { signInWithEmailAndPassword } = await import("firebase/auth");
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
    [commitBypassSession, waitForSync],
  );

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      name: string,
      options?: { studioId?: string },
    ) => {
      const trimmedEmail = email.trim();
      const displayName =
        resolveDisplayName(name, trimmedEmail) ?? "New dancer";

      if (isAuthBypassEnabled()) {
        const created = await createBypassStudent({
          email: trimmedEmail,
          name: displayName,
          ...(options?.studioId ? { studioId: options.studioId } : {}),
        });
        commitBypassSession(created);
        setLastLoginIdentifier(trimmedEmail);
        return created;
      }

      const auth = await getFirebaseAuthAsync();
      if (!auth) {
        throw new Error("Firebase is not configured");
      }

      const {
        createUserWithEmailAndPassword,
        sendEmailVerification,
        updateProfile,
      } = await import("firebase/auth");
      pendingSyncOptionsRef.current = {
        create: true,
        name: displayName,
        ...(options?.studioId ? { studioId: options.studioId } : {}),
      };
      const credential = await createUserWithEmailAndPassword(
        auth,
        trimmedEmail,
        password,
      );
      if (displayName) {
        await updateProfile(credential.user, { displayName });
      }
      try {
        await sendEmailVerification(credential.user, {
          url: `${window.location.origin}/login`,
          handleCodeInApp: false,
        });
      } catch {
        // Banner still offers resend if this fails.
      }
      setEmailVerified(credential.user.emailVerified);
      setHasPasswordProvider(true);
      const synced = await waitForSync(credential.user.uid);
      setLastLoginIdentifier(trimmedEmail);
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
    [commitBypassSession, waitForSync],
  );

  const signInWithGoogle = useCallback(
    async (options?: { asNewStudent?: boolean; studioId?: string }) => {
      if (isAuthBypassEnabled()) {
        if (options?.asNewStudent) {
          const created = await createBypassStudent({
            email: `google-${Date.now()}@stepup.dev`,
            name: "New dancer",
            ...(options.studioId ? { studioId: options.studioId } : {}),
          });
          commitBypassSession(created);
          setLastLoginIdentifier(created.email);
          return created;
        }
        throw new Error(
          "Google sign-in needs Firebase Auth. With bypass enabled, sign in with an account email or Continue as system admin.",
        );
      }

      const auth = await getFirebaseAuthAsync();
      if (!auth) {
        throw new Error("Firebase is not configured");
      }

      const googleProvider = await getGoogleProviderAsync();
      const { signInWithPopup } = await import("firebase/auth");
      pendingSyncOptionsRef.current = options?.asNewStudent
        ? {
            create: true,
            ...(options.studioId ? { studioId: options.studioId } : {}),
          }
        : null;
      const credential = await signInWithPopup(auth, googleProvider);
      setEmailVerified(credential.user.emailVerified);
      setHasPasswordProvider(userHasPasswordProvider(credential.user));
      const synced = await waitForSync(credential.user.uid);
      setLastLoginIdentifier(synced.email);
      return synced;
    },
    [commitBypassSession, waitForSync],
  );

  const resetPassword = useCallback(async (email: string) => {
    if (isAuthBypassEnabled()) {
      throw new Error(
        "Password reset is unavailable while auth bypass is enabled.",
      );
    }

    const auth = await getFirebaseAuthAsync();
    if (!auth) {
      throw new Error("Firebase is not configured");
    }

    const { sendPasswordResetEmail } = await import("firebase/auth");
    const trimmed = email.trim().toLowerCase();
    try {
      await sendPasswordResetEmail(auth, trimmed, {
        url: `${window.location.origin}/login`,
        handleCodeInApp: false,
      });
    } catch (error) {
      const code =
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        typeof (error as { code: unknown }).code === "string"
          ? (error as { code: string }).code
          : null;
      if (code === "auth/user-not-found") {
        return;
      }
      throw new Error(
        mapAuthError(error, "Unable to send password reset email."),
      );
    }
  }, []);

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      const clearMustChangeFlag = async (token: string) => {
        const synced = await apiRequest<SyncedApiUser>(
          "/auth/password-changed",
          {
            method: "POST",
            token,
          },
        );
        const mapped = mapSyncedUser(synced);
        setUser(mapped);
        if (isAuthBypassEnabled()) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(mapped));
        }
        if (lastSyncedRef.current?.user.id === mapped.id) {
          lastSyncedRef.current = {
            uid: lastSyncedRef.current.uid,
            user: mapped,
          };
        }
      };

      if (isAuthBypassEnabled()) {
        if (!user?.mustChangePassword) {
          throw new Error(
            "Password changes are unavailable while auth bypass is enabled.",
          );
        }
        if (newPassword.length < 6) {
          throw new Error("Password must be at least 6 characters");
        }
        await clearMustChangeFlag(`dev:${user.role}:${user.id}`);
        return;
      }

      const auth = await getFirebaseAuthAsync();
      const firebaseUser = auth?.currentUser;
      if (!auth || !firebaseUser?.email) {
        throw new Error("You need to be signed in to change your password.");
      }

      if (!userHasPasswordProvider(firebaseUser)) {
        throw new Error(
          "This account signs in with Google. Set a password from the forgot-password flow first.",
        );
      }

      try {
        const {
          EmailAuthProvider,
          reauthenticateWithCredential,
          updatePassword,
        } = await import("firebase/auth");
        const credential = EmailAuthProvider.credential(
          firebaseUser.email,
          currentPassword,
        );
        await reauthenticateWithCredential(firebaseUser, credential);
        await updatePassword(firebaseUser, newPassword);
        setHasPasswordProvider(true);
        const token = await firebaseUser.getIdToken();
        await clearMustChangeFlag(token);
      } catch (error) {
        throw new Error(mapAuthError(error, "Unable to change password."));
      }
    },
    [user],
  );

  const changeEmail = useCallback(
    async (newEmail: string, currentPassword: string) => {
      if (isAuthBypassEnabled()) {
        throw new Error(
          "Email changes are unavailable while auth bypass is enabled.",
        );
      }

      const auth = await getFirebaseAuthAsync();
      const firebaseUser = auth?.currentUser;
      if (!auth || !firebaseUser?.email) {
        throw new Error("You need to be signed in to change your email.");
      }

      if (!userHasPasswordProvider(firebaseUser)) {
        throw new Error(
          "This account signs in with Google. Email is managed by your Google account.",
        );
      }

      const trimmed = newEmail.trim().toLowerCase();
      if (!trimmed) {
        throw new Error("Enter a valid email address.");
      }
      if (trimmed === firebaseUser.email.trim().toLowerCase()) {
        throw new Error("That is already your current email.");
      }

      try {
        const {
          EmailAuthProvider,
          reauthenticateWithCredential,
          verifyBeforeUpdateEmail,
        } = await import("firebase/auth");
        const credential = EmailAuthProvider.credential(
          firebaseUser.email,
          currentPassword,
        );
        await reauthenticateWithCredential(firebaseUser, credential);
        await verifyBeforeUpdateEmail(firebaseUser, trimmed, {
          url: `${window.location.origin}/login`,
          handleCodeInApp: false,
        });
      } catch (error) {
        throw new Error(mapAuthError(error, "Unable to change email."));
      }
    },
    [],
  );

  const resendEmailVerification = useCallback(async () => {
    if (isAuthBypassEnabled()) {
      return;
    }

    const auth = await getFirebaseAuthAsync();
    const firebaseUser = auth?.currentUser;
    if (!auth || !firebaseUser) {
      throw new Error("You need to be signed in to resend verification.");
    }

    if (firebaseUser.emailVerified) {
      setEmailVerified(true);
      return;
    }

    try {
      const { sendEmailVerification } = await import("firebase/auth");
      await sendEmailVerification(firebaseUser, {
        url: `${window.location.origin}/login`,
        handleCodeInApp: false,
      });
    } catch (error) {
      throw new Error(
        mapAuthError(error, "Unable to send verification email."),
      );
    }
  }, []);

  const refreshEmailVerification = useCallback(async () => {
    if (isAuthBypassEnabled()) {
      setEmailVerified(true);
      return true;
    }

    const auth = await getFirebaseAuthAsync();
    const firebaseUser = auth?.currentUser;
    if (!auth || !firebaseUser) {
      setEmailVerified(false);
      return false;
    }

    try {
      const { reload } = await import("firebase/auth");
      const previousEmail = firebaseUser.email?.trim().toLowerCase() ?? "";
      await reload(firebaseUser);
      const current = auth.currentUser;
      const verified = current?.emailVerified ?? false;
      setEmailVerified(verified);
      setHasPasswordProvider(userHasPasswordProvider(current));
      const nextEmail = current?.email?.trim().toLowerCase() ?? "";
      const emailChanged = Boolean(nextEmail) && nextEmail !== previousEmail;
      if (verified || emailChanged) {
        await current?.getIdToken(true);
      }
      if (current && emailChanged) {
        const synced = await syncFirebaseUser(current);
        setUser(synced);
        lastSyncedRef.current = { uid: current.uid, user: synced };
        setLastLoginIdentifier(synced.email);
      }
      return verified;
    } catch (error) {
      throw new Error(
        mapAuthError(error, "Unable to check verification status."),
      );
    }
  }, []);

  useEffect(() => {
    if (!needsEmailVerification) {
      return;
    }

    const onVisible = () => {
      if (document.visibilityState !== "visible") {
        return;
      }
      void refreshEmailVerification().catch(() => undefined);
    };

    const onFocus = () => {
      void refreshEmailVerification().catch(() => undefined);
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [needsEmailVerification, refreshEmailVerification]);

  const signOutUser = useCallback(async () => {
    if (isAuthBypassEnabled()) {
      localStorage.removeItem(STORAGE_KEY);
      clearSessionCache();
      setUser(null);
      setHasPasswordProvider(false);
      setEmailVerified(false);
      return;
    }

    const auth = await getFirebaseAuthAsync();
    if (auth) {
      const { signOut } = await import("firebase/auth");
      await signOut(auth);
    }
    clearSessionCache();
    setUser(null);
    setHasPasswordProvider(false);
    setEmailVerified(false);
  }, []);

  const getIdToken = useCallback(async () => {
    if (isAuthBypassEnabled()) {
      if (!user) {
        return null;
      }
      return `dev:${user.role}:${user.id}`;
    }

    const auth = await getFirebaseAuthAsync();
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
      } else {
        const cached = readSessionCache();
        if (cached?.user.id === current.id) {
          writeSessionCache(cached.uid, next);
        }
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
      hasPasswordProvider,
      emailVerified,
      needsEmailVerification,
      loginAsSystemAdmin,
      signIn,
      signUp,
      signInWithGoogle,
      resetPassword,
      changePassword,
      changeEmail,
      resendEmailVerification,
      refreshEmailVerification,
      signOutUser,
      getIdToken,
      updateUser,
    }),
    [
      user,
      loading,
      hasPasswordProvider,
      emailVerified,
      needsEmailVerification,
      loginAsSystemAdmin,
      signIn,
      signUp,
      signInWithGoogle,
      resetPassword,
      changePassword,
      changeEmail,
      resendEmailVerification,
      refreshEmailVerification,
      signOutUser,
      getIdToken,
      updateUser,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
