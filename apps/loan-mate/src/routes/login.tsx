import { Alert, AlertDescription, AlertTitle } from "@dev-ui/components/alert";
import { Button } from "@dev-ui/components/button";
import { Icon } from "@dev-ui/icons";
import { useForm } from "@tanstack/react-form";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { TextControl, PasswordControl } from "@/modules/ui/controls";
import {
  isAuthBypassEnabled,
  SEED_PASSWORD,
  SEED_USERS,
} from "@/lib/constants";
import {
  homePathForUser,
  redirectIfAuthenticated,
  safeInternalPath,
} from "@/lib/require-auth";
import styles from "./login.module.scss";

type LoginSearch = {
  redirect?: string;
};

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): LoginSearch => {
    const next: LoginSearch = {};
    if (typeof search.redirect === "string") {
      next.redirect = search.redirect;
    }
    return next;
  },
  beforeLoad: ({ context, search }) => {
    redirectIfAuthenticated(context.auth, search.redirect);
  },
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { redirect: redirectTo } = Route.useSearch();
  const { login, loginAsSeed } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const bypass = isAuthBypassEnabled();

  const form = useForm({
    defaultValues: {
      email: bypass ? SEED_USERS[1]?.email ?? "" : "",
      password: bypass ? SEED_PASSWORD : "",
    },
    onSubmit: async ({ value }) => {
      setError(null);
      try {
        const user = await login(value.email.trim(), value.password);
        const safe = safeInternalPath(redirectTo);
        void navigate({
          to: safe ?? homePathForUser(user.role),
          replace: true,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to sign in");
      }
    },
  });

  async function quickLogin(email: string) {
    setError(null);
    try {
      const user = await loginAsSeed(email);
      void navigate({ to: homePathForUser(user.role), replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Quick login failed");
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.panel}>
        <div className={styles.brand}>
          <span className={styles.mark} aria-hidden>
            <Icon name="wallet" />
          </span>
          <div>
            <p className={styles.eyebrow}>loan-mate</p>
            <h1 className={styles.title}>Staff sign in</h1>
            <p className={styles.subtitle}>
              NBFC loan operations — staff only.
            </p>
          </div>
        </div>

        {error ? (
          <Alert variant="danger">
            <AlertTitle>Sign in failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <form
          className={styles.form}
          onSubmit={(e) => {
            e.preventDefault();
            void form.handleSubmit();
          }}
        >
          <form.Field name="email">
            {(field) => (
              <TextControl
                label="Email"
                type="email"
                autoComplete="username"
                value={field.state.value}
                onChange={field.handleChange}
                isRequired
              />
            )}
          </form.Field>
          <form.Field name="password">
            {(field) => (
              <PasswordControl
                label="Password"
                value={field.state.value}
                onChange={field.handleChange}
                isRequired
              />
            )}
          </form.Field>
          <Button type="submit" variant="primary">
            <Icon name="log-in" />
            Sign in
          </Button>
        </form>

        {bypass ? (
          <div className={styles.dev}>
            <p className={styles.subtitle}>
              Auth bypass — quick login (seed password:{" "}
              <code>{SEED_PASSWORD}</code>)
            </p>
            <div className={styles.seeds}>
              {SEED_USERS.map((seed) => (
                <Button
                  key={seed.email}
                  type="button"
                  variant="outline"
                  onClick={() => void quickLogin(seed.email)}
                >
                  {seed.label}
                </Button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
