/**
 * Canonical IDs for the deployed smoke suite.
 * Must stay in sync with apps/step-up-api/prisma/seed-smoke.ts.
 */
export const SMOKE = {
  studioId: "studio-smoke-1",
  branchMainId: "smoke-branch-main-1",
  branchEastId: "smoke-branch-east-1",
  adultMonthlyId: "smoke-sub-individual-adult-monthly",
  adultQuarterlyId: "smoke-sub-individual-adult-quarterly",
  kidMonthlyId: "smoke-sub-individual-kid-monthly",
  kidQuarterlyId: "smoke-sub-individual-kid-quarterly",
  kidsBatchId: "smoke-batch-kids-1",
  beginnerBatchId: "smoke-batch-beginner-1",
  trialBatchId: "smoke-batch-trial-1",
  sessionAttendanceId: "smoke-session-kids-mon",
  sessionAttendancePastId: "smoke-session-kids-past-1",
  membershipStudentId: "smoke-membership-student-1",
  invoicePendingId: "smoke-invoice-pending-1",
  bookingPendingId: "smoke-booking-pending-1",
  certificateTemplateId: "smoke-cert-template-1",
  contestId: "smoke-contest-1",
  conversationId: "smoke-conversation-dm-1",
  postId: "smoke-post-1",
  adultPlanIds: [
    "smoke-sub-individual-adult-monthly",
    "smoke-sub-individual-adult-quarterly",
  ] as const,
  kidPlanIds: [
    "smoke-sub-individual-kid-monthly",
    "smoke-sub-individual-kid-quarterly",
  ] as const,
  users: {
    SYSTEM_ADMIN: {
      id: "smoke-system-admin-1",
      firebaseUid: "smoke-system-admin-1",
      email: "smoke-admin@stepup.dev",
      name: "Smoke System Admin",
      role: "SYSTEM_ADMIN" as const,
      studioId: null as string | null,
    },
    OWNER: {
      id: "smoke-owner-1",
      firebaseUid: "smoke-owner-1",
      email: "smoke-owner@stepup.dev",
      name: "Smoke Studio Owner",
      role: "OWNER" as const,
      studioId: "studio-smoke-1",
    },
    STAFF: {
      id: "smoke-staff-1",
      firebaseUid: "smoke-staff-1",
      email: "smoke-staff@stepup.dev",
      name: "Smoke Front Desk",
      role: "STAFF" as const,
      studioId: "studio-smoke-1",
    },
    TRAINER: {
      id: "smoke-trainer-1",
      firebaseUid: "smoke-trainer-1",
      email: "smoke-trainer@stepup.dev",
      name: "Smoke Lead Trainer",
      role: "TRAINER" as const,
      studioId: "studio-smoke-1",
    },
    STUDENT: {
      id: "smoke-student-1",
      firebaseUid: "smoke-student-1",
      email: "smoke-student@stepup.dev",
      name: "Smoke Alex Student",
      role: "STUDENT" as const,
      studioId: "studio-smoke-1",
    },
    PARENT: {
      id: "smoke-parent-1",
      firebaseUid: "smoke-parent-1",
      email: "smoke-parent@stepup.dev",
      name: "Smoke Jamie Parent",
      role: "PARENT" as const,
      studioId: "studio-smoke-1",
    },
    ONBOARDING: {
      id: "smoke-onboarding-1",
      firebaseUid: "smoke-onboarding-1",
      email: "smoke-onboarding@stepup.dev",
      name: "Smoke New Dancer",
      role: "STUDENT" as const,
      studioId: "studio-smoke-1",
    },
  },
} as const;

export type SmokeRole = keyof typeof SMOKE.users;

export function smokePassword() {
  const password = process.env.STEP_UP_SMOKE_PASSWORD;
  if (!password) {
    throw new Error("STEP_UP_SMOKE_PASSWORD is required for smoke tests");
  }
  return password;
}

export function apiBaseUrl() {
  return process.env.STEP_UP_API_URL ?? "https://api.step-up.example";
}

export function webBaseUrl() {
  return process.env.STEP_UP_WEB_URL ?? "https://step-up.pages.dev";
}

export function homePathForRole(role: SmokeRole) {
  if (role === "SYSTEM_ADMIN") return "/admin";
  if (role === "STUDENT" || role === "PARENT" || role === "ONBOARDING") {
    return "/me";
  }
  return "/app";
}
