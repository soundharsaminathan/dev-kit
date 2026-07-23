import { IconProvider } from "@dev-ui/icons";
import lucidePack from "@dev-ui/icons-packs/lucide";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { StrictMode, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import "@dev-ui/tokens/fonts/primary";
import "@dev-ui/tokens/scss";
import "@dev-ui/components/styles";
import "@/styles/global.scss";
import { ApiProvider } from "@/lib/api-context";
import { AuthProvider, useAuth } from "@/lib/auth";
import { homePathForUser } from "@/lib/require-auth";
import { initSentry, Sentry } from "@/lib/sentry";
import { preloadSessionProviders } from "@/lib/session-gate";
import { DanceLoader } from "@/modules/ui/dance-loader";
import { routeTree } from "./routeTree.gen";

const router = createRouter({
  routeTree,
  context: {
    auth: undefined!,
  },
});

initSentry(router);

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

function AppRouter() {
  const auth = useAuth();
  const userId = auth.user?.id;
  const invalidatedFor = useRef<{ userId: string | undefined } | null>(null);

  // Warm session + home chunks in the background — never block first paint.
  useEffect(() => {
    if (auth.loading || !auth.user) {
      return;
    }

    void preloadSessionProviders().catch(() => undefined);
    const home = homePathForUser(auth.user);
    if (home === "/app" || home.startsWith("/me")) {
      void router.preloadRoute({ to: home }).catch(() => undefined);
    }
  }, [auth.loading, auth.user]);

  useEffect(() => {
    if (auth.loading) {
      return;
    }
    if (invalidatedFor.current && invalidatedFor.current.userId === userId) {
      return;
    }
    invalidatedFor.current = { userId };
    void router.invalidate();
  }, [userId, auth.loading]);

  if (auth.loading) {
    return (
      <IconProvider
        icons={{ library: "lucide" }}
        initialPack={lucidePack}
        loaders={{}}
      >
        <DanceLoader />
      </IconProvider>
    );
  }

  return <RouterProvider router={router} context={{ auth }} />;
}

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found");
}

createRoot(rootElement, {
  onUncaughtError: (error, errorInfo) => {
    Sentry.captureException(error, {
      contexts: { react: { componentStack: errorInfo.componentStack } },
    });
    console.warn("Uncaught error", error, errorInfo.componentStack);
  },
  onCaughtError: (error, errorInfo) => {
    Sentry.captureException(error, {
      contexts: { react: { componentStack: errorInfo.componentStack } },
    });
  },
  onRecoverableError: (error, errorInfo) => {
    Sentry.captureException(error, {
      contexts: { react: { componentStack: errorInfo.componentStack } },
    });
  },
}).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={<p>Something went wrong.</p>}>
      <AuthProvider>
        <ApiProvider>
          <AppRouter />
        </ApiProvider>
      </AuthProvider>
    </Sentry.ErrorBoundary>
  </StrictMode>,
);
