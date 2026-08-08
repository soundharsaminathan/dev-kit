import { type ReactNode, useEffect, useState } from "react";

type ToastModule = typeof import("@dev-ui/components/toast");

let toastModule: ToastModule | null = null;
let toastPromise: Promise<ToastModule> | null = null;

function loadToastModule() {
  toastPromise ??= import("@dev-ui/components/toast").then((mod) => {
    toastModule = mod;
    return mod;
  });
  return toastPromise;
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

function scheduleIdle(cb: () => void) {
  if (typeof requestIdleCallback === "function") {
    const id = requestIdleCallback(() => cb(), { timeout: 2500 });
    return () => cancelIdleCallback(id);
  }
  const id = window.setTimeout(cb, 1);
  return () => window.clearTimeout(id);
}

/**
 * Toast (and motion/react) are not required for public first paint. Idle-load
 * on public routes.
 *
 * Protected routes call `useToastContext` during render (dashboard, home
 * notices). Session-cache auth finishes before idle toast hydrate, which
 * crashed /app and /me. Protected paths therefore load toast immediately and
 * hold the tree until the provider is ready (overlapped with AuthBootLoader
 * via preloadToast).
 */
export function DeferredToastProvider({
  children,
  position = "top-right",
  timeout = 3000,
}: {
  children: ReactNode;
  position?:
    | "top-right"
    | "top-left"
    | "bottom-right"
    | "bottom-left"
    | "top-center"
    | "bottom-center";
  timeout?: number;
}) {
  const [mod, setMod] = useState<ToastModule | null>(() => toastModule);
  const [isPublic] = useState(() =>
    typeof window === "undefined"
      ? true
      : isPublicBootPath(window.location.pathname),
  );

  useEffect(() => {
    if (mod) {
      return;
    }

    if (!isPublic) {
      void loadToastModule().then((loaded) => {
        setMod(loaded);
      });
      return;
    }

    return scheduleIdle(() => {
      void loadToastModule().then((loaded) => {
        setMod(loaded);
      });
    });
  }, [mod, isPublic]);

  if (!mod) {
    if (isPublic) {
      return children;
    }
    // Keep AuthBootLoader-era blank brief; provider mounts as soon as chunk lands.
    return null;
  }

  return (
    <mod.ToastProvider position={position} timeout={timeout}>
      {children}
    </mod.ToastProvider>
  );
}

/** Warm the toast chunk when a surface is about to need it. */
export function preloadToast() {
  return loadToastModule();
}
