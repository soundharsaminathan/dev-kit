import { expect, test } from "@playwright/test";
import { canJoinPostpaidNow } from "../fixtures/billing-calendar";
import { SEED } from "../fixtures/seed";
import {
  ADULT_MONTHLY_PRICE,
  abandonInvoice,
  createCalendarBatch,
  enrollPostpaid,
  enrollPrepaid,
  enrollUnpaidOnPostpaidBatch,
  fetchRosterRows,
  markableSessionId,
  markPaid,
  staffEnroll,
} from "./billing-fixtures";
import {
  createHttpStudent,
  expectOk,
  expectStatus,
  TestDataCleanup,
} from "./helpers";

test.describe("billing calendar HTTP @http", () => {
  test("prepaid-at-join creates PREPAID_FULL invoice, seats the student, and flags monthlyUnpaid @http", async () => {
    const cleanup = new TestDataCleanup();
    try {
      const enrolled = await enrollPrepaid(cleanup, {
        studentName: "Calendar Prepaid Join",
      });
      expect(enrolled.billingKind).toBe("prepaid");
      expect(enrolled.invoice.status).toBe("PENDING");
      expect(Number(enrolled.invoice.amount)).toBe(ADULT_MONTHLY_PRICE);

      const invoice = await expectOk<{
        chargeType: string;
        membershipId: string | null;
      }>("STAFF", `/billing/${enrolled.invoice.id}`);
      expect(invoice.chargeType).toBe("PREPAID_FULL");
      expect(invoice.membershipId).toBeTruthy();

      const memberships = await expectOk<
        Array<{
          billingPhase?: string;
          status: string;
          batchId?: string | null;
        }>
      >("STAFF", `/memberships/student/${enrolled.student.id}`);
      expect(
        memberships.some(
          (row) => row.billingPhase === "PREPAID" && row.status === "ACTIVE",
        ),
      ).toBe(true);

      const active = await fetchRosterRows(enrolled.batchId, "active");
      const row = active.find((item) => item.studentId === enrolled.student.id);
      expect(row).toBeTruthy();
      expect(row?.monthlyUnpaid).toBe(true);
    } finally {
      await cleanup.dispose();
    }
  });

  test("mid-month enroll creates PREPAID_PRORATED when sessions remain @http", async () => {
    test.skip(!canJoinPostpaidNow(), "UTC 1st is always prepaid-at-join");
    const cleanup = new TestDataCleanup();
    try {
      const enrolled = await enrollPostpaid(cleanup, {
        studentName: "Calendar Mid-month Join",
      });
      expect(enrolled.billingKind).toBe("postpaid");
      expect(enrolled.invoice).toBeTruthy();
      expect(enrolled.invoice?.status).toBe("PENDING");

      const invoice = await expectOk<{
        chargeType: string;
        attendedSessionCount: number | null;
        billedSessionCount: number | null;
      }>("STAFF", `/billing/${enrolled.invoice!.id}`);
      expect(invoice.chargeType).toBe("PREPAID_PRORATED");
      expect(invoice.billedSessionCount).toBeGreaterThan(0);
      expect(invoice.attendedSessionCount).toBeGreaterThan(0);
      expect(invoice.attendedSessionCount!).toBeLessThanOrEqual(
        invoice.billedSessionCount!,
      );

      const memberships = await expectOk<
        Array<{ billingPhase?: string; status: string }>
      >("STAFF", `/memberships/student/${enrolled.student.id}`);
      expect(
        memberships.some((row) => row.billingPhase === "FIRST_POSTPAID"),
      ).toBe(true);

      const active = await fetchRosterRows(enrolled.batchId, "active");
      expect(
        active.find((row) => row.studentId === enrolled.student.id)
          ?.monthlyUnpaid,
      ).toBe(true);
    } finally {
      await cleanup.dispose();
    }
  });

  test("mid-month enrollee is monthlyUnpaid and can still be marked present @http", async () => {
    test.skip(!canJoinPostpaidNow(), "UTC 1st is always prepaid-at-join");
    const cleanup = new TestDataCleanup();
    try {
      const enrolled = await enrollPostpaid(cleanup, {
        studentName: "Calendar Mid-month Mark",
      });
      expect(enrolled.invoice).toBeTruthy();

      const roster = await expectOk<
        Array<{ studentId: string; monthlyUnpaid?: boolean }>
      >(
        "TRAINER",
        `/attendance/session/${markableSessionId(enrolled.sessions)}/roster`,
      );
      expect(
        roster.find((row) => row.studentId === enrolled.student.id)
          ?.monthlyUnpaid,
      ).toBe(true);

      const marked = await expectOk<{ status: string }>(
        "TRAINER",
        "/attendance/mark",
        {
          method: "POST",
          body: JSON.stringify({
            sessionId: markableSessionId(enrolled.sessions),
            studentId: enrolled.student.id,
            status: "PRESENT",
            source: "TRAINER",
          }),
        },
      );
      expect(marked.status).toBe("PRESENT");
    } finally {
      await cleanup.dispose();
    }
  });

  test("prepaid-at-join invoice cannot convert to quarterly @http", async () => {
    const cleanup = new TestDataCleanup();
    try {
      const { invoice } = await enrollPrepaid(cleanup);
      expect(invoice.canConvertToQuarterly ?? false).toBe(false);
      const result = await expectStatus(
        "STAFF",
        `/billing/${invoice.id}/convert-quarterly`,
        400,
        { method: "POST", body: "{}" },
      );
      expect(result.text).toMatch(/first-month bill/i);
    } finally {
      await cleanup.dispose();
    }
  });

  test("switch API keeps the current invoice and does not invoice the destination @http", async () => {
    test.skip(!canJoinPostpaidNow(), "UTC 1st is always prepaid-at-join");
    const cleanup = new TestDataCleanup();
    try {
      const unpaid = await enrollUnpaidOnPostpaidBatch(cleanup, {
        studentName: "Calendar Switch API",
      });
      const kept = await expectOk<{ id: string; status: string }>(
        "STAFF",
        `/billing/${unpaid.invoice.id}`,
      );
      expect(kept.status).toBe("PENDING");

      const destActive = await fetchRosterRows(unpaid.batchId, "active");
      const destRow = destActive.find(
        (row) => row.studentId === unpaid.student.id,
      );
      expect(destRow?.monthlyUnpaid).toBe(true);

      const sourceActive = await fetchRosterRows(
        unpaid.sourceBatchId,
        "active",
      );
      expect(
        sourceActive.some((row) => row.studentId === unpaid.student.id),
      ).toBe(false);
    } finally {
      await cleanup.dispose();
    }
  });

  test("unenroll then enroll a different batch same month is a switch and keeps the invoice @http", async () => {
    const cleanup = new TestDataCleanup();
    try {
      const first = await enrollPrepaid(cleanup, {
        studentName: "Calendar Unenroll Switch",
      });
      const other = await createCalendarBatch(cleanup, {
        kind: "prepaid",
        name: `Calendar Switch Dest ${Date.now()}`,
      });

      await expectOk("STAFF", `/batches/${first.batchId}/unenroll`, {
        method: "POST",
        body: JSON.stringify({ studentId: first.student.id }),
      });

      const second = await staffEnroll(
        other.id,
        first.student.id,
        SEED.adultPlanIds[0],
      );
      expect(second.billingKind).toBe("switch");
      expect(second.invoice).toBeNull();

      const kept = await expectOk<{ id: string; status: string }>(
        "STAFF",
        `/billing/${first.invoice.id}`,
      );
      expect(kept.status).toBe("PENDING");
    } finally {
      await cleanup.dispose();
    }
  });

  test("same-batch rejoin after unenroll is a new joiner with a new invoice @http", async () => {
    const cleanup = new TestDataCleanup();
    try {
      const batch = await createCalendarBatch(cleanup, { kind: "prepaid" });
      const student = await createHttpStudent("Calendar Rejoin", cleanup);
      const first = await staffEnroll(
        batch.id,
        student.id,
        SEED.adultPlanIds[0],
      );
      expect(first.billingKind).toBe("prepaid");
      expect(first.invoice?.status).toBe("PENDING");

      await expectOk("STAFF", `/batches/${batch.id}/unenroll`, {
        method: "POST",
        body: JSON.stringify({ studentId: student.id }),
      });

      const second = await staffEnroll(
        batch.id,
        student.id,
        SEED.adultPlanIds[0],
      );
      expect(second.billingKind).toBe("prepaid");
      expect(second.invoice?.id).toBeTruthy();
      expect(second.invoice?.id).not.toBe(first.invoice?.id);
    } finally {
      await cleanup.dispose();
    }
  });

  test("unenroll does not void the current pending prepaid invoice @http", async () => {
    const cleanup = new TestDataCleanup();
    try {
      const enrolled = await enrollPrepaid(cleanup, {
        studentName: "Calendar Unenroll Keep Invoice",
      });
      await expectOk("STAFF", `/batches/${enrolled.batchId}/unenroll`, {
        method: "POST",
        body: JSON.stringify({ studentId: enrolled.student.id }),
      });
      const kept = await expectOk<{ id: string; status: string }>(
        "STAFF",
        `/billing/${enrolled.invoice.id}`,
      );
      expect(kept.status).toBe("PENDING");
    } finally {
      await cleanup.dispose();
    }
  });

  test("unpaid roster still allows mark; mark-paid clears monthlyUnpaid @http", async () => {
    test.skip(!canJoinPostpaidNow(), "UTC 1st is always prepaid-at-join");
    const cleanup = new TestDataCleanup();
    try {
      const unpaid = await enrollUnpaidOnPostpaidBatch(cleanup, {
        studentName: "Calendar Unpaid Mark",
      });
      const roster = await expectOk<
        Array<{ studentId: string; monthlyUnpaid?: boolean }>
      >("TRAINER", `/attendance/session/${unpaid.sessionId}/roster`);
      expect(
        roster.find((row) => row.studentId === unpaid.student.id)
          ?.monthlyUnpaid,
      ).toBe(true);

      const marked = await expectOk<{ status: string }>(
        "TRAINER",
        "/attendance/mark",
        {
          method: "POST",
          body: JSON.stringify({
            sessionId: unpaid.sessionId,
            studentId: unpaid.student.id,
            status: "PRESENT",
            source: "TRAINER",
          }),
        },
      );
      expect(marked.status).toBe("PRESENT");

      await markPaid(unpaid.invoice.id);
      const paidRoster = await expectOk<
        Array<{ studentId: string; monthlyUnpaid?: boolean }>
      >("TRAINER", `/attendance/session/${unpaid.sessionId}/roster`);
      expect(
        paidRoster.find((row) => row.studentId === unpaid.student.id)
          ?.monthlyUnpaid,
      ).toBe(false);
    } finally {
      await cleanup.dispose();
    }
  });

  test("bulk enroll on a prepaid batch creates pending invoices and roster seats @http", async () => {
    const cleanup = new TestDataCleanup();
    try {
      const studentA = await createHttpStudent("Calendar Bulk A", cleanup);
      const studentB = await createHttpStudent("Calendar Bulk B", cleanup);
      const batch = await createCalendarBatch(cleanup, { kind: "prepaid" });

      const result = await expectOk<{
        enrollments: Array<{
          studentId: string;
          invoice: { id: string; status: string } | null;
        }>;
      }>("STAFF", `/batches/${batch.id}/enroll-bulk`, {
        method: "POST",
        body: JSON.stringify({
          studentIds: [studentA.id, studentB.id],
          subscriptionId: SEED.adultPlanIds[0],
        }),
      });

      expect(result.enrollments).toHaveLength(2);
      for (const row of result.enrollments) {
        expect(row.invoice?.status).toBe("PENDING");
      }
      const active = await fetchRosterRows(batch.id, "active");
      expect(active.some((row) => row.studentId === studentA.id)).toBe(true);
      expect(active.some((row) => row.studentId === studentB.id)).toBe(true);
    } finally {
      await cleanup.dispose();
    }
  });

  test("discover prepaid holds checkout; postpaid enrolls now @http", async () => {
    test.skip(!canJoinPostpaidNow(), "UTC 1st is always prepaid-at-join");
    const cleanup = new TestDataCleanup();
    try {
      const prepaidStudent = await createHttpStudent(
        "Discover Prepaid",
        cleanup,
      );
      const prepaidBatch = await createCalendarBatch(cleanup, {
        kind: "prepaid",
      });
      const hold = await expectOk<{
        id?: string;
        status?: string;
        enrolled?: boolean;
        invoice?: { id: string } | null;
      }>(
        "STUDENT",
        `/batches/${prepaidBatch.id}/purchase`,
        {
          method: "POST",
          body: JSON.stringify({
            subscriptionId: SEED.adultPlanIds[0],
            purchaserUserId: prepaidStudent.id,
            coveredStudents: [
              { studentId: prepaidStudent.id, seatRole: "ADULT" },
            ],
          }),
        },
        { userId: prepaidStudent.id },
      );
      expect(hold.status ?? "PENDING").toBe("PENDING");
      expect(hold.id).toBeTruthy();
      const prepaidRoster = await fetchRosterRows(prepaidBatch.id, "active");
      expect(
        prepaidRoster.some((row) => row.studentId === prepaidStudent.id),
      ).toBe(false);

      const postpaidStudent = await createHttpStudent(
        "Discover Postpaid",
        cleanup,
      );
      const postpaidBatch = await createCalendarBatch(cleanup, {
        kind: "postpaid",
      });
      const enrolledNow = await expectOk<{
        billingKind?: string;
        enrolled?: boolean;
        invoice: { id: string } | null;
      }>(
        "STUDENT",
        `/batches/${postpaidBatch.id}/purchase`,
        {
          method: "POST",
          body: JSON.stringify({
            subscriptionId: SEED.adultPlanIds[0],
            purchaserUserId: postpaidStudent.id,
            coveredStudents: [
              { studentId: postpaidStudent.id, seatRole: "ADULT" },
            ],
          }),
        },
        { userId: postpaidStudent.id },
      );
      expect(enrolledNow.billingKind).toBe("postpaid");
      expect(enrolledNow.enrolled).toBe(true);
      expect(enrolledNow.invoice).toBeNull();
      const postpaidRoster = await fetchRosterRows(postpaidBatch.id, "active");
      expect(
        postpaidRoster.some((row) => row.studentId === postpaidStudent.id),
      ).toBe(true);
    } finally {
      await cleanup.dispose();
    }
  });

  test("pending prepaid revenue is counted; abandon as the invoice student leaves collected unchanged @http", async () => {
    const cleanup = new TestDataCleanup();
    try {
      const enrolled = await enrollPrepaid(cleanup, {
        studentName: "Calendar Revenue Abandon",
      });
      const pending = await expectOk<{
        totals: { collected: number; pending: number };
      }>("STAFF", `/batches/${enrolled.batchId}/revenue`);
      expect(pending.totals.pending).toBeGreaterThanOrEqual(
        ADULT_MONTHLY_PRICE,
      );
      expect(pending.totals.collected).toBe(0);

      const before = pending.totals.collected;
      await abandonInvoice(enrolled.student.id, enrolled.invoice.id);
      const after = await expectOk<{ totals: { collected: number } }>(
        "STAFF",
        `/batches/${enrolled.batchId}/revenue`,
      );
      expect(after.totals.collected).toBe(before);
    } finally {
      await cleanup.dispose();
    }
  });

  test("family-combine uses two owned kid prepaid invoices @http", async () => {
    const cleanup = new TestDataCleanup();
    const stamp = Date.now();
    try {
      const depA = await expectOk<{ id: string }>(
        "STUDENT",
        "/users/me/family-members",
        {
          method: "POST",
          body: JSON.stringify({
            name: `Calendar Combine A ${stamp}`,
            kind: "KID",
            gender: "FEMALE",
            ageRange: "UNDER_10",
          }),
        },
      );
      cleanup.trackStudent(depA.id);
      const depB = await expectOk<{ id: string }>(
        "STUDENT",
        "/users/me/family-members",
        {
          method: "POST",
          body: JSON.stringify({
            name: `Calendar Combine B ${stamp}`,
            kind: "KID",
            gender: "FEMALE",
            ageRange: "UNDER_10",
          }),
        },
      );
      cleanup.trackStudent(depB.id);

      const kidsBatch = await createCalendarBatch(cleanup, {
        kind: "prepaid",
        category: "KIDS",
        capacity: 8,
      });
      const invA = await enrollPrepaid(cleanup, {
        category: "KIDS",
        studentId: depA.id,
        batchId: kidsBatch.id,
        planId: SEED.kidPlanIds[0],
      });
      const invB = await enrollPrepaid(cleanup, {
        category: "KIDS",
        studentId: depB.id,
        batchId: kidsBatch.id,
        planId: SEED.kidPlanIds[0],
      });

      const combined = await expectOk<{
        id: string;
        status: string;
        amount: number;
        familyDiscount: number;
        kind: string;
      }>("STAFF", "/billing/family-combine", {
        method: "POST",
        body: JSON.stringify({
          studioId: SEED.studioId,
          purchaserUserId: SEED.users.STUDENT.id,
          invoiceIds: [invA.invoice.id, invB.invoice.id],
          familyDiscount: 100,
        }),
      });
      expect(combined.status).toBe("PENDING");
      expect(combined.kind).toBe("COMBINED");
      expect(Number(combined.amount)).toBe(
        Number(invA.invoice.amount) + Number(invB.invoice.amount) - 100,
      );
    } finally {
      await cleanup.dispose();
    }
  });
});
