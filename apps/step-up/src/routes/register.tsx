import { Alert, AlertDescription, AlertTitle } from "@dev-ui/components/alert";
import { FieldError, Label } from "@dev-ui/components/field";
import { Input } from "@dev-ui/components/input";
import { TextField } from "@dev-ui/components/text-field";
import { useOnlineStatus } from "@dev-ui/hooks";
import { useForm } from "@tanstack/react-form";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { useAuth } from "@/lib/auth";
import type { UserRole } from "@/lib/constants";
import {
  homePathForUser,
  redirectIfAuthenticated,
  safeInternalPath,
} from "@/lib/require-auth";
import { PublicShell } from "@/modules/layout/public-shell";
import { PasswordInput } from "@/modules/ui/password-input";
import { TouchButton } from "@/modules/ui/touch-button";
import styles from "./login.module.scss";

type RegisterSearch = {
  redirect?: string;
};

type RegisterFormValues = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
};

function parseSearch(search: Record<string, unknown>): RegisterSearch {
  if (typeof search.redirect === "string") {
    return { redirect: search.redirect };
  }
  return {};
}

function fieldError(errors: unknown[]): string | undefined {
  const first = errors[0];
  return typeof first === "string" ? first : undefined;
}

function validateName(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "Enter your name";
  if (trimmed.length < 2) return "Name must be at least 2 characters";
  return undefined;
}

function validateEmail(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "Enter your email";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return "Enter a valid email";
  }
  return undefined;
}

function validatePassword(value: string) {
  if (!value) return "Enter a password";
  if (value.length < 6) return "Password must be at least 6 characters";
  return undefined;
}

function validateConfirmPassword(value: string, password: string) {
  if (!value) return "Confirm your password";
  if (value !== password) return "Passwords do not match";
  return undefined;
}

export const Route = createFileRoute("/register")({
  validateSearch: (search: Record<string, unknown>): RegisterSearch =>
    parseSearch(search),
  beforeLoad: ({ context, search }) => {
    redirectIfAuthenticated(context.auth, search.redirect);
  },
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();
  const { redirect: redirectTo } = Route.useSearch();
  const { signUp, signInWithGoogle, user } = useAuth();
  const online = useOnlineStatus();
  const [error, setError] = useState<string | null>(null);

  const redirectForRole = useCallback(
    (_role: UserRole, authUser = user) => {
      const safeRedirect = safeInternalPath(redirectTo);
      if (safeRedirect) {
        void navigate({ to: safeRedirect, replace: true });
        return;
      }
      if (authUser) {
        void navigate({ to: homePathForUser(authUser), replace: true });
        return;
      }
      void navigate({ to: "/", replace: true });
    },
    [navigate, redirectTo, user],
  );

  const form = useForm({
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    } satisfies RegisterFormValues,
    onSubmit: async ({ value }) => {
      setError(null);
      try {
        const signedUp = await signUp(
          value.email.trim(),
          value.password,
          value.name.trim(),
        );
        redirectForRole(signedUp.role, signedUp);
      } catch (signUpError) {
        setError(
          signUpError instanceof Error
            ? signUpError.message
            : "Unable to create account",
        );
      }
    },
  });

  const handleGoogleSignIn = async () => {
    setError(null);
    try {
      const signedIn = await signInWithGoogle({ asNewStudent: true });
      redirectForRole(signedIn.role, signedIn);
    } catch {
      setError("Google sign in failed");
    }
  };

  return (
    <PublicShell>
      <section className={styles.panel}>
        <div>
          <p className={styles.brand}>Step Up</p>
          <h1 className={styles.title}>Join the studio</h1>
          <p className={styles.subtitle}>
            Create your student account and personalize your dance journey.
          </p>
        </div>

        {error ? (
          <Alert variant="danger">
            <AlertTitle>Sign up failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {!online ? (
          <Alert variant="warning">
            <AlertTitle>You’re offline</AlertTitle>
            <AlertDescription>
              Creating an account needs a network connection. Reconnect and try
              again.
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
            name="name"
            validators={{
              onBlur: ({ value }) => validateName(value),
              onSubmit: ({ value }) => validateName(value),
            }}
          >
            {(field) => {
              const err = fieldError(field.state.meta.errors);
              return (
                <TextField>
                  <Label data-required="true">Your name</Label>
                  <Input
                    name={field.name}
                    type="text"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    autoComplete="name"
                    aria-invalid={Boolean(err)}
                    required
                  />
                  {err ? <FieldError>{err}</FieldError> : null}
                </TextField>
              );
            }}
          </form.Field>

          <form.Field
            name="email"
            validators={{
              onBlur: ({ value }) => validateEmail(value),
              onSubmit: ({ value }) => validateEmail(value),
            }}
          >
            {(field) => {
              const err = fieldError(field.state.meta.errors);
              return (
                <TextField>
                  <Label data-required="true">Email</Label>
                  <Input
                    name={field.name}
                    type="email"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    autoComplete="email"
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
                  <PasswordInput
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={field.handleChange}
                    autoComplete="new-password"
                    isInvalid={Boolean(err)}
                    required
                  />
                  {err ? <FieldError>{err}</FieldError> : null}
                </TextField>
              );
            }}
          </form.Field>

          <form.Field
            name="confirmPassword"
            validators={{
              onChangeListenTo: ["password"],
              onBlur: ({ value, fieldApi }) =>
                validateConfirmPassword(
                  value,
                  fieldApi.form.getFieldValue("password"),
                ),
              onChange: ({ value, fieldApi }) =>
                validateConfirmPassword(
                  value,
                  fieldApi.form.getFieldValue("password"),
                ),
              onSubmit: ({ value, fieldApi }) =>
                validateConfirmPassword(
                  value,
                  fieldApi.form.getFieldValue("password"),
                ),
            }}
          >
            {(field) => {
              const err = fieldError(field.state.meta.errors);
              return (
                <TextField>
                  <Label data-required="true">Confirm password</Label>
                  <PasswordInput
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={field.handleChange}
                    autoComplete="new-password"
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
                Create account
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

        <form.Subscribe selector={(state) => state.values.email}>
          {(email) => {
            const trimmed = email.trim();
            return (
              <Link
                to="/login"
                search={trimmed ? { identifier: trimmed } : {}}
                className={styles.footerLink}
              >
                Already have an account? Sign in
              </Link>
            );
          }}
        </form.Subscribe>
      </section>
    </PublicShell>
  );
}
