import { IconProvider } from "@dev-ui/icons";
import lucidePack from "@dev-ui/icons-packs/lucide";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { StrictMode, useEffect, useRef, useState } from "react";
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
  const [ready, setReady] = useState(false);
  const userId = auth.user?.id;
  const invalidatedFor = useRef<{ userId: string | undefined } | null>(null);

  useEffect(() => {
    if (auth.loading) {
      return;
    }

    let cancelled = false;
    const user = auth.user;

    async function warmRoleBundle() {
      if (user) {
        await preloadSessionProviders();
        const home = homePathForUser(user);
        if (home === "/app" || home.startsWith("/me")) {
          void router.preloadRoute({ to: home });
        }
      }
      if (!cancelled) {
        setReady(true);
      }
    }

    void warmRoleBundle();

    return () => {
      cancelled = true;
    };
  }, [auth.loading, userId, auth.user]);

  useEffect(() => {
    if (!ready) {
      return;
    }
    if (invalidatedFor.current && invalidatedFor.current.userId === userId) {
      return;
    }
    invalidatedFor.current = { userId };
    void router.invalidate();
  }, [userId, ready]);

  if (!ready) {
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
