import { getMessaging, type Messaging } from "firebase/messaging";
import { initFirebase } from "./firebase";

let messaging: Messaging | null = null;

export function getFirebaseMessaging() {
  const { app: firebaseApp } = initFirebase();
  if (!firebaseApp) {
    return null;
  }

  if (!messaging) {
    try {
      messaging = getMessaging(firebaseApp);
    } catch {
      messaging = null;
    }
  }

  return messaging;
}

export async function registerMessagingServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return null;
  }

  return navigator.serviceWorker.register("/firebase-messaging-sw.js");
}
