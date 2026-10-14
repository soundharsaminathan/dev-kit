import type { FirebaseApp } from "firebase/app";
import type { Auth, GoogleAuthProvider } from "firebase/auth";
import { isAuthBypassEnabled } from "./constants";

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let googleProvider: GoogleAuthProvider | null = null;
let loading: Promise<{
  app: FirebaseApp | null;
  auth: Auth | null;
  googleProvider: GoogleAuthProvider | null;
}> | null = null;

function hasFirebaseConfig() {
  return Boolean(
    import.meta.env.VITE_FIREBASE_API_KEY &&
      import.meta.env.VITE_FIREBASE_AUTH_DOMAIN &&
      import.meta.env.VITE_FIREBASE_PROJECT_ID &&
      import.meta.env.VITE_FIREBASE_APP_ID,
  );
}

/**
 * Lazily load Firebase Auth. Keeps firebase/* out of the synchronous entry
 * graph so public routes can paint before Auth SDK parse/eval.
 */
export function loadFirebase() {
  if (loading) {
    return loading;
  }

  loading = (async () => {
    if (isAuthBypassEnabled() || !hasFirebaseConfig()) {
      return { app: null, auth: null, googleProvider: null };
    }

    if (app && auth && googleProvider) {
      return { app, auth, googleProvider };
    }

    const [{ initializeApp }, { getAuth, GoogleAuthProvider }] =
      await Promise.all([import("firebase/app"), import("firebase/auth")]);

    app = initializeApp({
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
    });
    auth = getAuth(app);
    googleProvider = new GoogleAuthProvider();
    return { app, auth, googleProvider };
  })();

  return loading;
}

/** @deprecated Prefer loadFirebase() — sync accessor only after load. */
export function initFirebase() {
  return { app, auth };
}

export function getFirebaseAuth() {
  return auth;
}

export async function getFirebaseAuthAsync() {
  const loaded = await loadFirebase();
  return loaded.auth;
}

export async function getGoogleProviderAsync() {
  const loaded = await loadFirebase();
  if (!loaded.googleProvider) {
    throw new Error("Firebase is not configured");
  }
  return loaded.googleProvider;
}
