import { describe, expect, it } from "vitest";
import {
  bookingCreateRequestSchema,
  bookingPaymentConfirmSchema,
  markAttendanceRequestSchema,
  notificationListItemSchema,
  sessionRosterEntrySchema,
} from "./api-contracts";

describe("API contracts", () => {
  it("accepts mark attendance with status (not attendanceStatus)", () => {
    const parsed = markAttendanceRequestSchema.parse({
      sessionId: "session-1",
      studentId: "student-1",
      status: "ABSENT",
      source: "TRAINER",
    });
    expect(parsed.status).toBe("ABSENT");
  });

  it("rejects mark attendance when status field is misnamed", () => {
    const result = markAttendanceRequestSchema.safeParse({
      sessionId: "session-1",
      studentId: "student-1",
      attendanceStatus: "ABSENT",
      source: "TRAINER",
    });
    expect(result.success).toBe(false);
  });

  it("accepts session roster entries with nested attendance.status", () => {
    const parsed = sessionRosterEntrySchema.parse({
      studentId: "student-1",
      student: { name: "Alex" },
      attendance: {
        id: "att-1",
        status: "PRESENT",
        source: "QR",
      },
    });
    expect(parsed.attendance?.status).toBe("PRESENT");
  });

  it("accepts booking create and payment confirm shapes", () => {
    expect(
      bookingCreateRequestSchema.parse({
        studioId: "studio-1",
        studentId: "student-1",
        type: "TRIAL",
        batchId: "batch-1",
      }).type,
    ).toBe("TRIAL");

    expect(bookingPaymentConfirmSchema.parse({ id: "bk-1" }).id).toBe("bk-1");
  });

  it("accepts notification list item fields used by the student UI", () => {
    const parsed = notificationListItemSchema.parse({
      id: "notif-1",
      type: "MISSED_SESSION",
      title: "Missed session",
      body: "You were marked absent",
      deepLink: "/me/attendance",
      readAt: null,
      createdAt: "2026-07-20T12:00:00.000Z",
      status: "ACTIVE",
    });
    expect(parsed.readAt).toBeNull();
    expect(parsed.deepLink).toBe("/me/attendance");
  });

  it("rejects notification items missing readAt", () => {
    const result = notificationListItemSchema.safeParse({
      id: "notif-1",
      type: "MISSED_SESSION",
      title: "Missed session",
      body: "You were marked absent",
      createdAt: "2026-07-20T12:00:00.000Z",
    });
    expect(result.success).toBe(false);
  });
});
