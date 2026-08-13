import { expect, test } from "@playwright/test";
import { canJoinPostpaidNow } from "../fixtures/billing-calendar";
import { SEED } from "../fixtures/seed";
import {
  enrollPostpaid,
  enrollPrepaid,
  enrollUnpaidOnPostpaidBatch,
  markableSessionId,
  markPaid,
} from "./billing-fixtures";
import {
  createHttpStudent,
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
    test.skip(!canJoinPostpaidNow(), "UTC 1st is always prepaid-at-join");
    const cleanup = new TestDataCleanup();
    try {
      const { student, invoice, sessionId } = await enrollUnpaidOnPostpaidBatch(
        cleanup,
        { studentName: "HTTP Unpaid Roster" },
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
    test.skip(!canJoinPostpaidNow(), "UTC 1st is always prepaid-at-join");
    const cleanup = new TestDataCleanup();
    try {
      const enrolled = await enrollPostpaid(cleanup, {
        studentName: "HTTP Postpaid Roster",
      });
      const sessionId = markableSessionId(enrolled.sessions);

      const roster = await expectOk<
        Array<{ studentId: string; monthlyUnpaid?: boolean }>
      >("TRAINER", `/attendance/session/${sessionId}/roster`);
      expect(
        roster.find((row) => row.studentId === enrolled.student.id)
          ?.monthlyUnpaid,
      ).toBe(false);

      const marked = await expectOk<{ status: string }>(
        "TRAINER",
        "/attendance/mark",
        {
          method: "POST",
          body: JSON.stringify({
            sessionId,
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

  test("mark-paid clears monthlyUnpaid on attendance roster @http", async () => {
    test.skip(!canJoinPostpaidNow(), "UTC 1st is always prepaid-at-join");
    const cleanup = new TestDataCleanup();
    try {
      const { student, invoice, sessionId } = await enrollUnpaidOnPostpaidBatch(
        cleanup,
        { studentName: "HTTP After Pay Roster" },
      );
      expect(invoice.status).toBe("PENDING");

      const unpaidRoster = await expectOk<
        Array<{ studentId: string; monthlyUnpaid?: boolean }>
      >("TRAINER", `/attendance/session/${sessionId}/roster`);
      expect(
        unpaidRoster.find((row) => row.studentId === student.id)?.monthlyUnpaid,
      ).toBe(true);

      await markPaid(invoice.id);

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

  test("batch monthly attendance summary stays after unenroll; student denied @http", async () => {
    const cleanup = new TestDataCleanup();
    try {
      const enrolled = await enrollPrepaid(cleanup, {
        studentName: "HTTP Month Attendance",
      });
      const startsAt = new Date(Date.now() - 30 * 60 * 1000);
      const endsAt = new Date(startsAt.getTime() + 60 * 60 * 1000);
      const session = await expectOk<{ id: string; startsAt: string }>(
        "STAFF",
        "/sessions",
        {
          method: "POST",
          body: JSON.stringify({
            batchId: enrolled.batchId,
            startsAt: startsAt.toISOString(),
            endsAt: endsAt.toISOString(),
            type: "REGULAR",
          }),
        },
      );
      const monthDate = new Date(session.startsAt);
      const month = `${monthDate.getUTCFullYear()}-${String(monthDate.getUTCMonth() + 1).padStart(2, "0")}`;

      await expectOk<{ status: string }>("TRAINER", "/attendance/mark", {
        method: "POST",
        body: JSON.stringify({
          sessionId: session.id,
          studentId: enrolled.student.id,
          status: "PRESENT",
          source: "TRAINER",
        }),
      });

      type Summary = {
        month: string;
        sessionCount: number;
        students: Array<{
          studentId: string;
          presentCount: number;
          eligibleCount: number;
        }>;
      };

      const summary = await expectOk<Summary>(
        "TRAINER",
        `/batches/${enrolled.batchId}/attendance?month=${month}`,
      );
      expect(summary.month).toBe(month);
      expect(summary.sessionCount).toBeGreaterThan(0);
      const row = summary.students.find(
        (entry) => entry.studentId === enrolled.student.id,
      );
      expect(row).toBeTruthy();
      expect(row!.presentCount).toBeGreaterThanOrEqual(1);
      expect(row!.eligibleCount).toBeGreaterThanOrEqual(row!.presentCount);

      await expectOk("STAFF", `/batches/${enrolled.batchId}/unenroll`, {
        method: "POST",
        body: JSON.stringify({ studentId: enrolled.student.id }),
      });

      const afterUnenroll = await expectOk<Summary>(
        "STAFF",
        `/batches/${enrolled.batchId}/attendance?month=${month}`,
      );
      expect(
        afterUnenroll.students.find(
          (entry) => entry.studentId === enrolled.student.id,
        ),
      ).toBeTruthy();

      await expectStatus(
        "STUDENT",
        `/batches/${enrolled.batchId}/attendance?month=${month}`,
        403,
        undefined,
        { userId: enrolled.student.id },
      );
    } finally {
      await cleanup.dispose();
    }
  });
});
