/**
 * Mirror of `apps/step-up-api/prisma/seed-analytics.ts` IDs for local QA.
 * Not used by Playwright CI — analytics seed is a manual demo tenant.
 */
export const ANALYTICS_SEED = {
  studioId: "studio-analytics-1",
  kidsBatchId: "analytics-batch-kids-1",
  beginnerBatchId: "analytics-batch-beginner-1",
  trialBatchId: "analytics-batch-trial-1",
  completedBatchId: "analytics-batch-completed-1",
  users: {
    OWNER: {
      id: "analytics-owner-1",
      email: "analytics-owner@stepup.dev",
      name: "Analytics Studio Owner",
      role: "OWNER" as const,
      studioId: "studio-analytics-1",
    },
    STAFF: {
      id: "analytics-staff-1",
      email: "analytics-staff@stepup.dev",
      name: "Analytics Front Desk",
      role: "STAFF" as const,
      studioId: "studio-analytics-1",
    },
    TRAINER: {
      id: "analytics-trainer-1",
      email: "analytics-trainer@stepup.dev",
      name: "Analytics Lead Trainer",
      role: "TRAINER" as const,
      studioId: "studio-analytics-1",
    },
    TRAINER_2: {
      id: "analytics-trainer-2",
      email: "analytics-trainer-2@stepup.dev",
      name: "Analytics Second Trainer",
      role: "TRAINER" as const,
      studioId: "studio-analytics-1",
    },
  },
} as const;
