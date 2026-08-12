import { expect, test } from "@playwright/test";
import { SEED } from "../fixtures/seed";
import {
  createHttpStudent,
  enrollSeedBatchWithPrepaidInvoice,
  expectOk,
  expectStatus,
  TestDataCleanup,
} from "./helpers";

test.describe("attendance HTTP @http", () => {
  test("trainer marks attendance and reads roster @http", async () => {
    const sessionId = SEED.sessionAttendanceId;
    const studentId = SEED.users.STUDENT.id;

    const marked = await expectOk<{ status: string }>(
      "TRAINER",
      "/attendance/mark",
      {
        method: "POST",
        body: JSON.stringify({
          sessionId,
          studentId,
          status: "PRESENT",
          source: "TRAINER",
        }),
      },
    );
    expect(marked.status).toBe("PRESENT");

    const roster = await expectOk<
      Array<{
        studentId: string;
        attendance?: { status: string } | null;
      }>
    >("TRAINER", `/attendance/session/${sessionId}/roster`);

    expect(roster.length).toBeGreaterThan(0);
    expect(
      roster.find((row) => row.studentId === studentId)?.attendance?.status,
    ).toBe("PRESENT");
  });

  test("roster flags staff-enrolled unpaid student and mark still works @http", async () => {
    const cleanup = new TestDataCleanup();
    const sessionId = SEED.sessionAttendanceId;
    try {
      const { student, invoice } = await enrollSeedBatchWithPrepaidInvoice(
        cleanup,
        SEED.kidsBatchId,
        { category: "KIDS", studentName: "HTTP Unpaid Roster" },
      );
      expect(invoice.status).toBe("PENDING");

      const roster = await expectOk<
        Array<{
          studentId: string;
          monthlyUnpaid?: boolean;
          attendance?: { status: string } | null;
        }>
      >("TRAINER", `/attendance/session/${sessionId}/roster`);

      const entry = roster.find((row) => row.studentId === student.id);
      expect(entry).toBeTruthy();
      expect(entry?.monthlyUnpaid).toBe(true);

      const marked = await expectOk<{ status: string }>(
        "TRAINER",
        "/attendance/mark",
        {
          method: "POST",
          body: JSON.stringify({
            sessionId,
            studentId: student.id,
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

  test("mid-month enroll is not monthlyUnpaid and mark does not need an invoice @http", async () => {
    const cleanup = new TestDataCleanup();
    const sessionId = SEED.sessionAttendanceId;
    try {
      const student = await createHttpStudent("HTTP Postpaid Roster", cleanup);
      const enrollment = await expectOk<{
        invoice: { id: string } | null;
      }>("STAFF", `/batches/${SEED.kidsBatchId}/enroll`, {
        method: "POST",
        body: JSON.stringify({
          studentId: student.id,
          subscriptionId: SEED.kidPlanIds[0],
        }),
      });
      expect(enrollment.invoice).toBeNull();

      const roster = await expectOk<
        Array<{ studentId: string; monthlyUnpaid?: boolean }>
      >("TRAINER", `/attendance/session/${sessionId}/roster`);
      expect(
        roster.find((row) => row.studentId === student.id)?.monthlyUnpaid,
      ).toBe(false);

      const marked = await expectOk<{ status: string }>(
        "TRAINER",
        "/attendance/mark",
        {
          method: "POST",
          body: JSON.stringify({
            sessionId,
            studentId: student.id,
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

  test("mark-paid clears monthlyUnpaid on attendance roster @http", async () => {
    const cleanup = new TestDataCleanup();
    const sessionId = SEED.sessionAttendanceId;
    try {
      const { student, invoice } = await enrollSeedBatchWithPrepaidInvoice(
        cleanup,
        SEED.kidsBatchId,
        { category: "KIDS", studentName: "HTTP After Pay Roster" },
      );
      expect(invoice.status).toBe("PENDING");

      const unpaidRoster = await expectOk<
        Array<{ studentId: string; monthlyUnpaid?: boolean }>
      >("TRAINER", `/attendance/session/${sessionId}/roster`);
      expect(
        unpaidRoster.find((row) => row.studentId === student.id)?.monthlyUnpaid,
      ).toBe(true);

      await expectOk("STAFF", `/billing/${invoice.id}/paid`, {
        method: "PATCH",
        body: JSON.stringify({ paymentMethod: "CASH" }),
      });

      const paidRoster = await expectOk<
        Array<{ studentId: string; monthlyUnpaid?: boolean }>
      >("TRAINER", `/attendance/session/${sessionId}/roster`);
      expect(
        paidRoster.find((row) => row.studentId === student.id)?.monthlyUnpaid,
      ).toBe(false);
    } finally {
      await cleanup.dispose();
    }
  });

  test("trainer cannot mark a student who is not enrolled @http", async () => {
    const cleanup = new TestDataCleanup();
    try {
      const student = await createHttpStudent("HTTP Not Enrolled", cleanup);
      const result = await expectStatus("TRAINER", "/attendance/mark", 400, {
        method: "POST",
        body: JSON.stringify({
          sessionId: SEED.sessionAttendanceId,
          studentId: student.id,
          status: "PRESENT",
          source: "TRAINER",
        }),
      });
      expect(result.text).toMatch(/not enrolled or booked/i);
    } finally {
      await cleanup.dispose();
    }
  });

  test("trainer mark-all-present succeeds @http", async () => {
    const sessionId = SEED.sessionAttendanceId;
    const result = await expectOk<{ marked: number; failed: number }>(
      "TRAINER",
      `/attendance/session/${sessionId}/mark-all-present`,
      { method: "POST" },
    );
    expect(result.failed).toBe(0);
  });

  test("student cannot mark attendance @http", async () => {
    await expectStatus("STUDENT", "/attendance/mark", 403, {
      method: "POST",
      body: JSON.stringify({
        sessionId: SEED.sessionAttendanceId,
        studentId: SEED.users.STUDENT.id,
        status: "PRESENT",
        source: "TRAINER",
      }),
    });
  });
});
