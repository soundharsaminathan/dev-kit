import { Alert, AlertDescription, AlertTitle } from "@dev-ui/components/alert";
import { FieldError, Label } from "@dev-ui/components/field";
import { Input } from "@dev-ui/components/input";
import { TextField } from "@dev-ui/components/text-field";
import { useOnlineStatus } from "@dev-ui/hooks";
import { useForm } from "@tanstack/react-form";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { isAuthBypassEnabled } from "@/lib/constants";
import { PasswordInput } from "@/modules/ui/password-input";
import { Screen } from "@/modules/ui/screen";
import { TouchButton } from "@/modules/ui/touch-button";
import styles from "./change-email-page.module.scss";

type ChangeEmailPageProps = {
  backTo?: string;
};

type ChangeEmailFormValues = {
  newEmail: string;
  confirmEmail: string;
  currentPassword: string;
};

function fieldError(errors: unknown[]): string | undefined {
  const first = errors[0];
  return typeof first === "string" ? first : undefined;
}

function validateNewEmail(value: string, currentEmail: string | undefined) {
  const trimmed = value.trim();
  if (!trimmed) return "Enter a new email";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return "Enter a valid email address";
  }
  if (
    currentEmail &&
    trimmed.toLowerCase() === currentEmail.trim().toLowerCase()
  ) {
    return "That is already your current email";
  }
  return undefined;
}

function validateConfirmEmail(value: string, newEmail: string) {
  if (!value.trim()) return "Confirm your new email";
  if (value.trim().toLowerCase() !== newEmail.trim().toLowerCase()) {
    return "Emails do not match";
  }
  return undefined;
}

function validateCurrentPassword(value: string) {
  if (!value) return "Enter your current password";
  return undefined;
}

export function ChangeEmailPage({
  backTo = "/me/profile/security",
}: ChangeEmailPageProps) {
  const { user, changeEmail, hasPasswordProvider, refreshEmailVerification } =
    useAuth();
  const online = useOnlineStatus();
  const bypass = isAuthBypassEnabled();
  const [error, setError] = useState<string | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      newEmail: "",
      confirmEmail: "",
      currentPassword: "",
    } satisfies ChangeEmailFormValues,
    onSubmit: async ({ value }) => {
      setError(null);
      setPendingConfirm(false);
      const nextEmail = value.newEmail.trim().toLowerCase();
      try {
        await changeEmail(nextEmail, value.currentPassword);
        setSentTo(nextEmail);
        setPendingConfirm(true);
        form.reset();
      } catch (changeError) {
        setError(
          changeError instanceof Error
            ? changeError.message
            : "Unable to change email",
        );
      }
    },
  });

  const unavailable = bypass || !hasPasswordProvider;

  return (
    <Screen title="Change email" showBack backTo={backTo}>
      <div className={styles.root}>
        <p className={styles.description}>
          We’ll send a confirmation link to your new address. Your login email
          updates only after you confirm.
        </p>

        {user?.email ? (
          <p className={styles.currentEmail}>
            Current email: <strong>{user.email}</strong>
          </p>
        ) : null}

        {bypass ? (
          <Alert variant="warning">
            <AlertTitle>Auth bypass is on</AlertTitle>
            <AlertDescription>
              Email changes need Firebase. Turn off auth bypass to update your
              email.
            </AlertDescription>
          </Alert>
        ) : null}

        {!bypass && !hasPasswordProvider ? (
          <Alert variant="warning">
            <AlertTitle>Google sign-in</AlertTitle>
            <AlertDescription>
              You sign in with Google. Email is managed by your Google account.
            </AlertDescription>
          </Alert>
        ) : null}

        {error ? (
          <Alert variant="danger">
            <AlertTitle>Couldn’t start email change</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {pendingConfirm && sentTo ? (
          <Alert variant="success">
            <AlertTitle>Check your inbox</AlertTitle>
            <AlertDescription>
              We sent a confirmation link to {sentTo}. After you confirm, return
              here or reopen the app and we’ll sync your account.
            </AlertDescription>
          </Alert>
        ) : null}

        {!online ? (
          <Alert variant="warning">
            <AlertTitle>You’re offline</AlertTitle>
            <AlertDescription>
              Changing your email needs a network connection. Reconnect and try
              again.
            </AlertDescription>
          </Alert>
        ) : null}

        {pendingConfirm ? (
          <TouchButton
            type="button"
            variant="primary"
            fullWidth
            onClick={() => {
              void refreshEmailVerification().catch(() => undefined);
            }}
          >
            I’ve confirmed — refresh
          </TouchButton>
        ) : (
          <form
            className={styles.form}
            onSubmit={(event) => {
              event.preventDefault();
              event.stopPropagation();
              void form.handleSubmit();
            }}
          >
            <form.Field
              name="newEmail"
              validators={{
                onBlur: ({ value }) => validateNewEmail(value, user?.email),
                onSubmit: ({ value }) => validateNewEmail(value, user?.email),
              }}
            >
              {(field) => {
                const err = fieldError(field.state.meta.errors);
                return (
                  <TextField>
                    <Label data-required="true">New email</Label>
                    <Input
                      name={field.name}
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                      aria-invalid={Boolean(err)}
                      required
                      disabled={unavailable}
                    />
                    {err ? <FieldError>{err}</FieldError> : null}
                  </TextField>
                );
              }}
            </form.Field>

            <form.Field
              name="confirmEmail"
              validators={{
                onChangeListenTo: ["newEmail"],
                onBlur: ({ value, fieldApi }) =>
                  validateConfirmEmail(
                    value,
                    fieldApi.form.getFieldValue("newEmail"),
                  ),
                onChange: ({ value, fieldApi }) =>
                  validateConfirmEmail(
                    value,
                    fieldApi.form.getFieldValue("newEmail"),
                  ),
                onSubmit: ({ value, fieldApi }) =>
                  validateConfirmEmail(
                    value,
                    fieldApi.form.getFieldValue("newEmail"),
                  ),
              }}
            >
              {(field) => {
                const err = fieldError(field.state.meta.errors);
                return (
                  <TextField>
                    <Label data-required="true">Confirm new email</Label>
                    <Input
                      name={field.name}
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                      aria-invalid={Boolean(err)}
                      required
                      disabled={unavailable}
                    />
                    {err ? <FieldError>{err}</FieldError> : null}
                  </TextField>
                );
              }}
            </form.Field>

            <form.Field
              name="currentPassword"
              validators={{
                onBlur: ({ value }) => validateCurrentPassword(value),
                onSubmit: ({ value }) => validateCurrentPassword(value),
              }}
            >
              {(field) => {
                const err = fieldError(field.state.meta.errors);
                return (
                  <TextField>
                    <Label data-required="true">Current password</Label>
                    <PasswordInput
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={field.handleChange}
                      autoComplete="current-password"
                      isInvalid={Boolean(err)}
                      required
                      isDisabled={unavailable}
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
                  isDisabled={!online || unavailable || isSubmitting}
                >
                  Send confirmation link
                </TouchButton>
              )}
            </form.Subscribe>
          </form>
        )}
      </div>
    </Screen>
  );
}
