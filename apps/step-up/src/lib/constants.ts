/** Seed / e2e fixture studio only — never use in feature UI. Prefer useStudioId(). */
export const SEED_STUDIO_ID = "studio-seed-1";

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

export type DevUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  studioId: string | null;
  styles?: string[] | undefined;
  experienceLevel?: ExperienceLevel | null | undefined;
  scheduleVibe?: string[] | undefined;
  gender?: Gender | null | undefined;
  ageRange?: AgeRange | null | undefined;
  preferredBranchId?: string | null | undefined;
  onboardingCompletedAt?: string | null | undefined;
  photoUrl?: string | null | undefined;
};

export const DEV_USERS: Record<UserRole, DevUser> = {
  SYSTEM_ADMIN: {
    id: "system-admin-1",
    email: "admin@stepup.dev",
    name: "System Admin",
    role: "SYSTEM_ADMIN",
    studioId: null,
  },
  OWNER: {
    id: "owner-1",
    email: "owner@stepup.dev",
    name: "Studio Owner",
    role: "OWNER",
    studioId: SEED_STUDIO_ID,
  },
  STAFF: {
    id: "staff-1",
    email: "staff@stepup.dev",
    name: "Front Desk Staff",
    role: "STAFF",
    studioId: SEED_STUDIO_ID,
  },
  TRAINER: {
    id: "trainer-1",
    email: "trainer@stepup.dev",
    name: "Lead Trainer",
    role: "TRAINER",
    studioId: SEED_STUDIO_ID,
  },
  STUDENT: {
    id: "student-1",
    email: "student@stepup.dev",
    name: "Alex Student",
    role: "STUDENT",
    studioId: SEED_STUDIO_ID,
    styles: ["Hip Hop"],
    experienceLevel: "BEGINNER",
    scheduleVibe: ["weekday_evenings", "weekends"],
    gender: "FEMALE",
    ageRange: "TWENTY_TO_FORTY",
    preferredBranchId: "branch-main-1",
    onboardingCompletedAt: "2026-01-01T00:00:00.000Z",
  },
  PARENT: {
    id: "parent-1",
    email: "parent@stepup.dev",
    name: "Jamie Parent",
    role: "PARENT",
    studioId: SEED_STUDIO_ID,
  },
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

export function findDevUserByLogin(identifier: string): DevUser | undefined {
  const query = identifier.trim().toLowerCase();
  if (!query) {
    return undefined;
  }

  return Object.values(DEV_USERS).find((devUser) =>
    [
      devUser.email,
      devUser.email.split("@")[0] ?? "",
      devUser.id,
      devUser.role,
      devUser.name,
      ...(devUser.role === "SYSTEM_ADMIN" ? ["admin"] : []),
    ].some((candidate) => candidate.toLowerCase() === query),
  );
}

/** Maps username / id / role aliases to a Firebase email, or passes emails through. */
export function resolveLoginEmail(identifier: string): string {
  const match = findDevUserByLogin(identifier);
  if (match) {
    return match.email;
  }

  const trimmed = identifier.trim();
  if (trimmed.includes("@")) {
    return trimmed;
  }

  throw new Error(
    `Unknown username “${trimmed}”. Use an email, or try admin, owner, staff, trainer, student, parent, or trainer-1.`,
  );
}

export function isAuthBypassEnabled() {
  return import.meta.env.VITE_AUTH_BYPASS === "true";
}

export function getApiBaseUrl() {
  return import.meta.env.VITE_API_URL || "http://localhost:3000";
}
