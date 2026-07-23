export const SEED = {
  sessionAttendanceId: "session-kids-mon",
  users: {
    OWNER: {
      id: "owner-1",
      email: "owner@stepup.dev",
      name: "Studio Owner",
      role: "OWNER" as const,
      studioId: "studio-seed-1",
    },
    STAFF: {
      id: "staff-1",
      email: "staff@stepup.dev",
      name: "Front Desk Staff",
      role: "STAFF" as const,
      studioId: "studio-seed-1",
    },
    TRAINER: {
      id: "trainer-1",
      email: "trainer@stepup.dev",
      name: "Lead Trainer",
      role: "TRAINER" as const,
      studioId: "studio-seed-1",
    },
    STUDENT: {
      id: "student-1",
      email: "student@stepup.dev",
      name: "Alex Student",
      role: "STUDENT" as const,
      studioId: "studio-seed-1",
      styles: ["Hip Hop"],
      experienceLevel: "BEGINNER" as const,
      scheduleVibe: ["weekday_evenings", "weekends"],
      gender: "FEMALE" as const,
      ageRange: "TWENTY_TO_FORTY" as const,
      preferredBranchId: "branch-main-1",
      onboardingCompletedAt: "2026-01-01T00:00:00.000Z",
    },
    PARENT: {
      id: "parent-1",
      email: "parent@stepup.dev",
      name: "Jamie Parent",
      role: "PARENT" as const,
      studioId: "studio-seed-1",
    },
  },
} as const;

export type SeedRole = keyof typeof SEED.users;

export const AUTH_STORAGE_KEY = "step-up-dev-user";

export function apiBaseUrl() {
  return process.env.STEP_UP_API_URL ?? "http://localhost:3199";
}

export function webBaseUrl() {
  return process.env.STEP_UP_WEB_URL ?? "http://localhost:5199";
}

export function bearerFor(role: SeedRole) {
  const user = SEED.users[role];
  return `dev:${user.role}:${user.id}`;
}
