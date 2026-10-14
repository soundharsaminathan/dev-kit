import { type ReactNode, useEffect, useRef, useSyncExternalStore } from "react";
import { useAuth } from "@/lib/auth";

type SessionModule = typeof import("./session-providers");

let sessionModule: SessionModule | null = null;
let sessionPromise: Promise<SessionModule> | null = null;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return sessionModule;
}

function getServerSnapshot() {
  return null;
}

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

export function preloadSessionProviders() {
  if (sessionModule) {
    return Promise.resolve(sessionModule);
  }
  sessionPromise ??= import("./session-providers").then((mod) => {
    sessionModule = mod;
    notify();
    return mod;
  });
  return sessionPromise;
}

/**
 * Sockets/push are not required for shell LCP — defer past first paint.
 *
 * Once the authenticated outlet has painted without SessionProviders, do not
 * wrap it later: inserting providers remounts the route tree and wipes local
 * UI state (registration forms, booking success, attendance confirms).
 * Side-effect hosts still mount as a sibling so push/sockets can connect.
 * The fragment around that sibling is part of the first paint — adding the
 * host must not change the element type that parents the outlet.
 */
export function SessionGate({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const loaded = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  const committedBare = useRef(false);

  useEffect(() => {
    if (!user || sessionModule) {
      return;
    }
    const enable = () => {
      void preloadSessionProviders();
    };
    if (typeof requestIdleCallback === "function") {
      const id = requestIdleCallback(enable, { timeout: 4_000 });
      return () => cancelIdleCallback(id);
    }
    const id = window.setTimeout(enable, 1_500);
    return () => window.clearTimeout(id);
  }, [user]);

  // Any paint without providers around the outlet must stay on this shape.
  // Switching from `return children` to a fragment later changes the parent
  // type and remounts the route tree (registration fields detach mid-test).
  if (!(user && loaded)) {
    committedBare.current = true;
  }

  if (user && loaded && !committedBare.current) {
    return <loaded.SessionProviders>{children}</loaded.SessionProviders>;
  }

  return (
    <>
      {user && loaded ? (
        <loaded.SessionProviders>{null}</loaded.SessionProviders>
      ) : null}
      {children}
    </>
  );
}
