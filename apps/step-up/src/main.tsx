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
import { SLOW_LOAD_TIMEOUT_MS } from "@/lib/brand";
import { homePathForUser } from "@/lib/require-auth";
import { initSentry, Sentry } from "@/lib/sentry";
import { preloadSessionProviders } from "@/lib/session-gate";
import { DanceLoader } from "@/modules/ui/dance-loader";
import { SlowLoadFallback } from "@/modules/ui/slow-load-fallback";
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
  const [slowLoad, setSlowLoad] = useState(
    () => performance.now() >= SLOW_LOAD_TIMEOUT_MS,
  );

  useEffect(() => {
    if (!auth.loading) {
      setSlowLoad(false);
      return;
    }
    const remaining = Math.max(0, SLOW_LOAD_TIMEOUT_MS - performance.now());
    const id = window.setTimeout(() => {
      setSlowLoad(true);
    }, remaining);
    return () => window.clearTimeout(id);
  }, [auth.loading]);

  // Invalidate for auth changes, then warm home — never race preload with
  // invalidate (evicts in-flight preload matches → _nonReactive TypeError).
  useEffect(() => {
    if (auth.loading) {
      return;
    }

    let cancelled = false;

    const run = async () => {
      const needsInvalidate =
        !invalidatedFor.current || invalidatedFor.current.userId !== userId;
      if (needsInvalidate) {
        invalidatedFor.current = { userId };
        await router.invalidate();
      }
      if (cancelled || !auth.user) {
        return;
      }

      void preloadSessionProviders().catch(() => undefined);
      const home = homePathForUser(auth.user);
      if (home === "/app" || home.startsWith("/me")) {
        await router.preloadRoute({ to: home }).catch(() => undefined);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [auth.loading, auth.user, userId]);

  if (auth.loading) {
    return (
      <IconProvider
        icons={{ library: "lucide" }}
        initialPack={lucidePack}
        loaders={{}}
      >
        {slowLoad ? <SlowLoadFallback /> : <DanceLoader />}
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
