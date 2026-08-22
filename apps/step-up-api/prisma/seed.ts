import "dotenv/config";
import { ConfigService } from "@nestjs/config";
import { PrismaClient, ProfileVisibility, UserRole } from "@prisma/client";
import * as admin from "firebase-admin";
import { UserCryptoService } from "../src/users/user-crypto.service";

const prisma = new PrismaClient();
const crypto = new UserCryptoService(new ConfigService());

const SEED_PASSWORD = "password";

const SYSTEM_ADMIN = {
  id: "system-admin-1",
  firebaseUid: "dev-system-admin-1",
  email: "admin@stepup.dev",
  name: "System Admin",
  phone: "+91 98000 00000",
  bio: "Platform administrator.",
} as const;

async function ensureFirebaseApp() {
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

async function syncFirebasePassword() {
  const ready = await ensureFirebaseApp();
  if (!ready) {
    console.warn(
      "  Firebase Admin not configured — skipped seeding Auth password.",
    );
    return;
  }

  try {
    let user: admin.auth.UserRecord;
    try {
      user = await admin.auth().getUserByEmail(SYSTEM_ADMIN.email);
      user = await admin.auth().updateUser(user.uid, {
        password: SEED_PASSWORD,
        displayName: SYSTEM_ADMIN.name,
        emailVerified: true,
      });
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
      user = await admin.auth().createUser({
        email: SYSTEM_ADMIN.email,
        password: SEED_PASSWORD,
        displayName: SYSTEM_ADMIN.name,
        emailVerified: true,
      });
    }

    await prisma.user.update({
      where: { id: SYSTEM_ADMIN.id },
      data: { firebaseUid: user.uid },
    });
    console.log(`  Firebase Auth ready: ${SYSTEM_ADMIN.email}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(
      `  Firebase Auth skipped for ${SYSTEM_ADMIN.email}: ${message}`,
    );
  }
}

async function main() {
  const sealed = crypto.sealPii({
    email: SYSTEM_ADMIN.email,
    name: SYSTEM_ADMIN.name,
    phone: SYSTEM_ADMIN.phone,
    bio: SYSTEM_ADMIN.bio,
    instagramUrl: null,
    guardianName: null,
    alternateMobile: null,
  });

  await prisma.user.upsert({
    where: { id: SYSTEM_ADMIN.id },
    update: {
      ...sealed,
      role: UserRole.SYSTEM_ADMIN,
      studioId: null,
      styles: [],
      profileVisibility: ProfileVisibility.PRIVATE,
      active: true,
      mustChangePassword: false,
    },
    create: {
      id: SYSTEM_ADMIN.id,
      firebaseUid: SYSTEM_ADMIN.firebaseUid,
      ...sealed,
      role: UserRole.SYSTEM_ADMIN,
      studioId: null,
      styles: [],
      profileVisibility: ProfileVisibility.PRIVATE,
      active: true,
      mustChangePassword: false,
    },
  });

  const { seedFeatureCatalog } = await import("./seed-features");
  await seedFeatureCatalog(prisma);

  console.log("Seed complete.");
  console.log(`  System admin: ${SYSTEM_ADMIN.email} / ${SEED_PASSWORD}`);
  console.log(
    "  Auth bypass: Bearer dev:SYSTEM_ADMIN:system-admin-1 with AUTH_BYPASS=true",
  );
  console.log(
    "  Demo studio data: use pnpm prisma:seed:e2e (or create studios from /admin).",
  );

  await syncFirebasePassword();
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
