import "dotenv/config";
import * as admin from "firebase-admin";

/**
 * Ensures Firebase Auth email/password accounts exist for smoke roles with
 * fixed UIDs matching prisma/seed-smoke.ts. Never deletes accounts.
 *
 *   pnpm --filter @step-up/api smoke:provision-users
 */

const USERS = [
  {
    uid: "smoke-system-admin-1",
    email: "smoke-admin@stepup.dev",
    displayName: "Smoke System Admin",
  },
  {
    uid: "smoke-owner-1",
    email: "smoke-owner@stepup.dev",
    displayName: "Smoke Studio Owner",
  },
  {
    uid: "smoke-staff-1",
    email: "smoke-staff@stepup.dev",
    displayName: "Smoke Front Desk",
  },
  {
    uid: "smoke-trainer-1",
    email: "smoke-trainer@stepup.dev",
    displayName: "Smoke Lead Trainer",
  },
  {
    uid: "smoke-student-1",
    email: "smoke-student@stepup.dev",
    displayName: "Smoke Alex Student",
  },
  {
    uid: "smoke-parent-1",
    email: "smoke-parent@stepup.dev",
    displayName: "Smoke Jamie Parent",
  },
  {
    uid: "smoke-onboarding-1",
    email: "smoke-onboarding@stepup.dev",
    displayName: "Smoke New Dancer",
  },
] as const;

function initFirebase() {
  if (admin.apps.length > 0) return;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY are required",
    );
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
}

async function ensureUser(input: {
  uid: string;
  email: string;
  displayName: string;
  password: string;
}) {
  const email = input.email.trim().toLowerCase();
  try {
    await admin.auth().getUser(input.uid);
    await admin.auth().updateUser(input.uid, {
      email,
      password: input.password,
      displayName: input.displayName,
      emailVerified: true,
      disabled: false,
    });
    console.log(`updated ${input.uid} (${email})`);
    return;
  } catch (error) {
    const code =
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      typeof (error as { code: unknown }).code === "string"
        ? (error as { code: string }).code
        : null;
    if (code !== "auth/user-not-found") {
      throw error;
    }
  }

  try {
    await admin.auth().createUser({
      uid: input.uid,
      email,
      password: input.password,
      displayName: input.displayName,
      emailVerified: true,
    });
    console.log(`created ${input.uid} (${email})`);
  } catch (error) {
    const code =
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      typeof (error as { code: unknown }).code === "string"
        ? (error as { code: string }).code
        : null;
    if (code !== "auth/email-already-exists") {
      throw error;
    }
    // Email exists under a different UID — reclaim by updating that user and
    // recording the mismatch clearly so seed firebaseUid can be corrected.
    const existing = await admin.auth().getUserByEmail(email);
    await admin.auth().updateUser(existing.uid, {
      password: input.password,
      displayName: input.displayName,
      emailVerified: true,
      disabled: false,
    });
    console.warn(
      `email ${email} already exists as uid=${existing.uid}; expected ${input.uid}. Updated password; align DB firebaseUid if needed.`,
    );
  }
}

async function main() {
  const password = process.env.STEP_UP_SMOKE_PASSWORD;
  if (!password) {
    throw new Error("STEP_UP_SMOKE_PASSWORD is required");
  }

  initFirebase();

  for (const user of USERS) {
    await ensureUser({ ...user, password });
  }

  console.log(`Provisioned ${USERS.length} smoke Firebase users`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
