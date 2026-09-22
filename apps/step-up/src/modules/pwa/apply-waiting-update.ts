const SKIP_WAITING = { type: "SKIP_WAITING" } as const;
const RELOAD_FALLBACK_MS = 800;

type WorkerLike = {
  scriptURL: string;
  postMessage?: (message: unknown) => void;
};

export type ServiceWorkerRegistrationLike = {
  scope: string;
  waiting?: WorkerLike | null;
  installing?: WorkerLike | null;
  active?: WorkerLike | null;
  unregister: () => Promise<boolean>;
};

export type ApplyWaitingUpdateDeps = {
  getRegistrations: () => Promise<readonly ServiceWorkerRegistrationLike[]>;
  onControllerChange: (listener: () => void) => void;
  reload: () => void;
  schedule: (fn: () => void, ms: number) => void;
};

function scriptUrlOf(registration: ServiceWorkerRegistrationLike): string {
  return (
    registration.waiting?.scriptURL ||
    registration.installing?.scriptURL ||
    registration.active?.scriptURL ||
    ""
  );
}

function isFirebaseMessagingScript(scriptUrl: string): boolean {
  return /\/firebase-messaging-sw\.js(?:\?|$)/.test(scriptUrl);
}

function isRootScope(scope: string): boolean {
  try {
    const path = new URL(scope, "https://local.invalid").pathname;
    return path === "/" || path === "";
  } catch {
    return false;
  }
}

function defaultDeps(): ApplyWaitingUpdateDeps | null {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }

  return {
    getRegistrations: () => navigator.serviceWorker.getRegistrations(),
    onControllerChange: (listener) => {
      navigator.serviceWorker.addEventListener("controllerchange", listener, {
        once: true,
      });
    },
    reload: () => window.location.reload(),
    schedule: (fn, ms) => {
      window.setTimeout(fn, ms);
    },
  };
}

/**
 * Activate a waiting app SW and reload. vite-plugin-pwa 1.3's
 * `updateServiceWorker(true)` only posts SKIP_WAITING and reloads if
 * workbox's `controlling` event has `isUpdate`, which often never fires.
 *
 * Also drops a Firebase messaging SW that was registered at `/` — that
 * steals the PWA scope and ignores SKIP_WAITING, leaving Reload dead.
 */
export async function applyWaitingServiceWorkerUpdate(
  updateServiceWorker: (reloadPage?: boolean) => Promise<void>,
  deps: ApplyWaitingUpdateDeps | null = defaultDeps(),
): Promise<void> {
  let reloaded = false;
  const reloadOnce = () => {
    if (reloaded) {
      return;
    }
    reloaded = true;
    (deps?.reload ?? (() => window.location.reload()))();
  };

  if (!deps) {
    await updateServiceWorker(true).catch(() => undefined);
    reloadOnce();
    return;
  }

  deps.onControllerChange(reloadOnce);

  try {
    const registrations = await deps.getRegistrations();
    await Promise.all(
      registrations.map(async (registration) => {
        if (
          isFirebaseMessagingScript(scriptUrlOf(registration)) &&
          isRootScope(registration.scope)
        ) {
          await registration.unregister();
          return;
        }
        registration.waiting?.postMessage?.(SKIP_WAITING);
      }),
    );
    await updateServiceWorker(true);
  } catch {
    reloadOnce();
    return;
  }

  deps.schedule(reloadOnce, RELOAD_FALLBACK_MS);
}
