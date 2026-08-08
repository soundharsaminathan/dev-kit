import { createRouter, RouterProvider } from "@tanstack/react-router";
import { StrictMode, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
// Critical fonts are declared in index.html (Plus Jakarta Sans).
// Token/global CSS is loaded asynchronously so the static public shell in
// index.html can paint without waiting on the stylesheet link.
import { ApiProvider } from "@/lib/api-context";
import { AuthProvider, useAuth } from "@/lib/auth";
import { preloadAppTheme } from "@/lib/boot-theme-provider";
import { SLOW_LOAD_TIMEOUT_MS } from "@/lib/brand";
import { preloadToast } from "@/lib/deferred-toast";
import { homePathForUser } from "@/lib/require-auth";
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

/** Display-only boot caption from session cache — not an auth bypass. */
function readMeBootGreeting(): string | null {
  if (typeof window === "undefined") return null;
  if (!window.location.pathname.startsWith("/me")) return null;
  try {
    const raw = localStorage.getItem("step-up-session-user");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      user?: { name?: string };
    } | null;
    const firstName = parsed?.user?.name?.split(" ")[0];
    if (!firstName) return null;
    return `Hey, ${firstName} — let's dance`;
  } catch {
    return null;
  }
}

let sentryScheduled = false;
function scheduleSentry() {
  if (sentryScheduled) return;
  sentryScheduled = true;
  // Hard delay — requestIdleCallback often fires mid-Lighthouse lab and
  // attributes ~180–200ms scripting to TBT on /app and /me.
  const delayMs = isPublicBootPath(window.location.pathname) ? 4_000 : 15_000;
  window.setTimeout(() => {
    void import("@/lib/sentry").then(({ initSentry }) => {
      initSentry(router);
    });
    void import("@/styles/inter-fonts.css");
  }, delayMs);
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
    // Keep Sentry off the first protected paint / login TBT window.
    if (!auth.loading) {
      scheduleSentry();
    }
  }, [auth.loading]);

  useEffect(() => {
    if (isPublicBootPath(window.location.pathname)) {
      // Public pages: still init eventually even if auth stays "loading" briefly.
      scheduleSentry();
    }
  }, []);

  useEffect(() => {
    if (!blockOnAuth) {
      setSlowLoad(false);
      return;
    }
    // Warm theme + toast while AuthBootLoader is up; IconProvider/noop toast
    // stubs let the shell paint without waiting on these chunks.
    void preloadAppTheme().catch(() => undefined);
    void preloadToast().catch(() => undefined);
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
    if (slowLoad) {
      return <SlowLoadFallback />;
    }
    const meGreeting = readMeBootGreeting();
    return (
      <AuthBootLoader
        {...(meGreeting ? { caption: meGreeting, meGreeting: true } : {})}
      />
    );
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
