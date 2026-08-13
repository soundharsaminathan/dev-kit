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
