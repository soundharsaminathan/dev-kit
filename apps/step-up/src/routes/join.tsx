import { Alert, AlertDescription, AlertTitle } from "@dev-ui/components/alert";
import { FieldError, Label } from "@dev-ui/components/field";
import { Input } from "@dev-ui/components/input";
import { TextField } from "@dev-ui/components/text-field";
import { useForm } from "@tanstack/react-form";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useApi } from "@/lib/api-context";
import { useAuth } from "@/lib/auth";
import type { AuthUser } from "@/lib/auth-context";
import type { UserRole } from "@/lib/constants";
import { homePathForUser } from "@/lib/require-auth";
import { PublicShell } from "@/modules/layout/public-shell";
import { PasswordInput } from "@/modules/ui/password-input";
import { TouchButton } from "@/modules/ui/touch-button";
import styles from "./login.module.scss";

type JoinSearch = {
  token?: string;
};

type JoinFormValues = {
  name: string;
  email: string;
  password: string;
};

type AcceptedInvite = {
  id: string;
  role: UserRole;
  studioId?: string | null;
  name: string;
};

function parseSearch(search: Record<string, unknown>): JoinSearch {
  if (typeof search.token === "string" && search.token.trim()) {
    return { token: search.token.trim() };
  }
  return {};
}

function fieldError(errors: unknown[]): string | undefined {
  const first = errors[0];
  return typeof first === "string" ? first : undefined;
}

function mergeAcceptedUser(base: AuthUser, accepted: AcceptedInvite): AuthUser {
  return {
    ...base,
    id: accepted.id || base.id,
    role: accepted.role,
    name: accepted.name,
    studioId: accepted.studioId ?? base.studioId,
  };
}

export const Route = createFileRoute("/join")({
  validateSearch: (search: Record<string, unknown>): JoinSearch =>
    parseSearch(search),
  component: JoinPage,
});

function JoinPage() {
  const api = useApi();
  const navigate = useNavigate();
  const { token } = Route.useSearch();
  const { signUp, user, updateUser } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function finishInvite(next: AuthUser) {
    const patch: Partial<AuthUser> = {
      role: next.role,
      name: next.name,
      studioId: next.studioId,
    };
    updateUser(patch);
    void navigate({ to: homePathForUser(next), replace: true });
  }

  const form = useForm({
    defaultValues: {
      name: "",
      email: "",
      password: "",
    } satisfies JoinFormValues,
    onSubmit: async ({ value }) => {
      if (!token) return;
      setError(null);
      setPending(true);
      try {
        const signedUp = await signUp(
          value.email.trim(),
          value.password,
          value.name.trim(),
        );
        const accepted = await api.post<AcceptedInvite>("/auth/accept-invite", {
          token,
        });
        finishInvite(mergeAcceptedUser(signedUp, accepted));
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Could not accept invite.",
        );
      } finally {
        setPending(false);
      }
    },
  });

  async function acceptWhileSignedIn() {
    if (!token || !user) return;
    setError(null);
    setPending(true);
    try {
      const accepted = await api.post<AcceptedInvite>("/auth/accept-invite", {
        token,
      });
      finishInvite(mergeAcceptedUser(user, accepted));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not accept invite.");
    } finally {
      setPending(false);
    }
  }

  if (!token) {
    return (
      <PublicShell>
        <section className={styles.panel}>
          <Alert variant="danger">
            <AlertTitle>Missing invite</AlertTitle>
            <AlertDescription>
              This join link is incomplete. Ask your studio for a new invite.
            </AlertDescription>
          </Alert>
        </section>
      </PublicShell>
    );
  }

  return (
    <PublicShell>
      <section className={styles.panel}>
        <div>
          <p className={styles.brand}>classa</p>
          <h1 className={styles.title}>Join your studio</h1>
          <p className={styles.subtitle}>
            Create an account with the email on your invite, then continue.
          </p>
        </div>

        {error ? (
          <Alert variant="danger">
            <AlertTitle>Invite failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {user ? (
          <div className={styles.form}>
            <p className={styles.subtitle}>
              Signed in as {user.email}. Accept the invite to join as staff or
              trainer.
            </p>
            <TouchButton
              variant="primary"
              fullWidth
              isPending={pending}
              onClick={() => void acceptWhileSignedIn()}
            >
              Accept invite
            </TouchButton>
          </div>
        ) : (
          <form
            className={styles.form}
            onSubmit={(event) => {
              event.preventDefault();
              void form.handleSubmit();
            }}
          >
            <form.Field
              name="name"
              validators={{
                onChange: ({ value }) =>
                  value.trim() ? undefined : "Enter your name",
              }}
            >
              {(field) => {
                const errorMessage = fieldError(field.state.meta.errors);
                return (
                  <TextField>
                    <Label>Name</Label>
                    <Input
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                      autoComplete="name"
                    />
                    {errorMessage ? (
                      <FieldError>{errorMessage}</FieldError>
                    ) : null}
                  </TextField>
                );
              }}
            </form.Field>

            <form.Field
              name="email"
              validators={{
                onChange: ({ value }) =>
                  value.trim() ? undefined : "Enter your invite email",
              }}
            >
              {(field) => {
                const errorMessage = fieldError(field.state.meta.errors);
                return (
                  <TextField>
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                      autoComplete="email"
                    />
                    {errorMessage ? (
                      <FieldError>{errorMessage}</FieldError>
                    ) : null}
                  </TextField>
                );
              }}
            </form.Field>

            <form.Field
              name="password"
              validators={{
                onChange: ({ value }) =>
                  value.length >= 8
                    ? undefined
                    : "Password must be at least 8 characters",
              }}
            >
              {(field) => {
                const errorMessage = fieldError(field.state.meta.errors);
                return (
                  <TextField>
                    <Label>Password</Label>
                    <PasswordInput
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={field.handleChange}
                      autoComplete="new-password"
                      isInvalid={Boolean(errorMessage)}
                      required
                    />
                    {errorMessage ? (
                      <FieldError>{errorMessage}</FieldError>
                    ) : null}
                  </TextField>
                );
              }}
            </form.Field>

            <TouchButton
              variant="primary"
              fullWidth
              type="submit"
              isPending={pending}
            >
              Create account and join
            </TouchButton>
          </form>
        )}

        {!user ? (
          <Link
            to="/login"
            search={{ redirect: `/join?token=${encodeURIComponent(token)}` }}
            className={styles.footerLink}
          >
            Already have an account? Sign in
          </Link>
        ) : null}
      </section>
    </PublicShell>
  );
}
