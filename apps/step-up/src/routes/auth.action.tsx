import { Alert, AlertDescription, AlertTitle } from "@dev-ui/components/alert";
import { FieldError, Label } from "@dev-ui/components/field";
import { TextField } from "@dev-ui/components/text-field";
import { useOnlineStatus } from "@dev-ui/hooks";
import { useForm } from "@tanstack/react-form";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { mapAuthError } from "@/lib/auth-errors";
import { getFirebaseAuthAsync } from "@/lib/firebase";
import {
  emailActionCopy,
  parseEmailActionMode,
} from "@/lib/firebase-email-action";
import { PublicShell } from "@/modules/layout/public-shell";
import { PasswordInput } from "@/modules/ui/password-input";
import { TouchButton } from "@/modules/ui/touch-button";
import styles from "./login.module.scss";

type AuthActionSearch = {
  mode?: string;
  oobCode?: string;
};

function parseSearch(search: Record<string, unknown>): AuthActionSearch {
  const next: AuthActionSearch = {};
  if (typeof search.mode === "string" && search.mode.trim()) {
    next.mode = search.mode.trim();
  }
  if (typeof search.oobCode === "string" && search.oobCode.trim()) {
    next.oobCode = search.oobCode.trim();
  }
  return next;
}

export const Route = createFileRoute("/auth/action")({
  validateSearch: (search: Record<string, unknown>): AuthActionSearch =>
    parseSearch(search),
  component: AuthActionPage,
});

function AuthActionPage() {
  const { mode: modeParam, oobCode } = Route.useSearch();
  const mode = parseEmailActionMode(modeParam);
  const online = useOnlineStatus();
  const [status, setStatus] = useState<
    "working" | "ready" | "success" | "error"
  >(mode === "resetPassword" ? "ready" : "working");
  const [error, setError] = useState<string | null>(null);
  const [accountEmail, setAccountEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!mode || !oobCode) {
      setStatus("error");
      setError(
        "This link is missing details. Request a new email and try again.",
      );
      return;
    }
    if (mode === "resetPassword") {
      let cancelled = false;
      void (async () => {
        try {
          const auth = await getFirebaseAuthAsync();
          if (!auth) {
            throw new Error("Firebase is not configured");
          }
          const { verifyPasswordResetCode } = await import("firebase/auth");
          const email = await verifyPasswordResetCode(auth, oobCode);
          if (!cancelled) {
            setAccountEmail(email);
          }
        } catch (verifyError) {
          if (!cancelled) {
            setStatus("error");
            setError(
              mapAuthError(
                verifyError,
                "This reset link is invalid or expired.",
              ),
            );
          }
        }
      })();
      return () => {
        cancelled = true;
      };
    }

    let cancelled = false;
    void (async () => {
      try {
        const auth = await getFirebaseAuthAsync();
        if (!auth) {
          throw new Error("Firebase is not configured");
        }
        const { applyActionCode } = await import("firebase/auth");
        await applyActionCode(auth, oobCode);
        if (!cancelled) {
          setStatus("success");
        }
      } catch (applyError) {
        if (!cancelled) {
          setStatus("error");
          setError(
            mapAuthError(applyError, "This link is invalid or expired."),
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mode, oobCode]);

  const copy = mode
    ? emailActionCopy(mode)
    : {
        title: "Email link",
        successTitle: "Done",
        successBody: "You can sign in now.",
      };

  return (
    <PublicShell bootDismiss="ready">
      <section className={styles.panel}>
        <div>
          <p className={styles.brand}>classa</p>
          <h1 className={styles.title}>{copy.title}</h1>
          {mode === "resetPassword" && status === "ready" ? (
            <p className={styles.subtitle}>
              {accountEmail
                ? `Choose a new password for ${accountEmail}.`
                : "Choose a new password for your classa account."}
            </p>
          ) : null}
        </div>

        {!online ? (
          <Alert variant="warning">
            <AlertTitle>You’re offline</AlertTitle>
            <AlertDescription>
              Confirming this link needs a network connection.
            </AlertDescription>
          </Alert>
        ) : null}

        {status === "working" ? (
          <p className={styles.subtitle}>Confirming your link…</p>
        ) : null}

        {status === "error" && error ? (
          <Alert variant="danger">
            <AlertTitle>Couldn’t use this link</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {status === "success" ? (
          <Alert variant="success">
            <AlertTitle>{copy.successTitle}</AlertTitle>
            <AlertDescription>{copy.successBody}</AlertDescription>
          </Alert>
        ) : null}

        {mode === "resetPassword" && status === "ready" && oobCode ? (
          <ResetPasswordForm
            oobCode={oobCode}
            online={online}
            onSuccess={() => setStatus("success")}
            onError={(message) => {
              setStatus("error");
              setError(message);
            }}
          />
        ) : null}

        <Link to="/login" className={styles.footerLink}>
          Back to sign in
        </Link>
      </section>
    </PublicShell>
  );
}

function ResetPasswordForm({
  oobCode,
  online,
  onSuccess,
  onError,
}: {
  oobCode: string;
  online: boolean;
  onSuccess: () => void;
  onError: (message: string) => void;
}) {
  const form = useForm({
    defaultValues: { password: "", confirm: "" },
    onSubmit: async ({ value }) => {
      try {
        const auth = await getFirebaseAuthAsync();
        if (!auth) {
          throw new Error("Firebase is not configured");
        }
        const { confirmPasswordReset } = await import("firebase/auth");
        await confirmPasswordReset(auth, oobCode, value.password);
        onSuccess();
      } catch (resetError) {
        onError(mapAuthError(resetError, "Unable to update password."));
      }
    },
  });

  return (
    <form
      className={styles.form}
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
    >
      <form.Field
        name="password"
        validators={{
          onBlur: ({ value }) =>
            value.length < 6
              ? "Password must be at least 6 characters"
              : undefined,
          onSubmit: ({ value }) =>
            value.length < 6
              ? "Password must be at least 6 characters"
              : undefined,
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
              />
              {err ? <FieldError>{err}</FieldError> : null}
            </TextField>
          );
        }}
      </form.Field>
      <form.Field
        name="confirm"
        validators={{
          onBlur: ({ value, fieldApi }) =>
            value !== fieldApi.form.getFieldValue("password")
              ? "Passwords do not match"
              : undefined,
          onSubmit: ({ value, fieldApi }) =>
            value !== fieldApi.form.getFieldValue("password")
              ? "Passwords do not match"
              : undefined,
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
            Save password
          </TouchButton>
        )}
      </form.Subscribe>
    </form>
  );
}

function fieldError(errors: unknown[]): string | undefined {
  const first = errors[0];
  return typeof first === "string" ? first : undefined;
}
