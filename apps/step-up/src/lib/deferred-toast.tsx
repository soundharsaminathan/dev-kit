import { useRouterState } from "@tanstack/react-router";
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
 * Protected routes call `useToastContext` during render. Pathname is reactive
 * so a login → /app transition loads toast immediately instead of staying on
 * the public idle path.
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
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const isPublic = isPublicBootPath(pathname);
  const [mod, setMod] = useState<ToastModule | null>(() => toastModule);

  useEffect(() => {
    if (toastModule && !mod) {
      setMod(toastModule);
    }
  }, [mod]);

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
