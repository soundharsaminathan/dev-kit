import { Alert, AlertDescription, AlertTitle } from "@dev-ui/components/alert";
import { FieldError, Label } from "@dev-ui/components/field";
import { Input } from "@dev-ui/components/input";
import { TextField } from "@dev-ui/components/text-field";
import { useOnlineStatus } from "@dev-ui/hooks";
import { useForm } from "@tanstack/react-form";
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
import { getLastLoginIdentifier } from "@/lib/last-login";
import { memberHomePathForUser } from "@/lib/onboarding";
import { safeInternalPath } from "@/lib/require-auth";
import { PublicShell } from "@/modules/layout/public-shell";
import { TouchButton } from "@/modules/ui/touch-button";
import styles from "./login.module.scss";

type LoginSearch = {
  redirect?: string;
  identifier?: string;
};

type LoginFormValues = {
  identifier: string;
  password: string;
};

function parseSearch(search: Record<string, unknown>): LoginSearch {
  const next: LoginSearch = {};
  if (typeof search.redirect === "string") {
    next.redirect = search.redirect;
  }
  if (typeof search.identifier === "string" && search.identifier.trim()) {
    next.identifier = search.identifier.trim();
  }
  return next;
}

function suggestedLoginIdentifier(searchIdentifier?: string) {
  if (searchIdentifier?.trim()) return searchIdentifier.trim();
  return getLastLoginIdentifier();
}

function fieldError(errors: unknown[]): string | undefined {
  const first = errors[0];
  return typeof first === "string" ? first : undefined;
}

function validateIdentifier(value: string) {
  if (!value.trim()) return "Enter your email or username";
  return undefined;
}

function validatePassword(value: string) {
  if (!value) return "Enter your password";
  return undefined;
}

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): LoginSearch =>
    parseSearch(search),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { redirect: redirectTo, identifier: searchIdentifier } =
    Route.useSearch();
  const { signIn, signInWithGoogle, loginAsDev, user, loading } = useAuth();
  const online = useOnlineStatus();
  const [error, setError] = useState<string | null>(null);
  // A session that already exists when the login page opens means the person
  // came here to switch accounts; don't bounce them back to the old account.
  const [hadSessionOnOpen] = useState(() => Boolean(user));

  const redirectForRole = useCallback(
    (role: UserRole, authUser = user) => {
      const safeRedirect = safeInternalPath(redirectTo);
      if (safeRedirect) {
        void navigate({ to: safeRedirect, replace: true });
        return;
      }
      if (STAFF_ROLES.includes(role)) {
        void navigate({ to: "/app", replace: true });
        return;
      }
      if (MEMBER_ROLES.includes(role) && authUser) {
        void navigate({ to: memberHomePathForUser(authUser), replace: true });
        return;
      }
      if (MEMBER_ROLES.includes(role)) {
        void navigate({ to: "/me", replace: true });
        return;
      }
      void navigate({ to: "/", replace: true });
    },
    [navigate, redirectTo, user],
  );

  const form = useForm({
    defaultValues: {
      identifier: suggestedLoginIdentifier(searchIdentifier),
      password: isAuthBypassEnabled() ? "password" : "",
    } satisfies LoginFormValues,
    onSubmit: async ({ value }) => {
      setError(null);
      try {
        const signedIn = await signIn(value.identifier.trim(), value.password);
        redirectForRole(signedIn.role, signedIn);
      } catch (signInError) {
        setError(
          signInError instanceof Error
            ? signInError.message
            : "Unable to sign in",
        );
      }
    },
  });

  const handleGoogleSignIn = async () => {
    setError(null);
    try {
      const signedIn = await signInWithGoogle();
      redirectForRole(signedIn.role, signedIn);
    } catch {
      setError("Google sign in failed");
    }
  };

  const handleDevLogin = (role: UserRole) => {
    loginAsDev(role);
    const next = DEV_USERS[role];
    redirectForRole(role, next);
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

        <form
          className={styles.form}
          onSubmit={(event) => {
            event.preventDefault();
            event.stopPropagation();
            void form.handleSubmit();
          }}
        >
          <form.Field
            name="identifier"
            validators={{
              onBlur: ({ value }) => validateIdentifier(value),
              onSubmit: ({ value }) => validateIdentifier(value),
            }}
          >
            {(field) => {
              const err = fieldError(field.state.meta.errors);
              return (
                <TextField>
                  <Label data-required="true">Email or username</Label>
                  <Input
                    name={field.name}
                    type="text"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    autoComplete="username"
                    aria-invalid={Boolean(err)}
                    required
                  />
                  {err ? <FieldError>{err}</FieldError> : null}
                </TextField>
              );
            }}
          </form.Field>

          <form.Field
            name="password"
            validators={{
              onBlur: ({ value }) => validatePassword(value),
              onSubmit: ({ value }) => validatePassword(value),
            }}
          >
            {(field) => {
              const err = fieldError(field.state.meta.errors);
              return (
                <TextField>
                  <Label data-required="true">Password</Label>
                  <Input
                    name={field.name}
                    type="password"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    autoComplete="current-password"
                    aria-invalid={Boolean(err)}
                    required
                  />
                  {err ? <FieldError>{err}</FieldError> : null}
                </TextField>
              );
            }}
          </form.Field>

          <form.Subscribe selector={(state) => state.isSubmitting}>
            {(isSubmitting) => (
              <TouchButton
                type="submit"
                variant="primary"
                fullWidth
                isPending={isSubmitting}
                isDisabled={!online || isSubmitting}
              >
                Sign in
              </TouchButton>
            )}
          </form.Subscribe>

          <TouchButton
            type="button"
            variant="default"
            fullWidth
            isDisabled={!online}
            onClick={() => void handleGoogleSignIn()}
          >
            Continue with Google
          </TouchButton>
        </form>

        {isAuthBypassEnabled() ? (
          <div className={styles.dev}>
            <p className={styles.devTitle}>Continue as</p>
            <div className={styles.devRoles}>
              {(Object.keys(DEV_USERS) as UserRole[]).map((role) => (
                <TouchButton
                  key={role}
                  type="button"
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

        <Link to="/register" className={styles.footerLink}>
          New here? Create a student account
        </Link>
        <Link to="/studio" className={styles.footerLink}>
          Browse the public studio page
        </Link>
      </section>
    </PublicShell>
  );
}
