import { BadRequestException } from "@nestjs/common";
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

  it("activates the due membership in place without advancing the period", async () => {
    prisma.membership.findUnique.mockResolvedValue({
      id: "mem-1",
      subscriptionId: "sub-1",
      purchaserUserId: "user-1",
      status: "DUE",
      periodStart: new Date(Date.UTC(2026, 6, 1)),
      periodEnd: new Date(Date.UTC(2026, 6, 31, 23, 59, 59, 999)),
      subscription: {
        name: "Individual Kid Monthly",
        billingCadence: "MONTHLY",
      },
      coveredStudents: [{ studentId: "student-1", seatRole: "KID" }],
    });
    prisma.membership.update.mockResolvedValue({
      id: "mem-1",
      subscriptionId: "sub-1",
      status: "ACTIVE",
      periodEnd: new Date(Date.UTC(2026, 6, 31, 23, 59, 59, 999)),
    });

    await service.renewManual("mem-1");

    expect(prisma.membership.update).toHaveBeenCalledWith({
      where: { id: "mem-1" },
      data: { status: "ACTIVE" },
      include: {
        subscription: true,
        coveredStudents: true,
      },
    });
    expect(prisma.membership.create).not.toHaveBeenCalled();
    expect(notifications.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        type: NotificationType.RENEWED,
        planName: "Individual Kid Monthly",
        meta: expect.objectContaining({
          membershipId: "mem-1",
          subscriptionId: "sub-1",
        }),
      }),
    );
  });

  it("skips RENEWED when notify is false (invoice-driven renew)", async () => {
    prisma.membership.findUnique.mockResolvedValue({
      id: "mem-1",
      subscriptionId: "sub-1",
      purchaserUserId: "user-1",
      status: "DUE",
      periodStart: new Date(Date.UTC(2026, 6, 1)),
      periodEnd: new Date(Date.UTC(2026, 6, 31, 23, 59, 59, 999)),
      subscription: {
        name: "Individual Kid Monthly",
        billingCadence: "MONTHLY",
      },
      coveredStudents: [{ studentId: "student-1", seatRole: "KID" }],
    });
    prisma.membership.update.mockResolvedValue({
      id: "mem-1",
      status: "ACTIVE",
    });

    await service.renewManual("mem-1", { notify: false });

    expect(prisma.membership.update).toHaveBeenCalled();
    expect(notifications.create).not.toHaveBeenCalled();
  });
});

describe("MembershipsService.renewFromPaidInvoice", () => {
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

  it("activates without RENEWED so billing can emit PAYMENT_RECEIVED alone", async () => {
    prisma.membership.findUnique
      .mockResolvedValueOnce({
        id: "mem-1",
        status: "DUE",
      })
      .mockResolvedValueOnce({
        id: "mem-1",
        subscriptionId: "sub-1",
        purchaserUserId: "user-1",
        status: "DUE",
        periodStart: new Date(Date.UTC(2026, 6, 1)),
        periodEnd: new Date(Date.UTC(2026, 6, 31, 23, 59, 59, 999)),
        subscription: {
          name: "Adult Monthly",
          billingCadence: "MONTHLY",
        },
        coveredStudents: [],
      });
    prisma.membership.update.mockResolvedValue({
      id: "mem-1",
      status: "ACTIVE",
    });

    await service.renewFromPaidInvoice("mem-1");

    expect(notifications.create).not.toHaveBeenCalled();
  });

  it("returns null for ACTIVE membership without notifying", async () => {
    prisma.membership.findUnique.mockResolvedValue({
      id: "mem-1",
      status: "ACTIVE",
    });

    const result = await service.renewFromPaidInvoice("mem-1");

    expect(result).toBeNull();
    expect(prisma.membership.update).not.toHaveBeenCalled();
    expect(notifications.create).not.toHaveBeenCalled();
  });
});

describe("MembershipsService.rollEndedActiveToNextDue", () => {
  const prisma = {
    membership: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    invoice: {
      findFirst: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    session: { count: vi.fn() },
    attendance: { count: vi.fn() },
    studioSettings: { findUnique: vi.fn() },
    batchEnrollment: { findFirst: vi.fn() },
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

  it("expires the ended ACTIVE period and creates the next month as DUE", async () => {
    prisma.membership.findUnique.mockResolvedValue({
      id: "mem-aug",
      subscriptionId: "sub-1",
      purchaserUserId: "user-1",
      status: "ACTIVE",
      periodEnd: new Date(Date.UTC(2026, 6, 31, 23, 59, 59, 999)),
      subscription: {
        name: "Adult Monthly",
        billingCadence: "MONTHLY",
      },
      coveredStudents: [{ studentId: "student-1", seatRole: "ADULT" }],
    });
    prisma.membership.findFirst.mockResolvedValue(null);
    prisma.membership.create.mockResolvedValue({
      id: "mem-sep",
      status: "DUE",
      periodStart: new Date(Date.UTC(2026, 7, 1)),
      periodEnd: new Date(Date.UTC(2026, 7, 31, 23, 59, 59, 999)),
    });

    const result = await service.rollEndedActiveToNextDue("mem-aug");

    expect(prisma.membership.update).toHaveBeenCalledWith({
      where: { id: "mem-aug" },
      data: { status: "EXPIRED" },
    });
    expect(prisma.membership.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        subscriptionId: "sub-1",
        purchaserUserId: "user-1",
        periodStart: new Date(Date.UTC(2026, 7, 1)),
        status: "DUE",
      }),
      include: {
        subscription: true,
        coveredStudents: true,
      },
    });
    expect(result.created).toBe(true);
    expect(result.next?.id).toBe("mem-sep");
  });

  it("reuses an existing next-period membership instead of creating another", async () => {
    prisma.membership.findUnique.mockResolvedValue({
      id: "mem-aug",
      subscriptionId: "sub-1",
      purchaserUserId: "user-1",
      status: "ACTIVE",
      periodEnd: new Date(Date.UTC(2026, 6, 31, 23, 59, 59, 999)),
      subscription: {
        name: "Adult Monthly",
        billingCadence: "MONTHLY",
      },
      coveredStudents: [{ studentId: "student-1", seatRole: "ADULT" }],
    });
    prisma.membership.findFirst.mockResolvedValue({
      id: "mem-sep-existing",
      status: "DUE",
    });

    const result = await service.rollEndedActiveToNextDue("mem-aug");

    expect(prisma.membership.create).not.toHaveBeenCalled();
    expect(result.created).toBe(false);
    expect(result.next?.id).toBe("mem-sep-existing");
  });

  it("FIRST_POSTPAID creates usage invoice and next prepaid with convert flag", async () => {
    const ended = {
      id: "mem-aug",
      subscriptionId: "sub-1",
      purchaserUserId: "user-1",
      status: "ACTIVE",
      billingPhase: "FIRST_POSTPAID",
      batchId: "batch-1",
      periodStart: new Date(Date.UTC(2026, 6, 1)),
      periodEnd: new Date(Date.UTC(2026, 6, 31, 23, 59, 59, 999)),
      subscription: {
        id: "sub-1",
        name: "Adult Monthly",
        billingCadence: "MONTHLY",
        price: 3500,
      },
      coveredStudents: [{ studentId: "student-1", seatRole: "ADULT" }],
      purchaser: { id: "user-1", studioId: "studio-1" },
    };
    const next = {
      id: "mem-sep",
      subscriptionId: "sub-1",
      purchaserUserId: "user-1",
      status: "DUE",
      billingPhase: "PREPAID",
      batchId: "batch-1",
      periodStart: new Date(Date.UTC(2026, 7, 1)),
      periodEnd: new Date(Date.UTC(2026, 7, 31, 23, 59, 59, 999)),
      subscription: ended.subscription,
      coveredStudents: ended.coveredStudents,
      purchaser: ended.purchaser,
    };

    prisma.membership.findUnique.mockImplementation(({ where }) => {
      if (where.id === "mem-aug") return Promise.resolve(ended);
      if (where.id === "mem-sep") return Promise.resolve(next);
      return Promise.resolve(null);
    });
    prisma.invoice.findFirst.mockResolvedValue(null);
    prisma.session.count.mockResolvedValue(10);
    prisma.attendance.count.mockResolvedValue(5);
    prisma.studioSettings.findUnique.mockResolvedValue({
      platformFeePercent: 5,
    });
    prisma.batchEnrollment.findFirst.mockResolvedValue({ id: "enr-1" });
    prisma.membership.findFirst.mockResolvedValue(null);
    prisma.membership.create.mockResolvedValue(next);
    prisma.invoice.create.mockResolvedValue({ id: "inv-usage" });

    const result = await service.rollEndedActiveToNextDue("mem-aug");

    expect(prisma.invoice.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        chargeType: "POSTPAID_PRORATED",
        amount: 1750,
        attendedSessionCount: 5,
        billedSessionCount: 10,
        membershipId: "mem-aug",
      }),
    });
    expect(prisma.membership.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        billingPhase: "PREPAID",
        status: "DUE",
        batchId: "batch-1",
      }),
      include: {
        subscription: true,
        coveredStudents: true,
      },
    });
    expect(prisma.invoice.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        chargeType: "PREPAID_FULL",
        amount: 3500,
        membershipId: "mem-sep",
        purchaseMeta: expect.objectContaining({
          firstMonthConvertToQuarterly: true,
        }),
      }),
    });
    expect(result.created).toBe(true);
  });

  it("FIRST_POSTPAID with zero attendance skips usage invoice", async () => {
    prisma.membership.findUnique.mockResolvedValue({
      id: "mem-aug",
      subscriptionId: "sub-1",
      purchaserUserId: "user-1",
      status: "ACTIVE",
      billingPhase: "FIRST_POSTPAID",
      batchId: "batch-1",
      periodStart: new Date(Date.UTC(2026, 6, 1)),
      periodEnd: new Date(Date.UTC(2026, 6, 31, 23, 59, 59, 999)),
      subscription: {
        id: "sub-1",
        name: "Adult Monthly",
        billingCadence: "MONTHLY",
        price: 3500,
      },
      coveredStudents: [{ studentId: "student-1", seatRole: "ADULT" }],
      purchaser: { id: "user-1", studioId: "studio-1" },
    });
    prisma.invoice.findFirst.mockResolvedValue(null);
    prisma.session.count.mockResolvedValue(10);
    prisma.attendance.count.mockResolvedValue(0);
    prisma.batchEnrollment.findFirst.mockResolvedValue(null);
    prisma.invoice.deleteMany.mockResolvedValue({ count: 0 });

    const result = await service.rollEndedActiveToNextDue("mem-aug");

    expect(prisma.invoice.create).not.toHaveBeenCalled();
    expect(prisma.membership.create).not.toHaveBeenCalled();
    expect(result.next).toBeNull();
  });
});

describe("MembershipsService.convertUpcomingInvoiceToQuarterly", () => {
  const prisma = {
    invoice: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    membership: { update: vi.fn() },
    batchPlan: { findFirst: vi.fn() },
    $transaction: vi.fn(),
  };
  const notifications = { create: vi.fn() };
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

  it("rejects prepaid-at-join invoices without the convert flag", async () => {
    prisma.invoice.findUnique.mockResolvedValue({
      id: "inv-1",
      status: "PENDING",
      chargeType: "PREPAID_FULL",
      purchaseMeta: { batchId: "batch-1", subscriptionId: "sub-m" },
      membership: {
        id: "mem-1",
        batchId: "batch-1",
        periodStart: new Date(Date.UTC(2026, 7, 1)),
        subscription: {
          billingCadence: "MONTHLY",
          individualAudience: "ADULT",
        },
      },
    });

    await expect(
      service.convertUpcomingInvoiceToQuarterly("inv-1"),
    ).rejects.toThrow(/first-month bill/i);
  });

  it("rejects usage invoices", async () => {
    prisma.invoice.findUnique.mockResolvedValue({
      id: "inv-usage",
      status: "PENDING",
      chargeType: "POSTPAID_PRORATED",
      purchaseMeta: { firstMonthConvertToQuarterly: true },
      membership: {
        id: "mem-1",
        subscription: { billingCadence: "MONTHLY" },
      },
    });

    await expect(
      service.convertUpcomingInvoiceToQuarterly("inv-usage"),
    ).rejects.toThrow(/upcoming prepaid/i);
  });

  it("converts the unpaid first-month prepaid to the batch quarterly plan", async () => {
    const invoice = {
      id: "inv-next",
      status: "PENDING",
      chargeType: "PREPAID_FULL",
      purchaseMeta: {
        batchId: "batch-1",
        subscriptionId: "sub-m",
        firstMonthConvertToQuarterly: true,
        purchaserUserId: "user-1",
        coveredStudents: [],
      },
      membership: {
        id: "mem-sep",
        batchId: "batch-1",
        periodStart: new Date(Date.UTC(2026, 7, 1)),
        subscription: {
          billingCadence: "MONTHLY",
          individualAudience: "ADULT",
        },
      },
    };
    prisma.invoice.findUnique.mockResolvedValue(invoice);
    prisma.batchPlan.findFirst.mockResolvedValue({
      subscriptionId: "sub-q",
      subscription: { id: "sub-q", price: 9000 },
    });
    prisma.membership.update.mockResolvedValue({ id: "mem-sep" });
    prisma.invoice.update.mockResolvedValue({
      ...invoice,
      amount: 9000,
    });
    prisma.$transaction.mockImplementation((ops: unknown[]) =>
      Promise.all(ops as Promise<unknown>[]),
    );

    const result = await service.convertUpcomingInvoiceToQuarterly("inv-next");

    expect(prisma.membership.update).toHaveBeenCalledWith({
      where: { id: "mem-sep" },
      data: expect.objectContaining({
        subscriptionId: "sub-q",
      }),
    });
    expect(prisma.invoice.update).toHaveBeenCalledWith({
      where: { id: "inv-next" },
      data: expect.objectContaining({
        amount: 9000,
        purchaseMeta: expect.objectContaining({
          subscriptionId: "sub-q",
          firstMonthConvertToQuarterly: false,
        }),
      }),
    });
    expect(result.invoice.amount).toBe(9000);
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
    batchEnrollment: { findFirst: vi.fn() },
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
    prisma.membership.findUnique
      .mockResolvedValueOnce({
        id: "mem-1",
        status: "DUE",
      })
      .mockResolvedValueOnce({
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
    prisma.membership.findUnique
      .mockResolvedValueOnce({
        id: "mem-1",
        status: "EXPIRED",
      })
      .mockResolvedValueOnce({
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

  it("returns an existing overdue renewal invoice without creating another", async () => {
    prisma.membership.findUnique.mockResolvedValue({
      id: "mem-1",
      purchaserUserId: "user-1",
      status: "DUE",
      subscription: { price: 2000 },
      purchaser: { id: "user-1", studioId: "studio-1" },
    });
    prisma.invoice.findFirst.mockResolvedValue({
      id: "inv-overdue",
      status: "OVERDUE",
    });

    const result = await service.ensureRenewalInvoice("mem-1");

    expect(result.created).toBe(false);
    expect(result.invoice.id).toBe("inv-overdue");
    expect(prisma.invoice.create).not.toHaveBeenCalled();
    expect(prisma.invoice.findFirst).toHaveBeenCalledWith({
      where: {
        membershipId: "mem-1",
        status: { in: ["PENDING", "OVERDUE"] },
      },
      orderBy: { id: "desc" },
    });
  });

  it("ensureRenewalInvoice creates pending invoice at plan price", async () => {
    prisma.membership.findUnique.mockResolvedValue({
      id: "mem-1",
      purchaserUserId: "user-1",
      subscriptionId: "sub-1",
      status: "EXPIRED",
      subscription: { price: 3500 },
      coveredStudents: [{ studentId: "user-1", seatRole: "ADULT" }],
      purchaser: { id: "user-1", studioId: "studio-1" },
    });
    prisma.invoice.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({
      purchaseMeta: {
        batchId: "batch-1",
        subscriptionId: "sub-1",
        purchaserUserId: "user-1",
        coveredStudents: [
          { studentId: "user-1", seatRole: "ADULT", batchId: "batch-1" },
        ],
      },
    });
    prisma.studioSettings.findUnique.mockResolvedValue({
      platformFeePercent: 5,
    });
    prisma.invoice.create.mockResolvedValue({
      id: "inv-new",
      status: "PENDING",
      membershipId: "mem-1",
      amount: 3500,
    });

    const result = await service.ensureRenewalInvoice("mem-1");

    expect(result.created).toBe(true);
    expect(prisma.invoice.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        studentId: "user-1",
        studioId: "studio-1",
        membershipId: "mem-1",
        amount: 3500,
        status: "PENDING",
        purchaseMeta: {
          batchId: "batch-1",
          subscriptionId: "sub-1",
          purchaserUserId: "user-1",
          coveredStudents: [
            { studentId: "user-1", seatRole: "ADULT", batchId: "batch-1" },
          ],
        },
      }),
    });
  });

  it("requestRenewalInvoice rejects active memberships", async () => {
    prisma.membership.findUnique.mockResolvedValue({
      id: "mem-1",
      status: "ACTIVE",
    });

    await expect(service.requestRenewalInvoice("mem-1")).rejects.toBeInstanceOf(
      BadRequestException,
    );
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
        update: expect.objectContaining({ status: "ACTIVE" }),
        create: expect.objectContaining({
          batchId: "batch-adult",
          studentId: "owner-1",
          status: "ACTIVE",
        }),
      }),
    );
    expect(prisma.batchEnrollment.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ status: "ACTIVE" }),
        create: expect.objectContaining({
          batchId: "batch-kid",
          studentId: "kid-1",
          status: "ACTIVE",
        }),
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

  it("skips checkout hold when paymentHold is false", async () => {
    prisma.batch.findUnique.mockResolvedValue({
      id: "batch-kid",
      active: true,
      category: "KIDS",
      studioId: "studio-1",
    });
    prisma.studioSettings.findUnique.mockResolvedValue({
      platformFeePercent: 5,
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
      id: "inv-2",
      status: "PENDING",
      amount: 2500,
    });

    await service.purchaseForBatch({
      batchId: "batch-kid",
      subscriptionId: "sub-kid-mo",
      purchaserUserId: "parent-1",
      coveredStudents: [{ studentId: "kid-1", seatRole: "KID" }],
      paymentHold: false,
    });

    expect(prisma.invoice.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        studentId: "parent-1",
        status: "PENDING",
        purchaseMeta: expect.any(Object),
      }),
    });
    const createData = prisma.invoice.create.mock.calls[0]?.[0]?.data;
    expect(createData).not.toHaveProperty("paymentHoldExpiresAt");
  });

  it("rejects family packs on batch purchase", async () => {
    prisma.batch.findUnique.mockResolvedValue({
      id: "batch-kid",
      active: true,
      category: "KIDS",
      studioId: "studio-1",
    });
    prisma.batchPlan.findUnique.mockResolvedValue({
      batchId: "batch-kid",
      subscriptionId: "sub-fam",
      subscription: {
        id: "sub-fam",
        active: true,
        kind: "FAMILY",
        individualAudience: null,
        adultSeats: 1,
        kidSeats: 1,
        billingCadence: "MONTHLY",
        price: 5000,
      },
    });

    await expect(
      service.purchaseForBatch({
        batchId: "batch-kid",
        subscriptionId: "sub-fam",
        purchaserUserId: "parent-1",
        coveredStudents: [
          { studentId: "adult-1", seatRole: "ADULT", batchId: "batch-adult" },
          { studentId: "kid-1", seatRole: "KID" },
        ],
      }),
    ).rejects.toThrow(/studio-wide/i);
  });

  it("creates one pending invoice per student without capacity locking", async () => {
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
    prisma.invoice.create
      .mockResolvedValueOnce({
        id: "inv-a",
        status: "PENDING",
        amount: 2500,
        studentId: "kid-1",
      })
      .mockResolvedValueOnce({
        id: "inv-b",
        status: "PENDING",
        amount: 2500,
        studentId: "kid-2",
      });

    const invoices = await service.purchaseForBatchBulk({
      batchId: "batch-kid",
      subscriptionId: "sub-kid-mo",
      studentIds: ["kid-1", "kid-2"],
      paymentHold: false,
    });

    expect(invoices).toHaveLength(2);
    expect(prisma.invoice.create).toHaveBeenCalledTimes(2);
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(
      scheduleConflicts.assertStudentAvailableForBatch,
    ).toHaveBeenCalledTimes(2);
    expect(prisma.invoice.create).toHaveBeenNthCalledWith(1, {
      data: expect.objectContaining({
        studentId: "kid-1",
        amount: 2500,
        status: "PENDING",
      }),
    });
    expect(prisma.invoice.create).toHaveBeenNthCalledWith(2, {
      data: expect.objectContaining({
        studentId: "kid-2",
        amount: 2500,
        status: "PENDING",
      }),
    });
  });

  it("rejects duplicate students on bulk batch purchase", async () => {
    await expect(
      service.purchaseForBatchBulk({
        batchId: "batch-kid",
        subscriptionId: "sub-kid-mo",
        studentIds: ["kid-1", "kid-1"],
        paymentHold: false,
      }),
    ).rejects.toThrow(/duplicate/i);
  });
});

describe("MembershipsService.purchaseFamily", () => {
  const prisma = {
    batch: { findMany: vi.fn() },
    subscription: { findUnique: vi.fn() },
    studioSettings: { findUnique: vi.fn() },
    invoice: { create: vi.fn() },
    batchEnrollment: { findMany: vi.fn() },
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

  it("rejects family pack purchase (removed flow)", async () => {
    await expect(
      service.purchaseFamily({
        studioId: "studio-1",
        subscriptionId: "sub-fam",
        purchaserUserId: "adult-1",
        coveredStudents: [
          { studentId: "adult-1", seatRole: "ADULT", batchId: "batch-adult" },
          { studentId: "kid-1", seatRole: "KID", batchId: "batch-kid" },
        ],
      }),
    ).rejects.toThrow(/removed/i);
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
    invoice: { findMany: vi.fn() },
  };
  const notifications = { create: vi.fn() };
  const scheduleConflicts = {
    assertNoConflicts: vi.fn(),
    assertStudentAvailableForBatch: vi.fn(),
  };

  let service: MembershipsService;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma.invoice.findMany.mockResolvedValue([]);
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
        studentId: "s-postpaid",
        membership: {
          status: "ACTIVE",
          periodEnd: new Date("2026-08-01T00:00:00.000Z"),
          billingPhase: "FIRST_POSTPAID",
          subscription: { billingCadence: "MONTHLY" },
          invoices: [],
        },
      },
    ]);

    await expect(
      service.findMonthlyUnpaidStudentIds(["s-unpaid", "s-paid", "s-postpaid"]),
    ).resolves.toEqual(new Set(["s-unpaid"]));
  });

  it("flags enrolled students with pending purchase invoices", async () => {
    prisma.membershipCoveredStudent.findMany.mockResolvedValue([]);
    prisma.invoice.findMany.mockResolvedValue([
      {
        studentId: "s-pending",
        purchaseMeta: {
          subscriptionId: "sub-1",
          purchaserUserId: "s-pending",
          coveredStudents: [{ studentId: "s-pending", seatRole: "KID" }],
        },
        membership: null,
      },
    ]);

    await expect(
      service.findMonthlyUnpaidStudentIds(["s-pending", "s-other"]),
    ).resolves.toEqual(new Set(["s-pending"]));
  });
});

describe("MembershipsService.findStudentIdsWithActiveMonthForBatch", () => {
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

  it("returns empty set for empty student ids", async () => {
    await expect(
      service.findStudentIdsWithActiveMonthForBatch([], "KIDS"),
    ).resolves.toEqual(new Set());
    expect(prisma.membershipCoveredStudent.findMany).not.toHaveBeenCalled();
  });

  it("returns students whose seat role covers the batch category", async () => {
    const at = new Date("2026-07-15T12:00:00.000Z");
    prisma.membershipCoveredStudent.findMany.mockResolvedValue([
      {
        studentId: "s-kid",
        seatRole: "KID",
        membership: {
          status: "ACTIVE",
          periodStart: new Date("2026-07-01T00:00:00.000Z"),
          periodEnd: new Date("2026-07-31T23:59:59.999Z"),
        },
      },
    ]);

    await expect(
      service.findStudentIdsWithActiveMonthForBatch(
        ["s-kid", "s-other"],
        "KIDS",
        at,
      ),
    ).resolves.toEqual(new Set(["s-kid"]));

    expect(prisma.membershipCoveredStudent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          studentId: { in: ["s-kid", "s-other"] },
          seatRole: "KID",
        }),
      }),
    );
  });
});

describe("MembershipsService.beginBatchEnrollment", () => {
  const prisma = {
    batch: { findUnique: vi.fn(), findMany: vi.fn() },
    batchPlan: { findUnique: vi.fn() },
    subscription: { findUnique: vi.fn() },
    membership: { findFirst: vi.fn(), create: vi.fn() },
    session: { findFirst: vi.fn() },
    studioSettings: { findUnique: vi.fn() },
    invoice: { create: vi.fn(), update: vi.fn() },
    batchEnrollment: { findMany: vi.fn(), upsert: vi.fn() },
    booking: { updateMany: vi.fn(), findMany: vi.fn() },
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
    prisma.membership.findFirst.mockResolvedValue(null);
    prisma.batch.findUnique.mockResolvedValue({
      id: "batch-kid",
      active: true,
      category: "KIDS",
      studioId: "studio-1",
      name: "Kids Ballet",
      capacity: 15,
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
    prisma.subscription.findUnique.mockResolvedValue({
      id: "sub-kid-mo",
      active: true,
      billingCadence: "MONTHLY",
    });
    prisma.invoice.create.mockResolvedValue({
      id: "inv-1",
      status: "PENDING",
      amount: 2500,
    });
    prisma.invoice.update.mockResolvedValue({
      id: "inv-1",
      status: "PENDING",
      amount: 2500,
      membershipId: "mem-1",
    });
    prisma.membership.create.mockResolvedValue({
      id: "mem-1",
      status: "ACTIVE",
      billingPhase: "PREPAID",
    });
  });

  it("staff prepaid enroll assigns an ACTIVE membership and links the invoice", async () => {
    prisma.session.findFirst.mockResolvedValue(null);

    const result = await service.beginBatchEnrollment({
      batchId: "batch-kid",
      subscriptionId: "sub-kid-mo",
      studentId: "kid-1",
      paymentHold: false,
    });

    expect(result.kind).toBe("prepaid");
    expect(prisma.membership.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: "ACTIVE",
        billingPhase: "PREPAID",
        batchId: "batch-kid",
        purchaserUserId: "kid-1",
      }),
    });
    expect(prisma.invoice.update).toHaveBeenCalledWith({
      where: { id: "inv-1" },
      data: { membershipId: "mem-1" },
    });
    expect(result.invoice).toEqual(
      expect.objectContaining({ id: "inv-1", membershipId: "mem-1" }),
    );
  });

  it("discover prepaid checkout does not assign membership until payment", async () => {
    prisma.session.findFirst.mockResolvedValue(null);

    const result = await service.beginBatchEnrollment({
      batchId: "batch-kid",
      subscriptionId: "sub-kid-mo",
      studentId: "kid-1",
      paymentHold: true,
    });

    expect(result.kind).toBe("prepaid");
    expect(prisma.membership.create).not.toHaveBeenCalled();
    expect(prisma.invoice.update).not.toHaveBeenCalled();
  });

  it("joins after the first session this month as postpaid without an invoice", async () => {
    prisma.session.findFirst.mockResolvedValue({
      startsAt: new Date(Date.now() - 60 * 60 * 1000),
    });

    const result = await service.beginBatchEnrollment({
      batchId: "batch-kid",
      subscriptionId: "sub-kid-mo",
      studentId: "kid-1",
      paymentHold: false,
    });

    expect(result).toEqual({ kind: "postpaid", invoice: null });
    expect(prisma.invoice.create).not.toHaveBeenCalled();
    expect(prisma.membership.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        billingPhase: "FIRST_POSTPAID",
        status: "ACTIVE",
      }),
    });
  });
});
