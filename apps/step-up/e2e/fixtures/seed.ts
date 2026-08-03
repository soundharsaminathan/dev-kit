export const SEED = {
  studioId: "studio-e2e-1",
  branchMainId: "e2e-branch-main-1",
  branchEastId: "e2e-branch-east-1",
  adultPlanIds: [
    "e2e-sub-individual-adult-monthly",
    "e2e-sub-individual-adult-quarterly",
  ] as const,
  kidPlanIds: [
    "e2e-sub-individual-kid-monthly",
    "e2e-sub-individual-kid-quarterly",
  ] as const,
  kidsBatchId: "e2e-batch-kids-1",
  beginnerBatchId: "e2e-batch-beginner-1",
  trialBatchId: "e2e-batch-trial-1",
  sessionAttendanceId: "e2e-session-kids-mon",
  sessionAttendancePastId: "e2e-session-kids-past-1",
  users: {
    SYSTEM_ADMIN: {
      id: "e2e-system-admin-1",
      email: "e2e-admin@stepup.dev",
      name: "E2E System Admin",
      role: "SYSTEM_ADMIN" as const,
      studioId: null as string | null,
    },
    OWNER: {
      id: "e2e-owner-1",
      email: "e2e-owner@stepup.dev",
      name: "Studio Owner",
      role: "OWNER" as const,
      studioId: "studio-e2e-1",
    },
    STAFF: {
      id: "e2e-staff-1",
      email: "e2e-staff@stepup.dev",
      name: "Front Desk Staff",
      role: "STAFF" as const,
      studioId: "studio-e2e-1",
    },
    TRAINER: {
      id: "e2e-trainer-1",
      email: "e2e-trainer@stepup.dev",
      name: "Lead Trainer",
      role: "TRAINER" as const,
      studioId: "studio-e2e-1",
    },
    TRAINER_2: {
      id: "e2e-trainer-2",
      email: "e2e-trainer-2@stepup.dev",
      name: "Second Trainer",
      role: "TRAINER" as const,
      studioId: "studio-e2e-1",
    },
    STUDENT: {
      id: "e2e-student-1",
      email: "e2e-student@stepup.dev",
      name: "Alex Student",
      role: "STUDENT" as const,
      studioId: "studio-e2e-1",
      styles: ["Hip Hop"],
      experienceLevel: "BEGINNER" as const,
      scheduleVibe: ["weekday_evenings", "weekends"],
      gender: "FEMALE" as const,
      ageRange: "TWENTY_TO_FORTY" as const,
      preferredBranchId: "e2e-branch-main-1",
      onboardingCompletedAt: "2026-01-01T00:00:00.000Z",
    },
    PARENT: {
      id: "e2e-parent-1",
      email: "e2e-parent@stepup.dev",
      name: "Jamie Parent",
      role: "PARENT" as const,
      studioId: "studio-e2e-1",
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
