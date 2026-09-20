import type { Messaging } from "firebase/messaging";
import { loadFirebase } from "./firebase";

let messaging: Messaging | null = null;
let messagingPromise: Promise<Messaging | null> | null = null;

export async function getFirebaseMessagingAsync() {
  if (messaging) {
    return messaging;
  }
  messagingPromise ??= (async () => {
    const { app: firebaseApp } = await loadFirebase();
    if (!firebaseApp) {
      return null;
    }
    try {
      const { getMessaging } = await import("firebase/messaging");
      messaging = getMessaging(firebaseApp);
      return messaging;
    } catch {
      messaging = null;
      return null;
    }
  })();
  return messagingPromise;
}

/** Sync accessor after messaging has been loaded. */
export function getFirebaseMessaging() {
  return messaging;
}

const FCM_SW_URL = "/firebase-messaging-sw.js";
/** Narrower than `/` so this worker cannot replace the PWA `sw.js` registration. */
export const FCM_SW_SCOPE = "/firebase-cloud-messaging-push-scope/";

function isFirebaseMessagingScript(scriptUrl: string): boolean {
  return /\/firebase-messaging-sw\.js(?:\?|$)/.test(scriptUrl);
}

function isRootScope(scope: string): boolean {
  try {
    return new URL(scope).pathname === "/";
  } catch {
    return false;
  }
}

export async function registerMessagingServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return null;
  }

  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(
    registrations
      .filter((registration) => {
        const script =
          registration.active?.scriptURL ||
          registration.waiting?.scriptURL ||
          registration.installing?.scriptURL ||
          "";
        return (
          isFirebaseMessagingScript(script) && isRootScope(registration.scope)
        );
      })
      .map((registration) => registration.unregister()),
  );

  return navigator.serviceWorker.register(FCM_SW_URL, { scope: FCM_SW_SCOPE });
}
