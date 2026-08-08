import { createRouter, RouterProvider } from "@tanstack/react-router";
import { StrictMode, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
// Critical fonts are declared in index.html (Plus Jakarta Sans).
// Token/global CSS is loaded asynchronously so the static public shell in
// index.html can paint without waiting on the stylesheet link.
import { ApiProvider } from "@/lib/api-context";
import { AuthProvider, useAuth } from "@/lib/auth";
import { SLOW_LOAD_TIMEOUT_MS } from "@/lib/brand";
import { homePathForUser } from "@/lib/require-auth";
import { preloadSessionProviders } from "@/lib/session-gate";
import {
  AppErrorBoundary,
  reportRootError,
} from "@/modules/ui/app-error-boundary";
import { AuthBootLoader } from "@/modules/ui/auth-boot-loader";
import { SlowLoadFallback } from "@/modules/ui/slow-load-fallback";
import { routeTree } from "./routeTree.gen";

function loadAppStyles() {
  return Promise.all([
    import("@/styles/tokens.scss"),
    import("@/styles/global.scss"),
  ]);
}

const router = createRouter({
  routeTree,
  context: {
    auth: undefined!,
  },
});

const scheduleIdle =
  typeof requestIdleCallback === "function"
    ? (cb: () => void) => {
        requestIdleCallback(cb, { timeout: 6000 });
      }
    : (cb: () => void) => {
        window.setTimeout(cb, 4000);
      };

scheduleIdle(() => {
  void import("@/lib/sentry").then(({ initSentry }) => {
    initSentry(router);
  });
  // Warm Inter for staff surfaces after first paint.
  void import("@/styles/inter-fonts.css");
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

function isPublicBootPath(pathname: string) {
  if (pathname === "/" || pathname === "") return true;
  return (
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/join") ||
    pathname.startsWith("/studio/")
  );
}

function AppRouter() {
  const auth = useAuth();
  const userId = auth.user?.id;
  const invalidatedFor = useRef<{ userId: string | undefined } | null>(null);
  const [slowLoad, setSlowLoad] = useState(
    () => performance.now() >= SLOW_LOAD_TIMEOUT_MS,
  );
  const blockOnAuth =
    auth.loading && !isPublicBootPath(window.location.pathname);

  useEffect(() => {
    if (!blockOnAuth) {
      setSlowLoad(false);
      return;
    }
    const remaining = Math.max(0, SLOW_LOAD_TIMEOUT_MS - performance.now());
    const id = window.setTimeout(() => {
      setSlowLoad(true);
    }, remaining);
    return () => window.clearTimeout(id);
  }, [blockOnAuth]);

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

  if (blockOnAuth) {
    return slowLoad ? <SlowLoadFallback /> : <AuthBootLoader />;
  }

  return <RouterProvider router={router} context={{ auth }} />;
}

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found");
}
const appRoot = rootElement;

function toErrorInfo(errorInfo: {
  componentStack?: string | null | undefined;
}): { componentStack: string | null } {
  return { componentStack: errorInfo.componentStack ?? null };
}

function mountApp() {
  createRoot(appRoot, {
    onUncaughtError: (error, errorInfo) => {
      reportRootError(error, toErrorInfo(errorInfo));
    },
    onCaughtError: (error, errorInfo) => {
      reportRootError(error, toErrorInfo(errorInfo));
    },
    onRecoverableError: (error, errorInfo) => {
      reportRootError(error, toErrorInfo(errorInfo));
    },
  }).render(
    <StrictMode>
      <AppErrorBoundary>
        <AuthProvider>
          <ApiProvider>
            <AppRouter />
          </ApiProvider>
        </AuthProvider>
      </AppErrorBoundary>
    </StrictMode>,
  );
}

// Kick styles immediately (async chunk — not a render-blocking <link> in <head>).
const stylesReady = loadAppStyles();

void (async () => {
  // Public routes already paint a static HTML shell; wait for styles before
  // React replaces it so the themed LCP paint is not unstyled.
  // Protected routes need styles for the auth boot loader.
  await stylesReady.catch(() => undefined);
  mountApp();
})();
