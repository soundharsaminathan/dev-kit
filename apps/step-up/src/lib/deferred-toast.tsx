import type { ReactNode } from "react";
import { useEffect, useState } from "react";

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

/**
 * Toast (and motion/react) are not required for first paint. Mount the real
 * provider after idle so public routes avoid ~400KB of motion on the entry path.
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

  useEffect(() => {
    if (mod) {
      return;
    }

    let cancelled = false;
    const schedule =
      typeof requestIdleCallback === "function"
        ? (cb: () => void) => {
            const id = requestIdleCallback(() => cb(), { timeout: 2500 });
            return () => cancelIdleCallback(id);
          }
        : (cb: () => void) => {
            const id = window.setTimeout(cb, 1);
            return () => window.clearTimeout(id);
          };

    const cancel = schedule(() => {
      void loadToastModule().then((loaded) => {
        if (!cancelled) {
          setMod(loaded);
        }
      });
    });

    return () => {
      cancelled = true;
      cancel();
    };
  }, [mod]);

  if (!mod) {
    return children;
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
