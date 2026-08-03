import { UserRole } from "@prisma/client";

export const STUDIO_ID = "studio-seed-1";

export const FIXTURE_USERS = {
  systemAdmin: {
    id: "system-admin-1",
    email: "admin@stepup.dev",
    name: "System Admin",
    role: UserRole.SYSTEM_ADMIN,
    studioId: null as string | null,
  },
  owner: {
    id: "owner-1",
    email: "owner@stepup.dev",
    name: "Studio Owner",
    role: UserRole.OWNER,
    studioId: STUDIO_ID,
  },
  staff: {
    id: "staff-1",
    email: "staff@stepup.dev",
    name: "Front Desk Staff",
    role: UserRole.STAFF,
    studioId: STUDIO_ID,
  },
  trainer: {
    id: "trainer-1",
    email: "trainer@stepup.dev",
    name: "Lead Trainer",
    role: UserRole.TRAINER,
    studioId: STUDIO_ID,
  },
  student: {
    id: "student-1",
    email: "student@stepup.dev",
    name: "Alex Student",
    role: UserRole.STUDENT,
    studioId: STUDIO_ID,
  },
  parent: {
    id: "parent-1",
    email: "parent@stepup.dev",
    name: "Jamie Parent",
    role: UserRole.PARENT,
    studioId: STUDIO_ID,
  },
} as const;

export function makeUser(
  role: keyof typeof FIXTURE_USERS,
  overrides: Record<string, unknown> = {},
) {
  return { ...FIXTURE_USERS[role], ...overrides };
}
