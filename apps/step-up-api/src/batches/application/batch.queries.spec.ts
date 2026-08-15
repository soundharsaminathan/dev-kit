import { describe, expect, it, vi } from "vitest";
import { BatchQueriesService } from "./batch.queries";

describe("BatchQueriesService.getRoster search", () => {
  it("filters active roster by email and digit-normalized phone", async () => {
    const rows = [
      {
        id: "enr-1",
        batchId: "batch-1",
        studentId: "s1",
        enrolledAt: new Date("2026-01-01"),
        status: "ACTIVE",
        endedAt: null,
        endReason: null,
        student: {
          id: "s1",
          styles: [],
          createdAt: new Date("2026-01-01"),
          photoUrl: null,
        },
      },
      {
        id: "enr-2",
        batchId: "batch-1",
        studentId: "s2",
        enrolledAt: new Date("2026-01-02"),
        status: "ACTIVE",
        endedAt: null,
        endReason: null,
        student: {
          id: "s2",
          styles: [],
          createdAt: new Date("2026-01-02"),
          photoUrl: null,
        },
      },
    ];

    const query = {
      findStudioId: vi.fn().mockResolvedValue({ studioId: "studio-1" }),
      findRoster: vi.fn().mockResolvedValue({
        rows,
        limit: 25,
        tab: "active",
      }),
    };
    const users = {
      presentLiteMany: vi.fn().mockResolvedValue([
        {
          id: "s1",
          name: "Ada Lovelace",
          email: "ada@example.com",
          phone: "+91 98765 43210",
          photoUrl: null,
        },
        {
          id: "s2",
          name: "Grace Hopper",
          email: "grace@example.com",
          phone: "+91 90000 11111",
          photoUrl: null,
        },
      ]),
    };
    const memberships = {
      findMonthlyUnpaidStudentIds: vi.fn().mockResolvedValue(new Set()),
    };
    const prisma = {
      invoice: { findMany: vi.fn().mockResolvedValue([]) },
    };

    const service = new BatchQueriesService(
      query as never,
      prisma as never,
      users as never,
      {} as never,
      memberships as never,
    );

    const byPhone = await service.getRoster("batch-1", {
      tab: "active",
      q: "9876543210",
    });
    expect(byPhone.items).toHaveLength(1);
    expect(byPhone.items[0]?.studentId).toBe("s1");
    expect(query.findRoster).toHaveBeenCalledWith(
      "batch-1",
      expect.objectContaining({ searchAll: true }),
    );

    const byEmail = await service.getRoster("batch-1", {
      tab: "active",
      q: "grace@example.com",
    });
    expect(byEmail.items).toHaveLength(1);
    expect(byEmail.items[0]?.studentId).toBe("s2");
  });
});

describe("BatchQueriesService.getStudentAttendanceDetail", () => {
  function buildService(overrides: {
    sessions?: unknown;
    enrollment?: unknown;
    marks?: unknown;
  }) {
    const prisma = {
      batch: {
        findUnique: vi.fn().mockResolvedValue({ id: "batch-1" }),
      },
      session: {
        findMany: vi.fn().mockResolvedValue(overrides.sessions ?? []),
      },
      batchEnrollment: {
        findFirst: vi.fn().mockResolvedValue(
          overrides.enrollment !== undefined
            ? overrides.enrollment
            : {
                studentId: "s1",
                enrolledAt: new Date("2026-01-01"),
                status: "ACTIVE",
                endedAt: null,
                student: {
                  id: "s1",
                  photoUrl: null,
                  firstName: null,
                  lastName: null,
                  encryptedName: null,
                },
              },
        ),
      },
      attendance: {
        findMany: vi.fn().mockResolvedValue(overrides.marks ?? []),
      },
    };
    const users = {
      presentLiteMany: vi
        .fn()
        .mockResolvedValue([
          { id: "s1", name: "Ada Lovelace", photoUrl: null },
        ]),
    };

    const service = new BatchQueriesService(
      {} as never,
      prisma as never,
      users as never,
      {} as never,
      {} as never,
    );
    return { service, prisma };
  }

  it("returns sessions with per-session attendance status and counts", async () => {
    const sessions = [
      {
        id: "sess-1",
        startsAt: new Date("2026-02-03T10:00:00.000Z"),
        type: "REGULAR",
        status: "SCHEDULED",
      },
      {
        id: "sess-2",
        startsAt: new Date("2026-02-05T10:00:00.000Z"),
        type: "REGULAR",
        status: "COMPLETED",
      },
      {
        id: "sess-3",
        startsAt: new Date("2026-02-07T10:00:00.000Z"),
        type: "TRIAL",
        status: "COMPLETED",
      },
    ];
    const marks = [
      { sessionId: "sess-1", status: "PRESENT" },
      { sessionId: "sess-2", status: "ABSENT" },
    ];

    const { service, prisma } = buildService({ sessions, marks });

    const result = await service.getStudentAttendanceDetail("batch-1", "s1", {
      month: "2026-02",
    });

    expect(prisma.attendance.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ studentId: "s1" }),
      }),
    );
    expect(result.sessionCount).toBe(2);
    expect(result.sessions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "sess-1",
          attendance: "PRESENT",
        }),
        expect.objectContaining({
          id: "sess-2",
          attendance: "ABSENT",
        }),
      ]),
    );
    expect(result.sessions).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: "sess-3" })]),
    );
    expect(result.counts).toEqual({
      eligibleCount: 2,
      presentCount: 1,
      absentCount: 1,
      unmarkedCount: 0,
    });
  });

  it("returns empty sessions when student has no eligible classes", async () => {
    const { service } = buildService({ sessions: [] });

    const result = await service.getStudentAttendanceDetail("batch-1", "s1", {
      month: "2026-02",
    });

    expect(result.sessions).toEqual([]);
    expect(result.sessionCount).toBe(0);
    expect(result.counts).toEqual({
      eligibleCount: 0,
      presentCount: 0,
      absentCount: 0,
      unmarkedCount: 0,
    });
  });

  it("throws when the student is not enrolled in the batch", async () => {
    const { service } = buildService({ enrollment: null });

    await expect(
      service.getStudentAttendanceDetail("batch-1", "s1", {
        month: "2026-02",
      }),
    ).rejects.toThrow("Student is not enrolled in this batch");
  });
});
