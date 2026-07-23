import { NotificationType } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MembershipsService } from "./memberships.service";

describe("MembershipsService.renewManual", () => {
  const prisma = {
    membership: {
      findUnique: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
  };

  const notifications = {
    create: vi.fn(),
  };

  let service: MembershipsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new MembershipsService(
      prisma as never,
      notifications as never,
      {
        assertNoConflicts: vi.fn().mockResolvedValue(undefined),
        assertStudentAvailableForBatch: vi.fn().mockResolvedValue(undefined),
      } as never,
    );
  });

  it("expires the old membership and creates a renewed one", async () => {
    prisma.membership.findUnique.mockResolvedValue({
      id: "mem-1",
      subscriptionId: "sub-1",
      purchaserUserId: "user-1",
      periodEnd: new Date(Date.UTC(2026, 5, 30, 23, 59, 59, 999)),
      subscription: {
        name: "Individual Kid Monthly",
        billingCadence: "MONTHLY",
      },
      coveredStudents: [{ studentId: "student-1", seatRole: "KID" }],
    });
    prisma.membership.create.mockResolvedValue({
      id: "mem-2",
      subscriptionId: "sub-1",
    });

    await service.renewManual("mem-1");

    expect(prisma.membership.update).toHaveBeenCalledWith({
      where: { id: "mem-1" },
      data: { status: "EXPIRED" },
    });
    expect(notifications.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        type: NotificationType.RENEWED,
        planName: "Individual Kid Monthly",
        meta: expect.objectContaining({
          membershipId: "mem-2",
          subscriptionId: "sub-1",
        }),
      }),
    );
  });
});

describe("MembershipsService.assign family packs", () => {
  const prisma = {
    subscription: {
      findUnique: vi.fn(),
    },
    batch: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    membership: {
      create: vi.fn(),
    },
    batchEnrollment: {
      upsert: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
    },
    booking: {
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
    },
    $queryRaw: vi.fn().mockResolvedValue([{ id: "batch" }]),
    $transaction: vi.fn(),
  };

  const notifications = {
    create: vi.fn(),
  };

  const scheduleConflicts = {
    assertNoConflicts: vi.fn().mockResolvedValue(undefined),
    assertStudentAvailableForBatch: vi.fn().mockResolvedValue(undefined),
  };

  let service: MembershipsService;

  beforeEach(() => {
    vi.clearAllMocks();
    scheduleConflicts.assertNoConflicts.mockResolvedValue(undefined);
    scheduleConflicts.assertStudentAvailableForBatch.mockResolvedValue(
      undefined,
    );
    service = new MembershipsService(
      prisma as never,
      notifications as never,
      scheduleConflicts as never,
    );
    prisma.$transaction.mockImplementation(
      async (fn: (tx: typeof prisma) => Promise<unknown>) => fn(prisma),
    );
    prisma.$queryRaw.mockImplementation(async () => [{ id: "batch" }]);
    prisma.batchEnrollment.findMany.mockResolvedValue([]);
    prisma.booking.updateMany.mockResolvedValue({ count: 0 });
    prisma.booking.findMany.mockResolvedValue([]);
  });

  it("creates membership and enrolls each seat into its batch", async () => {
    prisma.subscription.findUnique.mockResolvedValue({
      id: "sub-family",
      active: true,
      kind: "FAMILY",
      individualAudience: null,
      adultSeats: 1,
      kidSeats: 1,
      billingCadence: "MONTHLY",
    });
    prisma.batch.findMany.mockResolvedValue([
      {
        id: "batch-adult",
        name: "Adult Hip Hop",
        active: true,
        category: "ADULTS",
        capacity: 20,
        _count: { enrollments: 2 },
        enrollments: [],
      },
      {
        id: "batch-kid",
        name: "Kids Ballet",
        active: true,
        category: "KIDS",
        capacity: 15,
        _count: { enrollments: 1 },
        enrollments: [],
      },
    ]);
    prisma.membership.create.mockResolvedValue({
      id: "mem-family",
      coveredStudents: [],
    });

    await service.assign({
      subscriptionId: "sub-family",
      purchaserUserId: "owner-1",
      coveredStudents: [
        {
          studentId: "owner-1",
          seatRole: "ADULT",
          batchId: "batch-adult",
        },
        {
          studentId: "kid-1",
          seatRole: "KID",
          batchId: "batch-kid",
        },
      ],
    });

    expect(
      scheduleConflicts.assertStudentAvailableForBatch,
    ).toHaveBeenCalledWith("owner-1", "batch-adult");
    expect(
      scheduleConflicts.assertStudentAvailableForBatch,
    ).toHaveBeenCalledWith("kid-1", "batch-kid");
    expect(prisma.batchEnrollment.upsert).toHaveBeenCalledTimes(2);
    expect(prisma.batchEnrollment.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: { batchId: "batch-adult", studentId: "owner-1" },
      }),
    );
    expect(prisma.batchEnrollment.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: { batchId: "batch-kid", studentId: "kid-1" },
      }),
    );
  });

  it("rejects family assign when a seat batch category mismatches", async () => {
    prisma.subscription.findUnique.mockResolvedValue({
      id: "sub-family",
      active: true,
      kind: "FAMILY",
      individualAudience: null,
      adultSeats: 1,
      kidSeats: 1,
      billingCadence: "MONTHLY",
    });
    prisma.batch.findMany.mockResolvedValue([
      {
        id: "batch-adult",
        name: "Adult Hip Hop",
        active: true,
        category: "ADULTS",
        capacity: 20,
        _count: { enrollments: 0 },
        enrollments: [],
      },
      {
        id: "batch-also-adult",
        name: "Adult Jazz",
        active: true,
        category: "ADULTS",
        capacity: 20,
        _count: { enrollments: 0 },
        enrollments: [],
      },
    ]);

    await expect(
      service.assign({
        subscriptionId: "sub-family",
        purchaserUserId: "owner-1",
        coveredStudents: [
          {
            studentId: "owner-1",
            seatRole: "ADULT",
            batchId: "batch-adult",
          },
          {
            studentId: "kid-1",
            seatRole: "KID",
            batchId: "batch-also-adult",
          },
        ],
      }),
    ).rejects.toThrow(/does not match KID seat/);
  });
});

describe("MembershipsService.purchaseForBatch", () => {
  const prisma = {
    batch: { findUnique: vi.fn(), findMany: vi.fn() },
    batchPlan: { findUnique: vi.fn() },
    subscription: { findUnique: vi.fn() },
    membership: { create: vi.fn() },
    batchEnrollment: {
      upsert: vi.fn(),
      findMany: vi.fn(),
    },
    booking: {
      updateMany: vi.fn(),
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
    $queryRaw: vi.fn(),
  };

  const scheduleConflicts = {
    assertNoConflicts: vi.fn().mockResolvedValue(undefined),
    assertStudentAvailableForBatch: vi.fn().mockResolvedValue(undefined),
  };

  let service: MembershipsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new MembershipsService(
      prisma as never,
      { create: vi.fn() } as never,
      scheduleConflicts as never,
    );
    prisma.$transaction.mockImplementation(
      async (fn: (tx: typeof prisma) => Promise<unknown>) => fn(prisma),
    );
    prisma.$queryRaw.mockImplementation(async () => [{ id: "batch" }]);
    prisma.batchEnrollment.findMany.mockResolvedValue([]);
    prisma.booking.updateMany.mockResolvedValue({ count: 0 });
    prisma.booking.findMany.mockResolvedValue([]);
  });

  it("assigns membership and enrolls into the purchased batch", async () => {
    prisma.batch.findUnique.mockResolvedValue({
      id: "batch-kid",
      active: true,
      category: "KIDS",
    });
    prisma.batchPlan.findUnique.mockResolvedValue({
      batchId: "batch-kid",
      subscriptionId: "sub-kid-mo",
      subscription: {
        id: "sub-kid-mo",
        active: true,
        kind: "INDIVIDUAL",
        individualAudience: "KID",
        adultSeats: 0,
        kidSeats: 1,
        billingCadence: "MONTHLY",
      },
    });
    prisma.subscription.findUnique.mockResolvedValue({
      id: "sub-kid-mo",
      active: true,
      kind: "INDIVIDUAL",
      individualAudience: "KID",
      adultSeats: 0,
      kidSeats: 1,
      billingCadence: "MONTHLY",
    });
    prisma.batch.findMany.mockResolvedValue([
      {
        id: "batch-kid",
        name: "Kids Ballet",
        active: true,
        category: "KIDS",
        capacity: 15,
        enrollments: [],
      },
    ]);
    prisma.membership.create.mockResolvedValue({
      id: "mem-1",
      coveredStudents: [],
    });

    await service.purchaseForBatch({
      batchId: "batch-kid",
      subscriptionId: "sub-kid-mo",
      purchaserUserId: "parent-1",
      coveredStudents: [{ studentId: "kid-1", seatRole: "KID" }],
    });

    expect(prisma.batchEnrollment.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: { batchId: "batch-kid", studentId: "kid-1" },
      }),
    );
  });
});
