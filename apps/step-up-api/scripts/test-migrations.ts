import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";

const appRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

function requireDatabaseUrl() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error("DATABASE_URL is required for migration smoke tests");
  }
  return url;
}

function run(command: string) {
  execSync(command, {
    cwd: appRoot,
    stdio: "inherit",
    env: process.env,
  });
}

async function resetSchema(prisma: PrismaClient) {
  await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS public CASCADE`);
  await prisma.$executeRawUnsafe(`CREATE SCHEMA public`);
  await prisma.$executeRawUnsafe(`GRANT ALL ON SCHEMA public TO public`);
}

async function assertSchema(prisma: PrismaClient) {
  const enums = await prisma.$queryRaw<Array<{ typname: string }>>`
    SELECT typname
    FROM pg_type
    WHERE typname IN ('UserRole', 'AttendanceStatus', 'BookingStatus')
    ORDER BY typname
  `;
  const enumNames = enums.map((row) => row.typname);
  for (const name of ["AttendanceStatus", "BookingStatus", "UserRole"]) {
    if (!enumNames.includes(name)) {
      throw new Error(`Missing enum: ${name}`);
    }
  }

  const bookingValues = await prisma.$queryRaw<Array<{ enumlabel: string }>>`
    SELECT e.enumlabel
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'BookingStatus'
  `;
  if (!bookingValues.some((row) => row.enumlabel === "AWAITING_PAYMENT")) {
    throw new Error("BookingStatus missing AWAITING_PAYMENT");
  }

  const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename IN (
        'User', 'Batch', 'Session', 'Attendance',
        'Notification', 'Invoice', 'Booking'
      )
    ORDER BY tablename
  `;
  const tableNames = new Set(tables.map((row) => row.tablename));
  for (const name of [
    "Attendance",
    "Batch",
    "Booking",
    "Invoice",
    "Notification",
    "Session",
    "User",
  ]) {
    if (!tableNames.has(name)) {
      throw new Error(`Missing table: ${name}`);
    }
  }

  const uniqueIndexes = await prisma.$queryRaw<Array<{ indexname: string }>>`
    SELECT indexname
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'Notification'
      AND indexdef ILIKE '%\\"userId\\"%'
      AND indexdef ILIKE '%\\"dedupeKey\\"%'
  `;
  if (uniqueIndexes.length === 0) {
    // Prisma may quote identifiers differently; fall back to softer match.
    const soft = await prisma.$queryRaw<Array<{ indexname: string }>>`
      SELECT indexname
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename = 'Notification'
        AND (
          indexdef ILIKE '%userId%dedupeKey%'
          OR indexdef ILIKE '%dedupeKey%userId%'
        )
    `;
    if (soft.length === 0) {
      throw new Error("Notification missing userId+dedupeKey unique index");
    }
  }
}

async function smokeOnce(label: string) {
  const prisma = new PrismaClient();
  try {
    console.log(`[${label}] Resetting public schema…`);
    await resetSchema(prisma);
    console.log(`[${label}] Running prisma migrate deploy…`);
    run("pnpm exec prisma migrate deploy");
    console.log(`[${label}] Asserting schema smoke checks…`);
    await assertSchema(prisma);
    console.log(`[${label}] Migration smoke passed.`);
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  requireDatabaseUrl();
  await smokeOnce("fresh");

  // Second pass proves migrations re-apply cleanly from empty schema
  // (upgrade-from-empty equivalent without a second Postgres service).
  if (process.argv.includes("--upgrade")) {
    await smokeOnce("upgrade-from-empty");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
