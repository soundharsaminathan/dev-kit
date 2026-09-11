import { Alert, AlertDescription, AlertTitle } from "@dev-ui/components/alert";
import { FieldError, Label } from "@dev-ui/components/field";
import { Input } from "@dev-ui/components/input";
import { TextArea } from "@dev-ui/components/text-area";
import { TextField } from "@dev-ui/components/text-field";
import { ToggleButton } from "@dev-ui/components/toggle-button";
import { ToggleButtonGroup } from "@dev-ui/components/toggle-button-group";
import { useOnlineStatus } from "@dev-ui/hooks";
import { useForm } from "@tanstack/react-form";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { UserRole } from "@/lib/constants";
import {
  homePathForUser,
  redirectIfAuthenticated,
  safeInternalPath,
} from "@/lib/require-auth";
import { isIncludeTestFlag } from "@/lib/test-studios";
import { PublicShell } from "@/modules/layout/public-shell";
import { PasswordInput } from "@/modules/ui/password-input";
import { StudioSelect, useStudioDirectory } from "@/modules/ui/studio-select";
import { TouchButton } from "@/modules/ui/touch-button";
import styles from "./login.module.scss";

type RegisterAudience = "student" | "studio";

type RegisterSearch = {
  redirect?: string;
  studio?: string;
  studioId?: string;
  includeTest?: true;
  for?: RegisterAudience;
};

type RegisterFormValues = {
  studioId: string;
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
};

type StudioInquiryFormValues = {
  studioName: string;
  ownerName: string;
  email: string;
  phone: string;
  city: string;
  message: string;
};

function parseAudience(value: unknown): RegisterAudience | undefined {
  if (value === "student" || value === "studio") return value;
  return undefined;
}

function parseSearch(search: Record<string, unknown>): RegisterSearch {
  const result: RegisterSearch = {};
  if (typeof search.redirect === "string") {
    result.redirect = search.redirect;
  }
  if (typeof search.studio === "string" && search.studio.trim()) {
    result.studio = search.studio.trim();
  }
  if (typeof search.studioId === "string" && search.studioId.trim()) {
    result.studioId = search.studioId.trim();
  }
  if (isIncludeTestFlag(search.includeTest)) {
    result.includeTest = true;
  }
  const audience = parseAudience(search.for);
  if (audience) {
    result.for = audience;
  }
  return result;
}

function fieldError(errors: unknown[]): string | undefined {
  const first = errors[0];
  return typeof first === "string" ? first : undefined;
}

function validateStudioId(value: string) {
  if (!value.trim()) return "Select your studio";
  return undefined;
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

function validateStudioName(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "Enter your studio name";
  if (trimmed.length < 2) return "Studio name must be at least 2 characters";
  return undefined;
}

function validateOptionalPhone(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (trimmed.length < 7) return "Enter a valid phone number";
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
  const {
    redirect: redirectTo,
    studio: searchStudioSlug,
    studioId: searchStudioId,
    includeTest,
    for: audienceParam,
  } = Route.useSearch();

  const audience: RegisterAudience =
    audienceParam ??
    (searchStudioId || searchStudioSlug ? "student" : "studio");

  const setAudience = (next: RegisterAudience) => {
    void navigate({
      to: "/register",
      search: {
        for: next,
        ...(redirectTo ? { redirect: redirectTo } : {}),
        ...(next === "student" && searchStudioId
          ? { studioId: searchStudioId }
          : {}),
        ...(next === "student" && searchStudioSlug
          ? { studio: searchStudioSlug }
          : {}),
        ...(includeTest ? { includeTest: true } : {}),
      },
      replace: true,
    });
  };

  return (
    <PublicShell>
      <section className={styles.panel}>
        <div className={styles.brandBlock}>
          <h1 className={styles.title}>
            {audience === "studio" ? "Register your studio" : "Join the studio"}
          </h1>
          <p className={styles.subtitle}>
            {audience === "studio"
              ? "Tell us about your studio. We’ll email info@classa.in and follow up."
              : "Create your student account and personalize your dance journey."}
          </p>
        </div>

        <ToggleButtonGroup
          aria-label="Register as"
          selectionMode="single"
          selectedKeys={[audience]}
          disallowEmptySelection
          variant="segmented"
          size="lg"
          data-testid="register-audience"
          onSelectionChange={(keys) => {
            const next = String([...keys][0] ?? "");
            if (next === "student" || next === "studio") {
              setAudience(next);
            }
          }}
        >
          <ToggleButton id="studio" data-testid="register-as-studio">
            Studio
          </ToggleButton>
          <ToggleButton id="student" data-testid="register-as-student">
            Student
          </ToggleButton>
        </ToggleButtonGroup>

        {audience === "studio" ? (
          <StudioInquiryForm />
        ) : (
          <StudentRegisterForm
            {...(redirectTo ? { redirectTo } : {})}
            {...(searchStudioSlug ? { searchStudioSlug } : {})}
            {...(searchStudioId ? { searchStudioId } : {})}
            {...(includeTest ? { includeTest } : {})}
          />
        )}
      </section>
    </PublicShell>
  );
}

function StudioInquiryForm() {
  const online = useOnlineStatus();
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const form = useForm({
    defaultValues: {
      studioName: "",
      ownerName: "",
      email: "",
      phone: "",
      city: "",
      message: "",
    } satisfies StudioInquiryFormValues,
    onSubmit: async ({ value }) => {
      setError(null);
      try {
        await apiRequest<{ ok: true }>("/contact/studio-inquiry", {
          method: "POST",
          body: {
            studioName: value.studioName.trim(),
            ownerName: value.ownerName.trim(),
            email: value.email.trim(),
            ...(value.phone.trim() ? { phone: value.phone.trim() } : {}),
            ...(value.city.trim() ? { city: value.city.trim() } : {}),
            ...(value.message.trim() ? { message: value.message.trim() } : {}),
          },
        });
        setSent(true);
      } catch (submitError) {
        setError(
          submitError instanceof Error
            ? submitError.message
            : "Unable to send registration",
        );
      }
    },
  });

  if (sent) {
    return (
      <Alert variant="success" data-testid="studio-inquiry-success">
        <AlertTitle>Request sent</AlertTitle>
        <AlertDescription>
          Thanks — we emailed info@classa.in. We’ll get back to you shortly.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <>
      {error ? (
        <Alert variant="danger">
          <AlertTitle>Couldn’t send</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {!online ? (
        <Alert variant="warning">
          <AlertTitle>You’re offline</AlertTitle>
          <AlertDescription>
            Sending a studio registration needs a network connection. Reconnect
            and try again.
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
          name="studioName"
          validators={{
            onBlur: ({ value }) => validateStudioName(value),
            onSubmit: ({ value }) => validateStudioName(value),
          }}
        >
          {(field) => {
            const err = fieldError(field.state.meta.errors);
            return (
              <TextField>
                <Label data-required="true">Studio name</Label>
                <Input
                  name={field.name}
                  type="text"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  autoComplete="organization"
                  aria-invalid={Boolean(err)}
                  required
                  data-testid="studio-inquiry-name"
                />
                {err ? <FieldError>{err}</FieldError> : null}
              </TextField>
            );
          }}
        </form.Field>

        <form.Field
          name="ownerName"
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
                  data-testid="studio-inquiry-email"
                />
                {err ? <FieldError>{err}</FieldError> : null}
              </TextField>
            );
          }}
        </form.Field>

        <form.Field
          name="phone"
          validators={{
            onBlur: ({ value }) => validateOptionalPhone(value),
            onSubmit: ({ value }) => validateOptionalPhone(value),
          }}
        >
          {(field) => {
            const err = fieldError(field.state.meta.errors);
            return (
              <TextField>
                <Label>Phone</Label>
                <Input
                  name={field.name}
                  type="tel"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  autoComplete="tel"
                  aria-invalid={Boolean(err)}
                />
                {err ? <FieldError>{err}</FieldError> : null}
              </TextField>
            );
          }}
        </form.Field>

        <form.Field name="city">
          {(field) => (
            <TextField>
              <Label>City</Label>
              <Input
                name={field.name}
                type="text"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
                autoComplete="address-level2"
              />
            </TextField>
          )}
        </form.Field>

        <form.Field name="message">
          {(field) => (
            <TextField>
              <Label>Anything else?</Label>
              <TextArea
                name={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
                rows={3}
              />
            </TextField>
          )}
        </form.Field>

        <form.Subscribe selector={(state) => state.isSubmitting}>
          {(isSubmitting) => (
            <TouchButton
              type="submit"
              variant="primary"
              fullWidth
              isPending={isSubmitting}
              isDisabled={!online || isSubmitting}
              data-testid="studio-inquiry-submit"
            >
              Send registration
            </TouchButton>
          )}
        </form.Subscribe>
      </form>

      <Link to="/login" className={styles.footerLink}>
        Already have an account? Sign in
      </Link>
    </>
  );
}

function StudentRegisterForm({
  redirectTo,
  searchStudioSlug,
  searchStudioId,
  includeTest,
}: {
  redirectTo?: string;
  searchStudioSlug?: string;
  searchStudioId?: string;
  includeTest?: true;
}) {
  const navigate = useNavigate();
  const { signUp, signInWithGoogle, user } = useAuth();
  const online = useOnlineStatus();
  const [error, setError] = useState<string | null>(null);
  const directory = useStudioDirectory({ includeTest });

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
      studioId: searchStudioId ?? "",
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
          { studioId: value.studioId.trim() },
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
      return;
    }

    if (form.getFieldValue("studioId")) return;
    const first = studios[0];
    if (!first) return;
    form.setFieldValue("studioId", first.id);
  }, [directory.data, form, searchStudioId, searchStudioSlug]);

  const handleGoogleSignIn = async () => {
    setError(null);
    const studioId = form.getFieldValue("studioId").trim();
    if (!studioId) {
      setError("Select your studio");
      return;
    }
    try {
      const signedIn = await signInWithGoogle({
        asNewStudent: true,
        studioId,
      });
      redirectForRole(signedIn.role, signedIn);
    } catch {
      setError("Google sign in failed");
    }
  };

  return (
    <>
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
          name="studioId"
          validators={{
            onBlur: ({ value }) => validateStudioId(value),
            onSubmit: ({ value }) => validateStudioId(value),
          }}
        >
          {(field) => {
            const err = fieldError(field.state.meta.errors);
            return (
              <StudioSelect
                selectedKey={field.state.value || null}
                onSelectionChange={(studioId) => {
                  field.handleChange(studioId ?? "");
                  void navigate({
                    to: "/register",
                    search: {
                      for: "student",
                      ...(redirectTo ? { redirect: redirectTo } : {}),
                      ...(studioId ? { studioId } : {}),
                      ...(includeTest ? { includeTest: true } : {}),
                    },
                    replace: true,
                  });
                }}
                includeTest={includeTest}
                isRequired
                isInvalid={Boolean(err)}
                errorMessage={err}
                data-testid="register-studio-select"
              />
            );
          }}
        </form.Field>

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

      <form.Subscribe
        selector={(state) => ({
          email: state.values.email,
          studioId: state.values.studioId,
        })}
      >
        {({ email, studioId }) => {
          const trimmed = email.trim();
          return (
            <Link
              to="/login"
              search={{
                ...(trimmed ? { identifier: trimmed } : {}),
                ...(studioId.trim() ? { studioId: studioId.trim() } : {}),
                ...(includeTest ? { includeTest: true } : {}),
              }}
              className={styles.footerLink}
            >
              Already have an account? Sign in
            </Link>
          );
        }}
      </form.Subscribe>
    </>
  );
}
