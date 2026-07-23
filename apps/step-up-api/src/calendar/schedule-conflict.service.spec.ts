import { ConflictException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ScheduleConflictService } from "./schedule-conflict.service";

describe("ScheduleConflictService", () => {
  const prisma = {
    session: { findMany: vi.fn() },
    booking: { findMany: vi.fn() },
  };

  let service: ScheduleConflictService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ScheduleConflictService(prisma as never);
  });

  it("throws when an overlapping session occupies the trainer", async () => {
    prisma.session.findMany.mockResolvedValue([
      {
        id: "session-other",
        startsAt: new Date("2026-07-20T10:00:00.000Z"),
        endsAt: new Date("2026-07-20T11:00:00.000Z"),
        batch: {
          branchId: "branch-other",
          trainers: [{ trainerId: "trainer-1" }],
          enrollments: [],
        },
      },
    ]);
    prisma.booking.findMany.mockResolvedValue([]);

    await expect(
      service.assertNoConflicts({
        intervals: [
          {
            startsAt: new Date("2026-07-20T10:30:00.000Z"),
            endsAt: new Date("2026-07-20T11:30:00.000Z"),
          },
        ],
        trainerIds: ["trainer-1"],
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("passes when occupancy does not overlap", async () => {
    prisma.session.findMany.mockResolvedValue([
      {
        id: "session-other",
        startsAt: new Date("2026-07-20T08:00:00.000Z"),
        endsAt: new Date("2026-07-20T09:00:00.000Z"),
        batch: {
          branchId: "branch-1",
          trainers: [{ trainerId: "trainer-1" }],
          enrollments: [],
        },
      },
    ]);
    prisma.booking.findMany.mockResolvedValue([]);

    await expect(
      service.assertNoConflicts({
        intervals: [
          {
            startsAt: new Date("2026-07-20T10:00:00.000Z"),
            endsAt: new Date("2026-07-20T11:00:00.000Z"),
          },
        ],
        trainerIds: ["trainer-1"],
        branchId: "branch-1",
      }),
    ).resolves.toBeUndefined();
  });
});
