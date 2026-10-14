import { SEED, type SeedRole } from "./seed";

/**
 * Canonical revenue test fixture constants.
 *
 * Uses amounts that make calculation mistakes obvious:
 *   1000 + 2000 + 3000 = 6000
 *
 * Each amount is prime-friendly so partial-refund boundaries are crisp.
 */

export const REVENUE = {
  /** Adult monthly plan price from seed. */
  ADULT_MONTHLY_PRICE: 3500,
  /** Kid monthly plan price from seed. */
  KID_MONTHLY_PRICE: 2500,

  /**
   * Canonical transactions for the core revenue reconciliation test.
   *
   * Payment 1 → Student A → Batch A (beginner) → Trainer A → ₹1,000
   * Payment 2 → Student B → Batch A (beginner) → Trainer A → ₹2,000
   * Payment 3 → Student B → Batch B (kids)    → Trainer A → ₹3,000
   *
   * Expected totals:
   *   Overall  = ₹6,000
   *   Batch A  = ₹3,000
   *   Batch B  = ₹3,000
   *   Trainer A = ₹6,000 (both batches have Trainer A)
   */
  transactions: [
    {
      label: "Payment 1",
      amount: 1000,
      studentLabel: "Student A",
      batchId: SEED.beginnerBatchId,
      batchLabel: "Batch A (Beginner)",
      trainerId: SEED.users.TRAINER.id,
      trainerLabel: "Trainer A",
      planId: SEED.adultPlanIds[0],
    },
    {
      label: "Payment 2",
      amount: 2000,
      studentLabel: "Student B",
      batchId: SEED.beginnerBatchId,
      batchLabel: "Batch A (Beginner)",
      trainerId: SEED.users.TRAINER.id,
      trainerLabel: "Trainer A",
      planId: SEED.adultPlanIds[0],
    },
    {
      label: "Payment 3",
      amount: 3000,
      studentLabel: "Student B",
      batchId: SEED.kidsBatchId,
      batchLabel: "Batch B (Kids)",
      trainerId: SEED.users.TRAINER.id,
      trainerLabel: "Trainer A",
      planId: SEED.kidPlanIds[0],
    },
  ],

  /** Expected totals after all canonical transactions. */
  expectedTotals: {
    overallRevenue: 6000,
    batchA: {
      batchId: SEED.beginnerBatchId,
      collected: 3000,
      invoiceCount: 2,
    },
    batchB: {
      batchId: SEED.kidsBatchId,
      collected: 3000,
      invoiceCount: 1,
    },
    trainerA: {
      trainerId: SEED.users.TRAINER.id,
      collected: 6000,
    },
  },
} as const;

/** Seed role constants for convenience. */
export const ROLES = {
  OWNER: "OWNER" as SeedRole,
  STAFF: "STAFF" as SeedRole,
  TRAINER: "TRAINER" as SeedRole,
  TRAINER_2: "TRAINER_2" as SeedRole,
  STUDENT: "STUDENT" as SeedRole,
  PARENT: "PARENT" as SeedRole,
} as const;
