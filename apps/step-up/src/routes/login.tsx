import { Alert, AlertDescription, AlertTitle } from "@dev-ui/components/alert";
import { useOnlineStatus } from "@dev-ui/hooks";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import {
  DEV_USERS,
  isAuthBypassEnabled,
  MEMBER_ROLES,
  STAFF_ROLES,
  type UserRole,
} from "@/lib/constants";
import { safeInternalPath } from "@/lib/require-auth";
import { PublicShell } from "@/modules/layout/public-shell";
import { FormInput } from "@/modules/ui/form-input";
import { TouchButton } from "@/modules/ui/touch-button";
import styles from "./login.module.scss";

type LoginSearch = {
  redirect?: string;
};

function parseSearch(search: Record<string, unknown>): LoginSearch {
  if (typeof search.redirect === "string") {
    return { redirect: search.redirect };
  }
  return {};
}

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): LoginSearch =>
    parseSearch(search),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { redirect: redirectTo } = Route.useSearch();
  const { signIn, signInWithGoogle, loginAsDev, user, loading } = useAuth();
  const online = useOnlineStatus();
  const [email, setEmail] = useState("owner@stepup.dev");
  const [password, setPassword] = useState("password");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  // A session that already exists when the login page opens means the person
  // came here to switch accounts; don't bounce them back to the old account.
  const [hadSessionOnOpen] = useState(() => Boolean(user));

  const redirectForRole = useCallback(
    (role: UserRole) => {
      const safeRedirect = safeInternalPath(redirectTo);
      if (safeRedirect) {
        void navigate({ to: safeRedirect, replace: true });
        return;
      }
      if (STAFF_ROLES.includes(role)) {
        void navigate({ to: "/app", replace: true });
        return;
      }
      if (MEMBER_ROLES.includes(role)) {
        void navigate({ to: "/me", replace: true });
        return;
      }
      void navigate({ to: "/", replace: true });
    },
    [navigate, redirectTo],
  );

  const handleEmailSignIn = async () => {
    setPending(true);
    setError(null);
    try {
      const signedIn = await signIn(email, password);
      redirectForRole(signedIn.role);
    } catch (signInError) {
      setError(
        signInError instanceof Error
          ? signInError.message
          : "Unable to sign in",
      );
    } finally {
      setPending(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    try {
      const signedIn = await signInWithGoogle();
      redirectForRole(signedIn.role);
    } catch {
      setError("Google sign in failed");
    }
  };

  const handleDevLogin = (role: UserRole) => {
    loginAsDev(role);
    redirectForRole(role);
  };

  useEffect(() => {
    if (user && !loading && !hadSessionOnOpen) {
      redirectForRole(user.role);
    }
  }, [user, loading, hadSessionOnOpen, redirectForRole]);

  return (
    <PublicShell>
      <section className={styles.panel}>
        <div>
          <p className={styles.brand}>Step Up</p>
          <h1 className={styles.title}>Welcome back</h1>
          <p className={styles.subtitle}>
            Sign in to manage your studio or continue to your classes.
          </p>
        </div>

        {error ? (
          <Alert variant="danger">
            <AlertTitle>Sign in failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {!online ? (
          <Alert variant="warning">
            <AlertTitle>You’re offline</AlertTitle>
            <AlertDescription>
              Sign in needs a network connection. Reconnect and try again.
            </AlertDescription>
          </Alert>
        ) : null}

        <div className={styles.form}>
          <FormInput
            label="Email or username"
            type="text"
            value={email}
            onChange={setEmail}
            autoComplete="username"
          />
          <FormInput
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
          />
          <TouchButton
            variant="primary"
            fullWidth
            onClick={() => void handleEmailSignIn()}
            isPending={pending}
            isDisabled={!online}
          >
            Continue with email
          </TouchButton>
          <TouchButton
            variant="default"
            fullWidth
            isDisabled={!online}
            onClick={() => void handleGoogleSignIn()}
          >
            Continue with Google
          </TouchButton>
        </div>

        {isAuthBypassEnabled() ? (
          <div className={styles.dev}>
            <p className={styles.devTitle}>Continue as</p>
            <div className={styles.devRoles}>
              {(Object.keys(DEV_USERS) as UserRole[]).map((role) => (
                <TouchButton
                  key={role}
                  variant="quiet"
                  size="md"
                  onClick={() => handleDevLogin(role)}
                >
                  {role}
                </TouchButton>
              ))}
            </div>
          </div>
        ) : null}

        <Link to="/studio" className={styles.footerLink}>
          Browse the public studio page
        </Link>
      </section>
    </PublicShell>
  );
}
