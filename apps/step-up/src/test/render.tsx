import { IconProvider } from "@dev-ui/icons";
import lucidePack from "@dev-ui/icons-packs/lucide";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  type RenderOptions,
  type RenderResult,
  render,
} from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import {
  AuthContext,
  type AuthContextValue,
  type AuthUser,
} from "@/lib/auth-context";
import { DEV_USERS, type UserRole } from "@/lib/constants";

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

export function createAuthStub(
  overrides: Partial<AuthContextValue> & { role?: UserRole } = {},
): AuthContextValue {
  const role = overrides.role ?? "STUDENT";
  const user =
    overrides.user === undefined
      ? (DEV_USERS[role] as AuthUser)
      : overrides.user;

  return {
    loading: false,
    emailVerified: true,
    hasPasswordProvider: false,
    needsEmailVerification: false,
    loginAsDev: () => undefined,
    signIn: async () => user as AuthUser,
    signUp: async () => user as AuthUser,
    signInWithGoogle: async () => user as AuthUser,
    resetPassword: async () => undefined,
    changePassword: async () => undefined,
    changeEmail: async () => undefined,
    resendEmailVerification: async () => undefined,
    refreshEmailVerification: async () => true,
    signOutUser: async () => undefined,
    getIdToken: async () => (user ? `dev:${user.role}:${user.id}` : null),
    updateUser: () => undefined,
    ...overrides,
    user: overrides.user === undefined ? user : overrides.user,
  };
}

type ProvidersProps = {
  children: ReactNode;
  queryClient?: QueryClient;
  auth?: AuthContextValue | null;
};

function Providers({ children, queryClient, auth }: ProvidersProps) {
  const client = queryClient ?? createTestQueryClient();
  const content = (
    <IconProvider icons={{ library: "lucide" }} initialPack={lucidePack}>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </IconProvider>
  );

  if (!auth) {
    return content;
  }

  return <AuthContext.Provider value={auth}>{content}</AuthContext.Provider>;
}

export function renderWithProviders(
  ui: ReactElement,
  options: RenderOptions & {
    queryClient?: QueryClient;
    auth?: AuthContextValue | null;
  } = {},
): RenderResult {
  const { queryClient, auth, ...renderOptions } = options;

  return render(ui, {
    wrapper: ({ children }) => (
      <Providers
        {...(queryClient !== undefined ? { queryClient } : {})}
        {...(auth !== undefined ? { auth } : {})}
      >
        {children}
      </Providers>
    ),
    ...renderOptions,
  });
}
