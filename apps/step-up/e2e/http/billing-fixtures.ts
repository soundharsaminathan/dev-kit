import { expect } from "@playwright/test";
import {
  batchCreateBody,
  type CalendarKind,
  canJoinPostpaidNow,
  isScheduleConflict,
  markableSessionId,
  scheduleJsonFor,
} from "../fixtures/billing-calendar";
import { SEED } from "../fixtures/seed";
import type { TestDataCleanup } from "../fixtures/test-cleanup";
import { createHttpStudent, expectOk, fetchRosterRows } from "./helpers";

export { canJoinPostpaidNow, fetchRosterRows, markableSessionId };

export const ADULT_MONTHLY_PRICE = 3500;
export const KID_MONTHLY_PRICE = 2500;

const SEED_BATCH_IDS = new Set([
  SEED.beginnerBatchId,
  SEED.kidsBatchId,
  SEED.trialBatchId,
]);

export type InvoiceLite = {
  id: string;
  status: string;
  amount: number;
  chargeType?: string;
  membershipId?: string | null;
  canConvertToQuarterly?: boolean;
};

export type BatchSession = { id: string; startsAt: string };

export type CalendarEnrollment = {
  student: { id: string; email?: string; name?: string };
  batch: { id: string };
  batchId: string;
  invoice: InvoiceLite | null;
  billingKind?: string;
  planId: string;
  sessions: BatchSession[];
};

type Category = "ADULTS" | "KIDS";

type StudentOpts = {
  studentName?: string;
  studentId?: string;
  category?: Category;
};

function planIdFor(category: Category, planId?: string) {
  return (
    planId ?? (category === "KIDS" ? SEED.kidPlanIds[0] : SEED.adultPlanIds[0])
  );
}

function categoryFor(options: { category?: Category; planId?: string } = {}) {
  if (options.category) return options.category;
  return options.planId?.includes("kid") ? "KIDS" : "ADULTS";
}

async function resolveStudent(
  cleanup: TestDataCleanup,
  options: StudentOpts = {},
) {
  const category = options.category ?? "ADULTS";
  if (options.studentId) {
    return { id: options.studentId };
  }
  return createHttpStudent(
    options.studentName ??
      (category === "KIDS" ? "Calendar Kid" : "Calendar Student"),
    cleanup,
    {
      ageRange: category === "KIDS" ? "UNDER_10" : "TWENTY_TO_FORTY",
    },
  );
}

export async function listBatchSessions(batchId: string) {
  const header = await expectOk<{ sessions?: BatchSession[] }>(
    "STAFF",
    `/batches/${batchId}`,
  );
  return header.sessions ?? [];
}

export async function createCalendarBatch(
  cleanup: TestDataCleanup,
  options: {
    kind: CalendarKind;
    category?: Category;
    name?: string;
    capacity?: number;
    enrollmentMode?: "SELF_JOIN" | "STAFF_ONLY";
  },
) {
  const category = options.category ?? "ADULTS";
  if (options.kind === "postpaid" && !canJoinPostpaidNow()) {
    throw new Error(
      "UTC 1st is always prepaid-at-join; skip postpaid fixture cases",
    );
  }

  const trainers = [SEED.users.TRAINER.id, SEED.users.TRAINER_2.id];
  const branches = [SEED.branchMainId, SEED.branchEastId];
  let lastError: unknown;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const stamp =
      Date.now() + attempt * 97_000 + Math.floor(Math.random() * 1_000);
    const name =
      options.name ??
      `${options.kind === "prepaid" ? "Prepaid" : "Postpaid"} ${category} ${stamp}`;
    try {
      const created = await expectOk<{ id: string }>("STAFF", "/batches", {
        method: "POST",
        body: JSON.stringify(
          batchCreateBody({
            studioId: SEED.users.STAFF.studioId,
            branchId: branches[attempt % branches.length],
            trainerId: trainers[Math.floor(attempt / 2) % trainers.length],
            name,
            category,
            scheduleJson: scheduleJsonFor(options.kind, stamp),
            subscriptionIds:
              category === "KIDS" ? SEED.kidPlanIds : SEED.adultPlanIds,
            capacity: options.capacity,
            enrollmentMode: options.enrollmentMode,
          }),
        ),
      });
      cleanup.trackBatch(created.id);
      return created;
    } catch (error) {
      lastError = error;
      if (!isScheduleConflict(error)) {
        throw error;
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`Could not create ${options.kind} calendar batch`);
}

export async function staffEnroll(
  batchId: string,
  studentId: string,
  planId: string,
) {
  return expectOk<{
    batchId: string;
    studentId: string;
    invoice: InvoiceLite | null;
    billingKind?: string;
  }>("STAFF", `/batches/${batchId}/enroll`, {
    method: "POST",
    body: JSON.stringify({ studentId, subscriptionId: planId }),
  });
}

async function enrollOnBatch(
  cleanup: TestDataCleanup,
  batch: { id: string },
  options: StudentOpts & { planId?: string } = {},
): Promise<CalendarEnrollment> {
  const category = categoryFor(options);
  const planId = planIdFor(category, options.planId);
  const student = await resolveStudent(cleanup, { ...options, category });
  const enrollment = await staffEnroll(batch.id, student.id, planId);
  const sessions = await listBatchSessions(batch.id);
  return {
    student,
    batch,
    batchId: batch.id,
    invoice: enrollment.invoice,
    billingKind: enrollment.billingKind,
    planId,
    sessions,
  };
}

export async function enrollPrepaid(
  cleanup: TestDataCleanup,
  options: StudentOpts & {
    planId?: string;
    batchId?: string;
    studentName?: string;
  } = {},
): Promise<CalendarEnrollment & { invoice: InvoiceLite }> {
  const category = categoryFor(options);
  const ownedBatchId =
    options.batchId && !SEED_BATCH_IDS.has(options.batchId)
      ? options.batchId
      : undefined;
  const batch = ownedBatchId
    ? { id: ownedBatchId }
    : await createCalendarBatch(cleanup, {
        kind: "prepaid",
        category,
        name: options.studentName
          ? `Prepaid ${options.studentName}`
          : undefined,
      });
  const enrolled = await enrollOnBatch(cleanup, batch, {
    ...options,
    category,
  });
  expect(enrolled.billingKind, "staff enroll on prepaid batch").toBe("prepaid");
  expect(
    enrolled.invoice,
    "prepaid-at-join should create an invoice",
  ).toBeTruthy();
  expect(enrolled.invoice?.status).toBe("PENDING");
  return { ...enrolled, invoice: enrolled.invoice! };
}

export async function enrollPostpaid(
  cleanup: TestDataCleanup,
  options: StudentOpts & { planId?: string } = {},
) {
  const category = categoryFor(options);
  const batch = await createCalendarBatch(cleanup, {
    kind: "postpaid",
    category,
  });
  const enrolled = await enrollOnBatch(cleanup, batch, {
    ...options,
    category,
  });
  expect(enrolled.billingKind).toBe("postpaid");
  expect(enrolled.invoice).toBeNull();
  return enrolled;
}

/**
 * Unpaid + markable session: prepaid invoice on owned batch A, switch onto
 * owned in-progress batch B (product switch, not seed).
 */
export async function enrollUnpaidOnPostpaidBatch(
  cleanup: TestDataCleanup,
  options: StudentOpts & { planId?: string } = {},
) {
  const category = categoryFor(options);
  const prepaid = await enrollPrepaid(cleanup, { ...options, category });
  const dest = await createCalendarBatch(cleanup, {
    kind: "postpaid",
    category,
    name: `Switch Dest ${Date.now()}`,
  });
  await expectOk("STAFF", `/batches/${prepaid.batchId}/switch`, {
    method: "POST",
    body: JSON.stringify({
      studentId: prepaid.student.id,
      toBatchId: dest.id,
    }),
  });
  const sessions = await listBatchSessions(dest.id);
  return {
    ...prepaid,
    batch: dest,
    batchId: dest.id,
    sourceBatchId: prepaid.batchId,
    sessions,
    sessionId: markableSessionId(sessions),
  };
}

export async function markPaid(invoiceId: string, method = "CASH") {
  return expectOk<{
    id: string;
    status: string;
    amount: number;
    subtotal?: number;
    referralDiscount?: number;
    studioDiscount?: number;
    refundedAmount?: number;
    platformFeeComputed?: number;
  }>("STAFF", `/billing/${invoiceId}/paid`, {
    method: "PATCH",
    body: JSON.stringify({ paymentMethod: method }),
  });
}

export async function abandonInvoice(studentId: string, invoiceId: string) {
  return expectOk<{ id: string; status: string }>(
    "STUDENT",
    `/billing/${invoiceId}/abandon-payment`,
    { method: "POST", body: "{}" },
    { userId: studentId },
  );
}
