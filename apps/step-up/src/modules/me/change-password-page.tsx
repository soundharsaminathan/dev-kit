import { Alert, AlertDescription, AlertTitle } from "@dev-ui/components/alert";
import { FieldError, Label } from "@dev-ui/components/field";
import { TextField } from "@dev-ui/components/text-field";
import { useOnlineStatus } from "@dev-ui/hooks";
import { useForm } from "@tanstack/react-form";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { isAuthBypassEnabled } from "@/lib/constants";
import { homePathForUser } from "@/lib/require-auth";
import { PasswordInput } from "@/modules/ui/password-input";
import { Screen } from "@/modules/ui/screen";
import { TouchButton } from "@/modules/ui/touch-button";
import styles from "./change-password-page.module.scss";

type ChangePasswordPageProps = {
  backTo?: string;
};

type ChangePasswordFormValues = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

function fieldError(errors: unknown[]): string | undefined {
  const first = errors[0];
  return typeof first === "string" ? first : undefined;
}

function validateCurrentPassword(value: string, required: boolean) {
  if (!required) return undefined;
  if (!value) return "Enter your current password";
  return undefined;
}

function validateNewPassword(value: string) {
  if (!value) return "Enter a new password";
  if (value.length < 6) return "Password must be at least 6 characters";
  return undefined;
}

function validateConfirmPassword(value: string, newPassword: string) {
  if (!value) return "Confirm your new password";
  if (value !== newPassword) return "Passwords do not match";
  return undefined;
}

export function ChangePasswordPage({
  backTo = "/me/profile/security",
}: ChangePasswordPageProps) {
  const navigate = useNavigate();
  const { changePassword, hasPasswordProvider, user } = useAuth();
  const online = useOnlineStatus();
  const bypass = isAuthBypassEnabled();
  const forced = Boolean(user?.mustChangePassword);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const form = useForm({
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    } satisfies ChangePasswordFormValues,
    onSubmit: async ({ value }) => {
      setError(null);
      setSuccess(false);
      try {
        await changePassword(value.currentPassword, value.newPassword);
        setSuccess(true);
        form.reset();
        window.setTimeout(() => {
          if (forced && user) {
            void navigate({
              to: homePathForUser({ ...user, mustChangePassword: false }),
            });
            return;
          }
          void navigate({ to: backTo });
        }, 1200);
      } catch (changeError) {
        setError(
          changeError instanceof Error
            ? changeError.message
            : "Unable to change password",
        );
      }
    },
  });

  const unavailable = (!forced && bypass) || (!bypass && !hasPasswordProvider);

  return (
    <Screen
      title={forced ? "Set a new password" : "Change password"}
      showBack={!forced}
      backTo={backTo}
    >
      <div className={styles.root}>
        <p className={styles.description}>
          {forced
            ? "You’re signing in with a temporary password. Choose a new one to continue."
            : "Confirm your current password, then choose a new one."}
        </p>

        {bypass && !forced ? (
          <Alert variant="warning">
            <AlertTitle>Auth bypass is on</AlertTitle>
            <AlertDescription>
              Password changes need Firebase. Turn off auth bypass to update
              your password.
            </AlertDescription>
          </Alert>
        ) : null}

        {bypass && forced ? (
          <Alert variant="warning">
            <AlertTitle>Auth bypass is on</AlertTitle>
            <AlertDescription>
              Dev mode won’t update Firebase. Submitting clears the first-login
              password requirement so you can continue.
            </AlertDescription>
          </Alert>
        ) : null}

        {!bypass && !hasPasswordProvider ? (
          <Alert variant="warning">
            <AlertTitle>No password on this account</AlertTitle>
            <AlertDescription>
              You sign in with Google. Password changes aren’t available for
              this account.
            </AlertDescription>
          </Alert>
        ) : null}

        {error ? (
          <Alert variant="danger">
            <AlertTitle>Couldn’t update password</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {success ? (
          <Alert variant="success">
            <AlertTitle>Password updated</AlertTitle>
            <AlertDescription>
              {forced
                ? "Your new password is saved. Taking you in…"
                : "Your new password is saved. Taking you back…"}
            </AlertDescription>
          </Alert>
        ) : null}

        {!online ? (
          <Alert variant="warning">
            <AlertTitle>You’re offline</AlertTitle>
            <AlertDescription>
              Changing your password needs a network connection. Reconnect and
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
          {!bypass || !forced ? (
            <form.Field
              name="currentPassword"
              validators={{
                onBlur: ({ value }) =>
                  validateCurrentPassword(value, !bypass || !forced),
                onSubmit: ({ value }) =>
                  validateCurrentPassword(value, !bypass || !forced),
              }}
            >
              {(field) => {
                const err = fieldError(field.state.meta.errors);
                return (
                  <TextField>
                    <Label data-required="true">
                      {forced ? "Temporary password" : "Current password"}
                    </Label>
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
          ) : null}

          <form.Field
            name="newPassword"
            validators={{
              onBlur: ({ value }) => validateNewPassword(value),
              onSubmit: ({ value }) => validateNewPassword(value),
            }}
          >
            {(field) => {
              const err = fieldError(field.state.meta.errors);
              return (
                <TextField>
                  <Label data-required="true">New password</Label>
                  <PasswordInput
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={field.handleChange}
                    autoComplete="new-password"
                    isInvalid={Boolean(err)}
                    required
                    isDisabled={unavailable}
                  />
                  {err ? <FieldError>{err}</FieldError> : null}
                </TextField>
              );
            }}
          </form.Field>

          <form.Field
            name="confirmPassword"
            validators={{
              onChangeListenTo: ["newPassword"],
              onBlur: ({ value, fieldApi }) =>
                validateConfirmPassword(
                  value,
                  fieldApi.form.getFieldValue("newPassword"),
                ),
              onChange: ({ value, fieldApi }) =>
                validateConfirmPassword(
                  value,
                  fieldApi.form.getFieldValue("newPassword"),
                ),
              onSubmit: ({ value, fieldApi }) =>
                validateConfirmPassword(
                  value,
                  fieldApi.form.getFieldValue("newPassword"),
                ),
            }}
          >
            {(field) => {
              const err = fieldError(field.state.meta.errors);
              return (
                <TextField>
                  <Label data-required="true">Confirm new password</Label>
                  <PasswordInput
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={field.handleChange}
                    autoComplete="new-password"
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
                isDisabled={!online || unavailable || isSubmitting || success}
              >
                {forced ? "Save and continue" : "Update password"}
              </TouchButton>
            )}
          </form.Subscribe>
        </form>
      </div>
    </Screen>
  );
}
