import { Alert, AlertDescription, AlertTitle } from "@dev-ui/components/alert";
import { FieldError, Label } from "@dev-ui/components/field";
import { Input } from "@dev-ui/components/input";
import { TextField } from "@dev-ui/components/text-field";
import { useOnlineStatus } from "@dev-ui/hooks";
import { useForm } from "@tanstack/react-form";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import type { AuthUser } from "@/lib/auth-context";
import { BRAND_ICON_SRC, BRAND_NAME } from "@/lib/brand";
import { isAuthBypassEnabled, SEED_PASSWORD } from "@/lib/constants";
import { getLastLoginIdentifier } from "@/lib/last-login";
import {
  homePathForUser,
  redirectIfAuthenticated,
  safeInternalPath,
} from "@/lib/require-auth";
import { PublicShell } from "@/modules/layout/public-shell";
import { PasswordInput } from "@/modules/ui/password-input";
import {
  StudioSelect,
  useStudioDirectory,
} from "@/modules/ui/studio-select";
import { TouchButton } from "@/modules/ui/touch-button";
import styles from "./login.module.scss";

type LoginSearch = {
  redirect?: string;
  identifier?: string;
  /** Preferred: studio slug */
  studio?: string;
  /** Compat: studio id */
  studioId?: string;
};

type LoginFormValues = {
  studioId: string;
  studioSlug: string;
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
  if (typeof search.studio === "string" && search.studio.trim()) {
    next.studio = search.studio.trim();
  }
  if (typeof search.studioId === "string" && search.studioId.trim()) {
    next.studioId = search.studioId.trim();
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

const STUDIO_ACCESS_DENIED = "You don't have access to this studio.";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): LoginSearch =>
    parseSearch(search),
  beforeLoad: ({ context, search }) => {
    redirectIfAuthenticated(context.auth, search.redirect);
  },
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const {
    redirect: redirectTo,
    identifier: searchIdentifier,
    studio: searchStudioSlug,
    studioId: searchStudioId,
  } = Route.useSearch();
  const { signIn, signInWithGoogle, loginAsSystemAdmin, signOutUser } =
    useAuth();
  const online = useOnlineStatus();
  const [error, setError] = useState<string | null>(null);
  const directory = useStudioDirectory();

  const redirectAfterSignIn = useCallback(
    (authUser: AuthUser) => {
      const safeRedirect = safeInternalPath(redirectTo);
      if (safeRedirect) {
        void navigate({ to: safeRedirect, replace: true });
        return;
      }
      void navigate({ to: homePathForUser(authUser), replace: true });
    },
    [navigate, redirectTo],
  );

  const assertStudioAccess = useCallback(
    async (authUser: AuthUser, selectedStudioId: string) => {
      if (authUser.role === "SYSTEM_ADMIN") {
        return;
      }
      if (!selectedStudioId.trim()) {
        return;
      }
      if (authUser.studioId !== selectedStudioId) {
        await signOutUser();
        throw new Error(STUDIO_ACCESS_DENIED);
      }
    },
    [signOutUser],
  );

  const form = useForm({
    defaultValues: {
      studioId: searchStudioId ?? "",
      studioSlug: searchStudioSlug ?? "",
      identifier: suggestedLoginIdentifier(searchIdentifier),
      password: isAuthBypassEnabled() ? SEED_PASSWORD : "",
    } satisfies LoginFormValues,
    onSubmit: async ({ value }) => {
      setError(null);
      try {
        const signedIn = await signIn(value.identifier.trim(), value.password);
        await assertStudioAccess(signedIn, value.studioId);
        redirectAfterSignIn(signedIn);
      } catch (signInError) {
        setError(
          signInError instanceof Error
            ? signInError.message
            : "Unable to sign in",
        );
      }
    },
  });

  useEffect(() => {
    const studios = directory.data;
    if (!studios?.length) return;

    const bySlug = searchStudioSlug
      ? studios.find((s) => s.slug === searchStudioSlug)
      : undefined;
    const byId = searchStudioId
      ? studios.find((s) => s.id === searchStudioId)
      : undefined;
    const matched = bySlug ?? byId;

    if (matched) {
      form.setFieldValue("studioId", matched.id);
      form.setFieldValue("studioSlug", matched.slug);
      if (!searchStudioSlug || searchStudioSlug !== matched.slug) {
        void navigate({
          to: "/login",
          search: {
            ...(redirectTo ? { redirect: redirectTo } : {}),
            ...(searchIdentifier ? { identifier: searchIdentifier } : {}),
            studio: matched.slug,
          },
          replace: true,
        });
      }
      return;
    }

    if (form.getFieldValue("studioId")) return;
    const first = studios[0];
    if (!first) return;
    form.setFieldValue("studioId", first.id);
    form.setFieldValue("studioSlug", first.slug);
  }, [
    directory.data,
    form,
    navigate,
    redirectTo,
    searchIdentifier,
    searchStudioId,
    searchStudioSlug,
  ]);

  const handleGoogleSignIn = async () => {
    setError(null);
    try {
      const studioId = form.getFieldValue("studioId");
      const signedIn = await signInWithGoogle();
      await assertStudioAccess(signedIn, studioId);
      redirectAfterSignIn(signedIn);
    } catch (googleError) {
      setError(
        googleError instanceof Error
          ? googleError.message
          : "Google sign in failed",
      );
    }
  };

  const handleAdminLogin = async () => {
    setError(null);
    try {
      const signedIn = await loginAsSystemAdmin();
      redirectAfterSignIn(signedIn);
    } catch (adminError) {
      setError(
        adminError instanceof Error ? adminError.message : "Unable to sign in",
      );
    }
  };

  return (
    <PublicShell bootDismiss="interact">
      <section className={styles.panel}>
        <div className={styles.brandBlock}>
          <img
            className={styles.brandMark}
            src={BRAND_ICON_SRC}
            alt=""
            aria-hidden
          />
          <div>
            <p className={styles.brand}>{BRAND_NAME}</p>
            <h1 className={styles.title}>Welcome back</h1>
            <p className={styles.subtitle}>
              Sign in to manage your studio or continue to your classes.
            </p>
          </div>
        </div>

        {error ? (
          <Alert variant="danger">
            <AlertTitle>
              {error === STUDIO_ACCESS_DENIED
                ? "Access denied"
                : "Sign in failed"}
            </AlertTitle>
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
          <form.Field name="studioId">
            {(field) => (
              <StudioSelect
                selectedKey={field.state.value || null}
                onSelectionChange={(studioId, studio) => {
                  field.handleChange(studioId ?? "");
                  form.setFieldValue("studioSlug", studio?.slug ?? "");
                  void navigate({
                    to: "/login",
                    search: {
                      ...(redirectTo ? { redirect: redirectTo } : {}),
                      ...(searchIdentifier
                        ? { identifier: searchIdentifier }
                        : {}),
                      ...(studio?.slug ? { studio: studio.slug } : {}),
                    },
                    replace: true,
                  });
                }}
                data-testid="login-studio-select"
              />
            )}
          </form.Field>

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
                  <div className={styles.passwordLabelRow}>
                    <Label data-required="true">Password</Label>
                    {!isAuthBypassEnabled() ? (
                      <Link to="/forgot-password" className={styles.forgotLink}>
                        Forgot password?
                      </Link>
                    ) : null}
                  </div>
                  <PasswordInput
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={field.handleChange}
                    autoComplete="current-password"
                    isInvalid={Boolean(err)}
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

          {!isAuthBypassEnabled() ? (
            <TouchButton
              type="button"
              variant="default"
              fullWidth
              isDisabled={!online}
              onClick={() => void handleGoogleSignIn()}
            >
              Continue with Google
            </TouchButton>
          ) : null}
        </form>

        {isAuthBypassEnabled() ? (
          <div className={styles.dev}>
            <p className={styles.devTitle}>Local bypass</p>
            <div className={styles.devRoles}>
              <TouchButton
                type="button"
                variant="quiet"
                size="md"
                onClick={() => void handleAdminLogin()}
              >
                Continue as system admin
              </TouchButton>
            </div>
            <p className={styles.devHint}>
              Other accounts are created from /admin. Sign in with that email.
            </p>
          </div>
        ) : null}

        <form.Subscribe
          selector={(state) => ({
            studioId: state.values.studioId,
            studioSlug: state.values.studioSlug,
          })}
        >
          {({ studioId, studioSlug }) => (
            <Link
              to="/register"
              search={{
                ...(studioId.trim() ? { studioId: studioId.trim() } : {}),
                ...(studioSlug.trim() ? { studio: studioSlug.trim() } : {}),
              }}
              className={styles.footerLink}
            >
              New here? Create a student account
            </Link>
          )}
        </form.Subscribe>
      </section>
    </PublicShell>
  );
}
