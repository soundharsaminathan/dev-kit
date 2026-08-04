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

describe("MembershipsService.requestRenewalInvoice", () => {
  const prisma = {
    membership: {
      findUnique: vi.fn(),
    },
    invoice: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    studioSettings: {
      findUnique: vi.fn(),
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

  it("creates a pending invoice for a due membership", async () => {
    prisma.membership.findUnique.mockResolvedValue({
      id: "mem-1",
      purchaserUserId: "user-1",
      status: "DUE",
      subscription: { price: 2000 },
      purchaser: { id: "user-1", studioId: "studio-1" },
    });
    prisma.invoice.findFirst.mockResolvedValue(null);
    prisma.studioSettings.findUnique.mockResolvedValue({
      platformFeePercent: 5,
    });
    prisma.invoice.create.mockResolvedValue({
      id: "inv-1",
      status: "PENDING",
      membershipId: "mem-1",
    });

    const invoice = await service.requestRenewalInvoice("mem-1");

    expect(prisma.invoice.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        studentId: "user-1",
        studioId: "studio-1",
        membershipId: "mem-1",
        amount: 2000,
        status: "PENDING",
        platformFeePercent: 5,
      }),
    });
    expect(invoice.id).toBe("inv-1");
  });

  it("returns an existing pending renewal invoice", async () => {
    prisma.membership.findUnique.mockResolvedValue({
      id: "mem-1",
      purchaserUserId: "user-1",
      status: "EXPIRED",
      subscription: { price: 2000 },
      purchaser: { id: "user-1", studioId: "studio-1" },
    });
    prisma.invoice.findFirst.mockResolvedValue({
      id: "inv-existing",
      status: "PENDING",
    });

    const invoice = await service.requestRenewalInvoice("mem-1");

    expect(invoice.id).toBe("inv-existing");
    expect(prisma.invoice.create).not.toHaveBeenCalled();
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
        update: {},
        create: { batchId: "batch-adult", studentId: "owner-1" },
      }),
    );
    expect(prisma.batchEnrollment.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: {},
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
    studioSettings: { findUnique: vi.fn() },
    invoice: { create: vi.fn() },
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
    prisma.studioSettings.findUnique.mockResolvedValue({
      platformFeePercent: 5,
    });
  });

  it("creates a pending checkout invoice without assigning membership", async () => {
    prisma.batch.findUnique.mockResolvedValue({
      id: "batch-kid",
      active: true,
      category: "KIDS",
      studioId: "studio-1",
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
        price: 2500,
      },
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
    prisma.invoice.create.mockResolvedValue({
      id: "inv-1",
      status: "PENDING",
      amount: 2500,
    });

    const invoice = await service.purchaseForBatch({
      batchId: "batch-kid",
      subscriptionId: "sub-kid-mo",
      purchaserUserId: "parent-1",
      coveredStudents: [{ studentId: "kid-1", seatRole: "KID" }],
    });

    expect(invoice).toEqual(
      expect.objectContaining({ id: "inv-1", status: "PENDING" }),
    );
    expect(prisma.invoice.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        studentId: "parent-1",
        studioId: "studio-1",
        amount: 2500,
        status: "PENDING",
        platformFeePercent: 5,
        paymentHoldExpiresAt: expect.any(Date),
        purchaseMeta: {
          batchId: "batch-kid",
          subscriptionId: "sub-kid-mo",
          purchaserUserId: "parent-1",
          coveredStudents: [
            { studentId: "kid-1", seatRole: "KID", batchId: "batch-kid" },
          ],
        },
      }),
    });
    expect(prisma.membership.create).not.toHaveBeenCalled();
    expect(prisma.batchEnrollment.upsert).not.toHaveBeenCalled();
  });
});

describe("MembershipsService.findActiveForBatch", () => {
  const prisma = {
    batch: { findUnique: vi.fn() },
    membership: { findMany: vi.fn() },
  };
  const notifications = { create: vi.fn() };
  const scheduleConflicts = {
    assertNoConflicts: vi.fn(),
    assertStudentAvailableForBatch: vi.fn(),
  };

  let service: MembershipsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new MembershipsService(
      prisma as never,
      notifications as never,
      scheduleConflicts as never,
    );
  });

  it("returns null when batch is missing", async () => {
    prisma.batch.findUnique.mockResolvedValue(null);
    await expect(
      service.findActiveForBatch("student-1", "missing"),
    ).resolves.toBeNull();
  });

  it("returns covering active membership for matching seat role", async () => {
    const at = new Date("2026-07-15T12:00:00.000Z");
    prisma.batch.findUnique.mockResolvedValue({
      id: "batch-1",
      category: "KIDS",
    });
    prisma.membership.findMany.mockResolvedValue([
      {
        id: "mem-1",
        status: "ACTIVE",
        periodStart: new Date("2026-07-01T00:00:00.000Z"),
        periodEnd: new Date("2026-07-31T23:59:59.999Z"),
        subscription: { active: true },
        coveredStudents: [{ studentId: "student-1", seatRole: "KID" }],
      },
    ]);

    const membership = await service.findActiveForBatch(
      "student-1",
      "batch-1",
      at,
    );

    expect(membership?.id).toBe("mem-1");
  });

  it("skips inactive subscriptions and wrong seat roles", async () => {
    const at = new Date("2026-07-15T12:00:00.000Z");
    prisma.batch.findUnique.mockResolvedValue({
      id: "batch-1",
      category: "ADULTS",
    });
    prisma.membership.findMany.mockResolvedValue([
      {
        id: "mem-inactive-sub",
        status: "ACTIVE",
        periodStart: new Date("2026-07-01T00:00:00.000Z"),
        periodEnd: new Date("2026-07-31T23:59:59.999Z"),
        subscription: { active: false },
        coveredStudents: [{ studentId: "student-1", seatRole: "ADULT" }],
      },
      {
        id: "mem-wrong-seat",
        status: "ACTIVE",
        periodStart: new Date("2026-07-01T00:00:00.000Z"),
        periodEnd: new Date("2026-07-31T23:59:59.999Z"),
        subscription: { active: true },
        coveredStudents: [{ studentId: "student-1", seatRole: "KID" }],
      },
    ]);

    await expect(
      service.findActiveForBatch("student-1", "batch-1", at),
    ).resolves.toBeNull();
  });
});

describe("MembershipsService.findMonthlyUnpaidStudentIds", () => {
  const prisma = {
    membershipCoveredStudent: { findMany: vi.fn() },
  };
  const notifications = { create: vi.fn() };
  const scheduleConflicts = {
    assertNoConflicts: vi.fn(),
    assertStudentAvailableForBatch: vi.fn(),
  };

  let service: MembershipsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new MembershipsService(
      prisma as never,
      notifications as never,
      scheduleConflicts as never,
    );
  });

  it("returns empty set for empty input", async () => {
    await expect(service.findMonthlyUnpaidStudentIds([])).resolves.toEqual(
      new Set(),
    );
    expect(prisma.membershipCoveredStudent.findMany).not.toHaveBeenCalled();
  });

  it("flags students with unpaid latest monthly membership", async () => {
    prisma.membershipCoveredStudent.findMany.mockResolvedValue([
      {
        studentId: "s-unpaid",
        membership: {
          status: "DUE",
          periodEnd: new Date("2026-08-01T00:00:00.000Z"),
          subscription: { billingCadence: "MONTHLY" },
          invoices: [],
        },
      },
      {
        studentId: "s-paid",
        membership: {
          status: "ACTIVE",
          periodEnd: new Date("2026-08-01T00:00:00.000Z"),
          subscription: { billingCadence: "MONTHLY" },
          invoices: [{ status: "PAID" }],
        },
      },
      {
        studentId: "s-quarterly",
        membership: {
          status: "DUE",
          periodEnd: new Date("2026-08-01T00:00:00.000Z"),
          subscription: { billingCadence: "QUARTERLY" },
          invoices: [],
        },
      },
    ]);

    await expect(
      service.findMonthlyUnpaidStudentIds([
        "s-unpaid",
        "s-paid",
        "s-quarterly",
      ]),
    ).resolves.toEqual(new Set(["s-unpaid"]));
  });
});
