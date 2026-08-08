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

export async function registerMessagingServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return null;
  }

  return navigator.serviceWorker.register("/firebase-messaging-sw.js");
}
