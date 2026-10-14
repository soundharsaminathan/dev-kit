import * as admin from "firebase-admin";

/** Shared password for seeded accounts (mirrors prisma/seed.ts). */
export const SEED_PASSWORD = "password";

function ensureFirebaseApp(): boolean {
  if (admin.apps.length > 0) {
    return true;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    return false;
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
  return true;
}

function errorCode(error: unknown): string | null {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code: unknown }).code === "string"
  ) {
    return (error as { code: string }).code;
  }
  return null;
}

/**
 * Ensures a Firebase Auth email/password account exists for a seeded user
 * with a fixed UID matching the DB firebaseUid, and sets SEED_PASSWORD.
 * Never deletes accounts. Skips silently when Firebase Admin is not configured.
 */
export async function syncSeedFirebaseUser(input: {
  uid: string;
  email: string;
  displayName: string;
  password?: string;
}): Promise<void> {
  const password = input.password ?? SEED_PASSWORD;

  if (!ensureFirebaseApp()) {
    console.warn(
      "  Firebase Admin not configured — skipped seeding Auth password.",
    );
    return;
  }

  try {
    try {
      const user = await admin.auth().getUser(input.uid);
      await admin.auth().updateUser(user.uid, {
        password,
        displayName: input.displayName,
        emailVerified: true,
        disabled: false,
      });
      console.log(`  Firebase Auth updated: ${input.email}`);
      return;
    } catch (error) {
      if (errorCode(error) !== "auth/user-not-found") {
        throw error;
      }
    }

    try {
      await admin.auth().createUser({
        uid: input.uid,
        email: input.email,
        password,
        displayName: input.displayName,
        emailVerified: true,
      });
      console.log(`  Firebase Auth created: ${input.email}`);
    } catch (error) {
      if (errorCode(error) !== "auth/email-already-exists") {
        throw error;
      }
      const existing = await admin.auth().getUserByEmail(input.email);
      await admin.auth().updateUser(existing.uid, {
        password,
        displayName: input.displayName,
        emailVerified: true,
        disabled: false,
      });
      console.warn(
        `  email ${input.email} already exists as uid=${existing.uid}; ` +
          `expected ${input.uid}. Password updated; align DB firebaseUid if needed.`,
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`  Firebase Auth skipped for ${input.email}: ${message}`);
  }
}
