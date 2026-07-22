import { type ReactNode, useSyncExternalStore } from "react";
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

export function SessionGate({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const loaded = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  if (user && !loaded) {
    void preloadSessionProviders();
  }

  if (user && loaded) {
    return <loaded.SessionProviders>{children}</loaded.SessionProviders>;
  }

  return children;
}
