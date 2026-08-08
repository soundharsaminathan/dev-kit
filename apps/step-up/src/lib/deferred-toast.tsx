import type {
  ToastContent,
  ToastOptions,
} from "@dev-ui/components/toast/toast.types";
import {
  ToastContext,
  type ToastContextValue,
} from "@dev-ui/components/toast/toast-context";
import { useRouterState } from "@tanstack/react-router";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type ToastModule = typeof import("@dev-ui/components/toast");
type SharedToastQueue = ReturnType<ToastModule["createToastQueue"]>;

let toastModule: ToastModule | null = null;
let toastPromise: Promise<ToastModule> | null = null;
let sharedQueue: SharedToastQueue | null = null;

function loadToastModule() {
  toastPromise ??= import("@dev-ui/components/toast").then((mod) => {
    toastModule = mod;
    return mod;
  });
  return toastPromise;
}

function getSharedQueue(mod: ToastModule): SharedToastQueue {
  sharedQueue ??= mod.createToastQueue({ maxVisibleToasts: 3 });
  return sharedQueue;
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

type PendingToast = {
  content: ToastContent;
  options?: ToastOptions | undefined;
};

/**
 * Toast (and motion/react) are not required for public first paint. Idle-load
 * on public routes.
 *
 * Protected routes call `useToastContext` during render. Keep a stable
 * ToastContext.Provider around the app tree so swapping in the real
 * ToastProvider never remounts route state (forms, booking success, etc.).
 * The visual host mounts as a sibling once the chunk loads.
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
  const pendingRef = useRef<PendingToast[]>([]);
  const queueRef = useRef<SharedToastQueue | null>(
    toastModule ? getSharedQueue(toastModule) : null,
  );

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

  useLayoutEffect(() => {
    if (!mod) {
      return;
    }
    const queue = getSharedQueue(mod);
    queueRef.current = queue;
    const pending = pendingRef.current;
    if (pending.length === 0) {
      return;
    }
    pendingRef.current = [];
    for (const item of pending) {
      const resolvedTimeout =
        item.options?.timeout ??
        (item.content.variant === "loading" ? undefined : timeout);
      queue.add(item.content, {
        ...item.options,
        ...(resolvedTimeout !== undefined ? { timeout: resolvedTimeout } : {}),
      });
    }
  }, [mod, timeout]);

  const toast = useCallback(
    (content: ToastContent, options?: ToastOptions) => {
      const queue = queueRef.current;
      if (queue) {
        const resolvedTimeout =
          options?.timeout ??
          (content.variant === "loading" ? undefined : timeout);
        return queue.add(content, {
          ...options,
          ...(resolvedTimeout !== undefined
            ? { timeout: resolvedTimeout }
            : {}),
        });
      }
      pendingRef.current.push({ content, options });
      return "deferred-toast";
    },
    [timeout],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      toast,
      position,
      // Region reads state from the sibling ToastProvider host.
      state: null as unknown as ToastContextValue["state"],
    }),
    [position, toast],
  );

  const queue = mod ? getSharedQueue(mod) : null;

  return (
    <ToastContext.Provider value={value}>
      {children}
      {mod && queue ? (
        <mod.ToastProvider
          // createToastQueue default generic erases to unknown across the dynamic import.
          queue={queue as never}
          position={position}
          timeout={timeout}
        >
          {null}
        </mod.ToastProvider>
      ) : null}
    </ToastContext.Provider>
  );
}

/** Warm the toast chunk when a surface is about to need it. */
export function preloadToast() {
  return loadToastModule();
}
