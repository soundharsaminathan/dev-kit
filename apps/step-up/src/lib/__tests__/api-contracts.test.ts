import { describe, expect, it } from "vitest";
import type { NotificationDto } from "@/lib/notifications-cache";
import {
  type AttendanceRosterEntry,
  type AttendanceStatusValue,
  rosterStatus,
} from "@/modules/attendance/types";

const ATTENDANCE_STATUSES: AttendanceStatusValue[] = ["PRESENT", "ABSENT"];

const NOTIFICATION_KEYS = [
  "id",
  "type",
  "title",
  "body",
  "readAt",
  "createdAt",
] as const satisfies ReadonlyArray<keyof NotificationDto>;

describe("frontend API contract mirrors", () => {
  it("uses PRESENT/ABSENT status literals matching the API contract", () => {
    expect(ATTENDANCE_STATUSES).toEqual(["PRESENT", "ABSENT"]);

    const present: AttendanceRosterEntry = {
      studentId: "student-1",
      student: { name: "Alex" },
      attendance: {
        id: "att-1",
        status: "PRESENT",
        source: "TRAINER",
      },
    };
    expect(rosterStatus(present)).toBe("PRESENT");
    expect(rosterStatus({ ...present, attendance: null })).toBe("UNMARKED");
  });

  it("documents notification list keys expected from the API", () => {
    const sample: NotificationDto = {
      id: "notif-1",
      type: "MISSED_SESSION",
      title: "Missed session",
      body: "Absent",
      deepLink: "/me/attendance",
      readAt: null,
      createdAt: "2026-07-20T12:00:00.000Z",
      status: "ACTIVE",
    };

    for (const key of NOTIFICATION_KEYS) {
      expect(sample).toHaveProperty(key);
    }
    expect(sample).not.toHaveProperty("attendanceStatus");
  });
});
