/** Seed / e2e fixture studio only — never use in feature UI. Prefer useStudioId(). */
export const SEED_STUDIO_ID = "studio-seed-1";

/** Shared password for the seeded system admin (Firebase + bypass form default). */
export const SEED_PASSWORD = "password";

/** @deprecated Use SEED_STUDIO_ID for fixtures or useStudioId() in UI. */
export const STUDIO_ID = SEED_STUDIO_ID;

export type UserRole =
  | "SYSTEM_ADMIN"
  | "OWNER"
  | "STAFF"
  | "TRAINER"
  | "STUDENT"
  | "PARENT";

export type ExperienceLevel =
  | "BEGINNER"
  | "SOME_EXPERIENCE"
  | "INTERMEDIATE"
  | "ADVANCED";

export type Gender = "FEMALE" | "MALE";

export type AgeRange =
  | "UNDER_10"
  | "TEN_TO_TWENTY"
  | "TWENTY_TO_FORTY"
  | "FORTY_PLUS";

/** Only seeded local account — other users are created from /admin. */
export const SEED_SYSTEM_ADMIN = {
  id: "system-admin-1",
  email: "admin@stepup.dev",
  name: "System Admin",
  role: "SYSTEM_ADMIN" as const satisfies UserRole,
  studioId: null as string | null,
};

export const STAFF_ROLES: UserRole[] = ["OWNER", "STAFF", "TRAINER"];
/** Studio admin ops — invites, billing writes, student directory, catalog. */
export const ADMIN_ROLES: UserRole[] = ["OWNER", "STAFF"];
export const MEMBER_ROLES: UserRole[] = ["STUDENT", "PARENT"];
export const SYSTEM_ADMIN_ROLES: UserRole[] = ["SYSTEM_ADMIN"];

export function isAdminRole(role: UserRole | undefined): boolean {
  return role !== undefined && ADMIN_ROLES.includes(role);
}

export function isSystemAdminRole(role: UserRole | undefined): boolean {
  return role === "SYSTEM_ADMIN";
}

function isSystemAdminLogin(identifier: string): boolean {
  const query = identifier.trim().toLowerCase();
  if (!query) {
    return false;
  }
  return [
    SEED_SYSTEM_ADMIN.email,
    "admin",
    SEED_SYSTEM_ADMIN.id,
    "system_admin",
    SEED_SYSTEM_ADMIN.name.toLowerCase(),
  ].includes(query);
}

/** Maps admin aliases to the seeded email, or passes emails through. */
export function resolveLoginEmail(identifier: string): string {
  if (isSystemAdminLogin(identifier)) {
    return SEED_SYSTEM_ADMIN.email;
  }

  const trimmed = identifier.trim();
  if (trimmed.includes("@")) {
    return trimmed;
  }

  throw new Error(
    `Unknown username “${trimmed}”. Use an email, or admin for the seeded system admin.`,
  );
}

export function isAuthBypassEnabled() {
  return import.meta.env.VITE_AUTH_BYPASS === "true";
}

export function getApiBaseUrl() {
  return import.meta.env.VITE_API_URL || "http://localhost:3000";
}
