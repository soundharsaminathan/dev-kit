import { useForm } from "@tanstack/react-form";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
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
    <div
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        padding: "1.5rem",
        background:
          "radial-gradient(circle at top left, #ccfbf1, transparent 40%), #f4f7f7",
      }}
    >
      <div className="lm-card" style={{ width: "min(100%, 26rem)" }}>
        <div style={{ marginBottom: "1.25rem" }}>
          <p
            style={{
              margin: 0,
              color: "var(--lm-teal)",
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              fontSize: "0.75rem",
            }}
          >
            loan-mate
          </p>
          <h1 style={{ fontSize: "1.75rem" }}>Staff sign in</h1>
          <p>NBFC loan operations — staff only.</p>
        </div>

        <form
          className="lm-form"
          onSubmit={(e) => {
            e.preventDefault();
            void form.handleSubmit();
          }}
        >
          <form.Field name="email">
            {(field) => (
              <div className="lm-form-row">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  autoComplete="username"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  required
                />
              </div>
            )}
          </form.Field>
          <form.Field name="password">
            {(field) => (
              <div className="lm-form-row">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  required
                />
              </div>
            )}
          </form.Field>
          {error ? <p className="lm-error">{error}</p> : null}
          <button type="submit" className="lm-btn">
            Sign in
          </button>
        </form>

        {bypass ? (
          <div style={{ marginTop: "1.5rem" }}>
            <p className="lm-muted" style={{ marginBottom: "0.75rem" }}>
              Auth bypass — quick login (seed password:{" "}
              <code>{SEED_PASSWORD}</code>)
            </p>
            <div className="lm-actions">
              {SEED_USERS.map((seed) => (
                <button
                  key={seed.email}
                  type="button"
                  className="lm-btn lm-btn-secondary"
                  onClick={() => void quickLogin(seed.email)}
                >
                  {seed.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
