import { type FirebaseApp, initializeApp } from "firebase/app";
import { type Auth, GoogleAuthProvider, getAuth } from "firebase/auth";
import { getMessaging, type Messaging } from "firebase/messaging";
import { isAuthBypassEnabled } from "./constants";

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let messaging: Messaging | null = null;

function hasFirebaseConfig() {
  return Boolean(
    import.meta.env.VITE_FIREBASE_API_KEY &&
      import.meta.env.VITE_FIREBASE_AUTH_DOMAIN &&
      import.meta.env.VITE_FIREBASE_PROJECT_ID &&
      import.meta.env.VITE_FIREBASE_APP_ID,
  );
}

export function initFirebase() {
  if (isAuthBypassEnabled() || !hasFirebaseConfig()) {
    return { app: null, auth: null };
  }

  if (!app) {
    app = initializeApp({
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
    });
    auth = getAuth(app);
  }

  return { app, auth };
}

export function getFirebaseAuth() {
  const { auth: firebaseAuth } = initFirebase();
  return firebaseAuth;
}

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

export const googleProvider = new GoogleAuthProvider();
