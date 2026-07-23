import { Alert, AlertDescription, AlertTitle } from "@dev-ui/components/alert";
import { FieldError, Label } from "@dev-ui/components/field";
import { Input } from "@dev-ui/components/input";
import { TextField } from "@dev-ui/components/text-field";
import { useOnlineStatus } from "@dev-ui/hooks";
import { useForm } from "@tanstack/react-form";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { isAuthBypassEnabled } from "@/lib/constants";
import { redirectIfAuthenticated } from "@/lib/require-auth";
import { PublicShell } from "@/modules/layout/public-shell";
import { TouchButton } from "@/modules/ui/touch-button";
import styles from "./login.module.scss";

type ForgotPasswordFormValues = {
  email: string;
};

function fieldError(errors: unknown[]): string | undefined {
  const first = errors[0];
  return typeof first === "string" ? first : undefined;
}

function validateEmail(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "Enter your email";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return "Enter a valid email";
  }
  return undefined;
}

export const Route = createFileRoute("/forgot-password")({
  beforeLoad: ({ context }) => {
    redirectIfAuthenticated(context.auth);
  },
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const online = useOnlineStatus();
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const bypass = isAuthBypassEnabled();

  const form = useForm({
    defaultValues: {
      email: "",
    } satisfies ForgotPasswordFormValues,
    onSubmit: async ({ value }) => {
      setError(null);
      setSentTo(null);
      const email = value.email.trim().toLowerCase();
      try {
        await resetPassword(email);
        setSentTo(email);
      } catch (resetError) {
        setError(
          resetError instanceof Error
            ? resetError.message
            : "Unable to send reset email",
        );
      }
    },
  });

  return (
    <PublicShell>
      <section className={styles.panel}>
        <div>
          <p className={styles.brand}>Step Up</p>
          <h1 className={styles.title}>Reset password</h1>
          <p className={styles.subtitle}>
            Enter the email on your account and we’ll send a link to choose a
            new password.
          </p>
        </div>

        {bypass ? (
          <Alert variant="warning">
            <AlertTitle>Auth bypass is on</AlertTitle>
            <AlertDescription>
              Password reset needs Firebase. Turn off auth bypass to use this
              flow.
            </AlertDescription>
          </Alert>
        ) : null}

        {error ? (
          <Alert variant="danger">
            <AlertTitle>Couldn’t send reset email</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {sentTo ? (
          <Alert variant="success">
            <AlertTitle>Check your inbox</AlertTitle>
            <AlertDescription>
              If an account exists for {sentTo}, we sent a password reset link.
              It may take a minute to arrive.
            </AlertDescription>
          </Alert>
        ) : null}

        {!online ? (
          <Alert variant="warning">
            <AlertTitle>You’re offline</AlertTitle>
            <AlertDescription>
              Sending a reset email needs a network connection. Reconnect and
              try again.
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

          <form.Subscribe selector={(state) => state.isSubmitting}>
            {(isSubmitting) => (
              <TouchButton
                type="submit"
                variant="primary"
                fullWidth
                isPending={isSubmitting}
                isDisabled={!online || bypass || isSubmitting}
              >
                Send reset link
              </TouchButton>
            )}
          </form.Subscribe>
        </form>

        <Link to="/login" className={styles.footerLink}>
          Back to sign in
        </Link>
      </section>
    </PublicShell>
  );
}
