import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from "@nestjs/common";
import {
  BatchCategory,
  BillingCadence,
  EnrollmentMode,
  IndividualAudience,
  SubscriptionKind,
  UserRole,
} from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BatchesService } from "./batches.service";

describe("BatchesService branch validation", () => {
  const prisma = {
    user: { findMany: vi.fn() },
    studioBranch: { findUnique: vi.fn() },
    certificateTemplate: { findUnique: vi.fn() },
    subscription: { findMany: vi.fn() },
    batch: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    batchTrainer: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    session: {
      findMany: vi.fn(),
      deleteMany: vi.fn(),
      createMany: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  };

  const scheduleConflicts = {
    assertNoConflicts: vi.fn().mockResolvedValue(undefined),
    assertStudentAvailableForBatch: vi.fn().mockResolvedValue(undefined),
  };

  const trialSlotsCache = {
    invalidate: vi.fn().mockResolvedValue(undefined),
  };

  const media = {
    signReadUrl: vi.fn(async (url: string | null) => url),
  };

  const memberships = {
    purchaseForBatch: vi.fn(),
  };

  const kidPlans = [
    {
      id: "sub-kid-mo",
      studioId: "studio-1",
      active: true,
      kind: "INDIVIDUAL",
      individualAudience: "KID",
      billingCadence: BillingCadence.MONTHLY,
    },
    {
      id: "sub-kid-qtr",
      studioId: "studio-1",
      active: true,
      kind: "INDIVIDUAL",
      individualAudience: "KID",
      billingCadence: BillingCadence.QUARTERLY,
    },
  ];

  const createPayload = {
    studioId: "studio-1",
    name: "Kids",
    category: "KIDS" as const,
    branchId: "branch-1",
    trainerIds: ["trainer-1"],
    danceCategories: [{ name: "Hip-hop", description: "Basics" }],
    scheduleJson: {
      frequency: "WEEKLY" as const,
      weekdays: [1],
      startDate: "2026-07-20",
      endDate: "2026-07-27",
      startTime: "18:00",
      endTime: "19:00",
      utcOffsetMinutes: -330,
    },
    capacity: 12,
    enrollmentMode: "STAFF_ONLY" as const,
    subscriptionIds: ["sub-kid-mo", "sub-kid-qtr"],
  };

  let service: BatchesService;

  beforeEach(() => {
    vi.clearAllMocks();
    scheduleConflicts.assertNoConflicts.mockResolvedValue(undefined);
    scheduleConflicts.assertStudentAvailableForBatch.mockResolvedValue(
      undefined,
    );
    service = new BatchesService(
      prisma as never,
      {
        decryptUser: (user: unknown) => user,
      } as never,
      scheduleConflicts as never,
      trialSlotsCache as never,
      media as never,
      memberships as never,
      { refundInvoice: vi.fn() } as never,
      { announceMembersJoined: vi.fn().mockResolvedValue(undefined) } as never,
    );
    prisma.$transaction.mockImplementation(
      async (callback: (tx: typeof prisma) => unknown) => callback(prisma),
    );
    prisma.user.findMany.mockResolvedValue([
      {
        id: "trainer-1",
        studioId: "studio-1",
        role: UserRole.TRAINER,
      },
    ]);
    prisma.subscription.findMany.mockResolvedValue(kidPlans);
  });

  it("rejects a branch from another studio", async () => {
    prisma.studioBranch.findUnique.mockResolvedValue({
      id: "branch-other",
      studioId: "studio-2",
    });

    await expect(
      service.create("owner-1", {
        ...createPayload,
        branchId: "branch-other",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.batch.create).not.toHaveBeenCalled();
  });

  it("creates a batch when the branch belongs to the studio", async () => {
    prisma.studioBranch.findUnique.mockResolvedValue({
      id: "branch-1",
      studioId: "studio-1",
    });
    prisma.batch.create.mockResolvedValue({
      id: "batch-1",
      plans: kidPlans.map((subscription) => ({ subscription })),
    });

    await service.create("owner-1", createPayload);

    expect(scheduleConflicts.assertNoConflicts).toHaveBeenCalledWith(
      expect.objectContaining({
        trainerIds: ["trainer-1"],
        branchId: "branch-1",
      }),
    );
    expect(prisma.batch.create).toHaveBeenCalled();
    expect(prisma.batch.create.mock.calls[0]?.[0]?.data?.branchId).toBe(
      "branch-1",
    );
    expect(prisma.batch.create.mock.calls[0]?.[0]?.data?.plans).toEqual({
      create: [
        { subscriptionId: "sub-kid-mo" },
        { subscriptionId: "sub-kid-qtr" },
      ],
    });
  });

  it("rejects create when a schedule conflict exists", async () => {
    prisma.studioBranch.findUnique.mockResolvedValue({
      id: "branch-1",
      studioId: "studio-1",
    });
    scheduleConflicts.assertNoConflicts.mockRejectedValue(
      new ConflictException(
        "Trainer is already booked at 2026-07-20T12:30:00.000Z",
      ),
    );

    await expect(
      service.create("owner-1", createPayload),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.batch.create).not.toHaveBeenCalled();
  });
});
describe("BatchesService update", () => {
  const prisma = {
    user: { findMany: vi.fn() },
    studioBranch: { findUnique: vi.fn() },
    certificateTemplate: { findUnique: vi.fn() },
    subscription: { findMany: vi.fn() },
    batch: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    batchTrainer: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    batchPlan: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    batchEnrollment: {
      findMany: vi.fn(),
    },
    booking: {
      updateMany: vi.fn(),
      findMany: vi.fn(),
    },
    session: {
      findMany: vi.fn(),
      deleteMany: vi.fn(),
      createMany: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
    $queryRaw: vi.fn(),
  };

  let service: BatchesService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new BatchesService(
      prisma as never,
      {
        decryptUser: (user: unknown) => user,
      } as never,
      {
        assertNoConflicts: vi.fn().mockResolvedValue(undefined),
        assertStudentAvailableForBatch: vi.fn().mockResolvedValue(undefined),
      } as never,
      {
        invalidate: vi.fn().mockResolvedValue(undefined),
      } as never,
      {
        signReadUrl: vi.fn(async (url: string | null) => url),
      } as never,
      {
        purchaseForBatch: vi.fn(),
      } as never,
      { refundInvoice: vi.fn() } as never,
      { announceMembersJoined: vi.fn().mockResolvedValue(undefined) } as never,
    );
    prisma.$transaction.mockImplementation(
      async (callback: (tx: typeof prisma) => unknown) => callback(prisma),
    );
    prisma.batch.findUnique.mockResolvedValue({
      id: "batch-1",
      studioId: "studio-1",
      category: BatchCategory.ADULTS,
      branchId: "branch-1",
      certificationEnabled: false,
      certificateTemplateId: null,
    });
    prisma.batch.update.mockResolvedValue({ id: "batch-1", plans: [] });
    prisma.session.findMany.mockResolvedValue([]);
    prisma.$queryRaw.mockResolvedValue([{ id: "batch-1" }]);
    prisma.batchEnrollment.findMany.mockResolvedValue([]);
    prisma.booking.updateMany.mockResolvedValue({ count: 0 });
    prisma.booking.findMany.mockResolvedValue([]);
  });

  it("rejects trainers from another studio", async () => {
    prisma.user.findMany.mockResolvedValue([
      {
        id: "trainer-1",
        studioId: "studio-2",
        role: UserRole.TRAINER,
      },
    ]);

    await expect(
      service.update("batch-1", {
        trainerIds: ["trainer-1"],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.batch.update).not.toHaveBeenCalled();
  });

  it("replaces trainers and syncs sessions when schedule changes", async () => {
    prisma.user.findMany.mockResolvedValue([
      {
        id: "trainer-1",
        studioId: "studio-1",
        role: UserRole.TRAINER,
      },
      {
        id: "trainer-2",
        studioId: "studio-1",
        role: UserRole.TRAINER,
      },
    ]);

    await service.update("batch-1", {
      trainerIds: ["trainer-1", "trainer-2"],
      danceCategories: [{ name: "Jazz", description: "Foundations" }],
      scheduleJson: {
        frequency: "WEEKLY",
        weekdays: [1],
        startDate: "2026-07-20",
        endDate: "2026-07-27",
        startTime: "18:00",
        endTime: "19:00",
        utcOffsetMinutes: -330,
      },
    });

    expect(prisma.batchTrainer.deleteMany).toHaveBeenCalledWith({
      where: { batchId: "batch-1" },
    });
    expect(prisma.batchTrainer.createMany).toHaveBeenCalledWith({
      data: [
        { batchId: "batch-1", trainerId: "trainer-1" },
        { batchId: "batch-1", trainerId: "trainer-2" },
      ],
    });
    expect(prisma.session.createMany).toHaveBeenCalled();
    expect(prisma.batch.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "batch-1" },
        data: expect.objectContaining({
          danceCategories: [{ name: "Jazz", description: "Foundations" }],
        }),
      }),
    );
  });

  it("replaces linked subscription plans", async () => {
    prisma.subscription.findMany.mockResolvedValue([
      {
        id: "sub-month",
        studioId: "studio-1",
        active: true,
        kind: SubscriptionKind.INDIVIDUAL,
        individualAudience: IndividualAudience.ADULT,
        billingCadence: BillingCadence.MONTHLY,
      },
      {
        id: "sub-quarter",
        studioId: "studio-1",
        active: true,
        kind: SubscriptionKind.INDIVIDUAL,
        individualAudience: IndividualAudience.ADULT,
        billingCadence: BillingCadence.QUARTERLY,
      },
    ]);
    prisma.batch.update.mockResolvedValue({
      id: "batch-1",
      plans: [
        {
          subscription: {
            id: "sub-month",
            name: "Adult monthly",
            kind: SubscriptionKind.INDIVIDUAL,
            individualAudience: IndividualAudience.ADULT,
            familyPack: null,
            billingCadence: BillingCadence.MONTHLY,
            adultSeats: 1,
            kidSeats: 0,
            price: 2000,
            active: true,
          },
        },
        {
          subscription: {
            id: "sub-quarter",
            name: "Adult quarterly",
            kind: SubscriptionKind.INDIVIDUAL,
            individualAudience: IndividualAudience.ADULT,
            familyPack: null,
            billingCadence: BillingCadence.QUARTERLY,
            adultSeats: 1,
            kidSeats: 0,
            price: 5000,
            active: true,
          },
        },
      ],
    });

    const result = await service.update("batch-1", {
      subscriptionIds: ["sub-month", "sub-quarter"],
    });

    expect(prisma.batchPlan.deleteMany).toHaveBeenCalledWith({
      where: { batchId: "batch-1" },
    });
    expect(prisma.batchPlan.createMany).toHaveBeenCalledWith({
      data: [
        { batchId: "batch-1", subscriptionId: "sub-month" },
        { batchId: "batch-1", subscriptionId: "sub-quarter" },
      ],
    });
    expect(result.plans).toHaveLength(2);
  });

  it("rejects capacity below occupied seats", async () => {
    prisma.batchEnrollment.findMany.mockResolvedValue([
      { studentId: "student-1" },
      { studentId: "student-2" },
    ]);
    prisma.booking.findMany.mockResolvedValue([{ studentId: "student-3" }]);

    await expect(service.update("batch-1", { capacity: 2 })).rejects.toSatisfy(
      (error: unknown) => {
        expect(error).toBeInstanceOf(ConflictException);
        expect((error as ConflictException).message).toContain(
          "occupied seats (3)",
        );
        return true;
      },
    );
    expect(prisma.batch.update).not.toHaveBeenCalled();
  });

  it("allows capacity equal to occupied seats", async () => {
    prisma.batchEnrollment.findMany.mockResolvedValue([
      { studentId: "student-1" },
      { studentId: "student-2" },
    ]);
    prisma.booking.findMany.mockResolvedValue([
      { studentId: "student-1" },
      { studentId: "student-2" },
    ]);

    await expect(service.update("batch-1", { capacity: 2 })).resolves.toEqual({
      id: "batch-1",
      plans: [],
      price: null,
    });
    expect(prisma.batch.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "batch-1" },
        data: expect.objectContaining({ capacity: 2 }),
      }),
    );
  });
});

describe("BatchesService getRevenue", () => {
  const prisma = {
    batch: { findUnique: vi.fn() },
    invoice: { findMany: vi.fn() },
    batchEnrollment: { findMany: vi.fn() },
  };

  let service: BatchesService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new BatchesService(
      prisma as never,
      {
        decryptUser: (user: unknown) => user,
      } as never,
      {
        assertNoConflicts: vi.fn().mockResolvedValue(undefined),
        assertStudentAvailableForBatch: vi.fn().mockResolvedValue(undefined),
      } as never,
      {
        invalidate: vi.fn().mockResolvedValue(undefined),
      } as never,
      {
        signReadUrl: vi.fn(async (url: string | null) => url),
      } as never,
      {
        purchaseForBatch: vi.fn(),
      } as never,
      { refundInvoice: vi.fn() } as never,
      { announceMembersJoined: vi.fn().mockResolvedValue(undefined) } as never,
    );
  });

  it("aggregates membership invoices for enrolled students", async () => {
    prisma.batch.findUnique.mockResolvedValue({
      id: "batch-1",
      studioId: "studio-1",
      enrollments: [{ studentId: "student-1", status: "ACTIVE" }],
    });
    prisma.batchEnrollment.findMany.mockResolvedValue([
      { studentId: "student-1", batchId: "batch-1" },
    ]);
    prisma.invoice.findMany.mockResolvedValue([
      {
        studentId: "student-1",
        membershipId: "mem-1",
        amount: 2500,
        status: "PAID",
        paidAt: new Date("2026-07-01T12:00:00.000Z"),
        combineMeta: null,
        purchaseMeta: {
          batchId: "batch-1",
          subscriptionId: "sub-monthly",
          purchaserUserId: "student-1",
          coveredStudents: [
            { studentId: "student-1", seatRole: "KID", batchId: "batch-1" },
          ],
        },
        membership: {
          subscription: {
            id: "sub-monthly",
            name: "Monthly",
            billingCadence: BillingCadence.MONTHLY,
          },
        },
      },
      {
        studentId: "student-1",
        membershipId: "mem-2",
        amount: 6500,
        status: "PENDING",
        paidAt: null,
        combineMeta: null,
        purchaseMeta: {
          batchId: "batch-1",
          subscriptionId: "sub-quarterly",
          purchaserUserId: "student-1",
          coveredStudents: [
            { studentId: "student-1", seatRole: "KID", batchId: "batch-1" },
          ],
        },
        membership: {
          subscription: {
            id: "sub-quarterly",
            name: "Quarterly",
            billingCadence: BillingCadence.QUARTERLY,
          },
        },
      },
    ]);

    const result = await service.getRevenue("batch-1");

    expect(result.period).toBe("all");
    expect(result.enrolledCount).toBe(1);
    expect(result.totals).toEqual({
      collected: 2500,
      pending: 6500,
      overdue: 0,
      invoiceCount: 2,
    });
    expect(result.bySubscription).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subscriptionId: "sub-monthly",
          collected: 2500,
          pending: 0,
        }),
        expect.objectContaining({
          subscriptionId: "sub-quarterly",
          collected: 0,
          pending: 6500,
        }),
      ]),
    );
  });

  it("month period counts only paid invoices paid this month", async () => {
    const now = new Date();
    const thisMonthPaid = new Date(now.getFullYear(), now.getMonth(), 10, 12);
    const lastMonthPaid = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      10,
      12,
    );

    prisma.batch.findUnique.mockResolvedValue({
      id: "batch-1",
      studioId: "studio-1",
      enrollments: [{ studentId: "student-1", status: "ACTIVE" }],
    });
    prisma.batchEnrollment.findMany.mockResolvedValue([
      { studentId: "student-1", batchId: "batch-1" },
    ]);
    prisma.invoice.findMany.mockResolvedValue([
      {
        studentId: "student-1",
        membershipId: "mem-current",
        amount: 2500,
        status: "PAID",
        paidAt: thisMonthPaid,
        combineMeta: null,
        purchaseMeta: {
          batchId: "batch-1",
          subscriptionId: "sub-monthly",
          purchaserUserId: "student-1",
          coveredStudents: [
            { studentId: "student-1", seatRole: "KID", batchId: "batch-1" },
          ],
        },
        membership: {
          subscription: {
            id: "sub-monthly",
            name: "Monthly",
            billingCadence: BillingCadence.MONTHLY,
          },
        },
      },
      {
        studentId: "student-1",
        membershipId: "mem-prior",
        amount: 2500,
        status: "PAID",
        paidAt: lastMonthPaid,
        combineMeta: null,
        purchaseMeta: {
          batchId: "batch-1",
          subscriptionId: "sub-monthly",
          purchaserUserId: "student-1",
          coveredStudents: [
            { studentId: "student-1", seatRole: "KID", batchId: "batch-1" },
          ],
        },
        membership: {
          subscription: {
            id: "sub-monthly",
            name: "Monthly",
            billingCadence: BillingCadence.MONTHLY,
          },
        },
      },
      {
        studentId: "student-1",
        membershipId: "mem-pending",
        amount: 1000,
        status: "PENDING",
        paidAt: null,
        combineMeta: null,
        purchaseMeta: {
          batchId: "batch-1",
          subscriptionId: "sub-monthly",
          purchaserUserId: "student-1",
          coveredStudents: [
            { studentId: "student-1", seatRole: "KID", batchId: "batch-1" },
          ],
        },
        membership: {
          subscription: {
            id: "sub-monthly",
            name: "Monthly",
            billingCadence: BillingCadence.MONTHLY,
          },
        },
      },
    ]);

    const result = await service.getRevenue("batch-1", { period: "month" });

    expect(result.period).toBe("month");
    expect(result.from).toBeTruthy();
    expect(result.to).toBeTruthy();
    expect(result.totals).toEqual({
      collected: 2500,
      pending: 1000,
      overdue: 0,
      invoiceCount: 2,
    });
  });

  it("does not count another batch's payments for shared students (negative path)", async () => {
    prisma.batch.findUnique.mockResolvedValue({
      id: "batch-2",
      studioId: "studio-1",
      enrollments: [
        { studentId: "s1", status: "ACTIVE" },
        { studentId: "s2", status: "ACTIVE" },
      ],
    });
    prisma.batchEnrollment.findMany.mockResolvedValue([
      { studentId: "s1", batchId: "batch-1" },
      { studentId: "s1", batchId: "batch-2" },
      { studentId: "s2", batchId: "batch-1" },
      { studentId: "s2", batchId: "batch-2" },
    ]);
    prisma.invoice.findMany.mockResolvedValue([
      {
        studentId: "s1",
        membershipId: "mem-s1",
        amount: 1000,
        status: "PAID",
        combineMeta: null,
        purchaseMeta: {
          batchId: "batch-1",
          subscriptionId: "sub-1",
          purchaserUserId: "s1",
          coveredStudents: [
            { studentId: "s1", seatRole: "KID", batchId: "batch-1" },
          ],
        },
        membership: {
          subscription: {
            id: "sub-1",
            name: "Monthly",
            billingCadence: BillingCadence.MONTHLY,
          },
        },
      },
      {
        studentId: "s2",
        membershipId: "mem-s2",
        amount: 1000,
        status: "PAID",
        combineMeta: null,
        purchaseMeta: {
          batchId: "batch-1",
          subscriptionId: "sub-1",
          purchaserUserId: "s2",
          coveredStudents: [
            { studentId: "s2", seatRole: "KID", batchId: "batch-1" },
          ],
        },
        membership: {
          subscription: {
            id: "sub-1",
            name: "Monthly",
            billingCadence: BillingCadence.MONTHLY,
          },
        },
      },
      {
        studentId: "s3",
        membershipId: "mem-s3",
        amount: 1000,
        status: "PAID",
        combineMeta: null,
        purchaseMeta: {
          batchId: "batch-1",
          subscriptionId: "sub-1",
          purchaserUserId: "s3",
          coveredStudents: [
            { studentId: "s3", seatRole: "KID", batchId: "batch-1" },
          ],
        },
        membership: {
          subscription: {
            id: "sub-1",
            name: "Monthly",
            billingCadence: BillingCadence.MONTHLY,
          },
        },
      },
    ]);

    const result = await service.getRevenue("batch-2");

    expect(result.enrolledCount).toBe(2);
    expect(result.totals).toEqual({
      collected: 0,
      pending: 0,
      overdue: 0,
      invoiceCount: 0,
    });
    expect(result.bySubscription).toEqual([]);
  });
});

describe("BatchesService rate", () => {
  const prisma = {
    parentChild: { findUnique: vi.fn() },
    batch: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    batchRating: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      aggregate: vi.fn(),
    },
    $transaction: vi.fn(),
  };

  let service: BatchesService;

  const studentActor = {
    id: "student-1",
    role: UserRole.STUDENT,
  } as never;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new BatchesService(
      prisma as never,
      {
        decryptUser: (user: unknown) => user,
      } as never,
      {
        assertNoConflicts: vi.fn().mockResolvedValue(undefined),
        assertStudentAvailableForBatch: vi.fn().mockResolvedValue(undefined),
      } as never,
      {
        invalidate: vi.fn().mockResolvedValue(undefined),
      } as never,
      {
        signReadUrl: vi.fn(async (url: string | null) => url),
      } as never,
      {
        purchaseForBatch: vi.fn(),
      } as never,
      { refundInvoice: vi.fn() } as never,
      { announceMembersJoined: vi.fn().mockResolvedValue(undefined) } as never,
    );
    prisma.$transaction.mockImplementation(
      async (callback: (tx: typeof prisma) => unknown) => callback(prisma),
    );
    prisma.batch.findUnique.mockResolvedValue({
      id: "batch-1",
      enrollments: [{ studentId: "student-1" }],
    });
    prisma.batchRating.upsert.mockResolvedValue({ rating: 5 });
    prisma.batchRating.aggregate.mockResolvedValue({
      _avg: { rating: 4.5 },
      _count: { rating: 2 },
    });
    prisma.batch.update.mockResolvedValue({
      id: "batch-1",
      ratingAvg: 4.5,
      ratingCount: 2,
    });
  });

  it("rejects ratings from students who are not enrolled", async () => {
    prisma.batch.findUnique.mockResolvedValue({
      id: "batch-1",
      enrollments: [],
    });

    await expect(
      service.rate("batch-1", "student-1", 5, studentActor),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.batchRating.upsert).not.toHaveBeenCalled();
  });

  it("stores a rating and updates batch aggregates", async () => {
    await service.rate("batch-1", "student-1", 5, studentActor);

    expect(prisma.batchRating.upsert).toHaveBeenCalledWith({
      where: {
        batchId_studentId: { batchId: "batch-1", studentId: "student-1" },
      },
      update: { rating: 5 },
      create: { batchId: "batch-1", studentId: "student-1", rating: 5 },
    });
    expect(prisma.batch.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "batch-1" },
        data: {
          ratingAvg: 4.5,
          ratingCount: 2,
        },
      }),
    );
  });
});

describe("BatchesService.remove and enroll", () => {
  const prisma = {
    batch: {
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
    familyMember: { findUnique: vi.fn() },
    parentChild: { findUnique: vi.fn() },
    batchEnrollment: {
      upsert: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    booking: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      updateMany: vi.fn(),
    },
    session: {
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
    $queryRaw: vi.fn(),
  };

  const scheduleConflicts = {
    assertNoConflicts: vi.fn().mockResolvedValue(undefined),
    assertStudentAvailableForBatch: vi.fn().mockResolvedValue(undefined),
  };

  const trialSlotsCache = {
    invalidate: vi.fn().mockResolvedValue(undefined),
  };

  const media = {
    signReadUrl: vi.fn(async (url: string | null) => url),
  };

  const memberships = {
    purchaseForBatch: vi.fn(),
    purchaseForBatchBulk: vi.fn(),
    beginBatchEnrollment: vi.fn(),
  };

  const chat = {
    announceMembersJoined: vi.fn().mockResolvedValue(undefined),
  };

  let service: BatchesService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new BatchesService(
      prisma as never,
      { decryptUser: (user: unknown) => user } as never,
      scheduleConflicts as never,
      trialSlotsCache as never,
      media as never,
      memberships as never,
      { refundInvoice: vi.fn() } as never,
      chat as never,
    );
    prisma.$transaction.mockImplementation(
      async (callback: (tx: typeof prisma) => unknown) => callback(prisma),
    );
    prisma.$queryRaw.mockResolvedValue([{ id: "batch-1" }]);
    prisma.batchEnrollment.findMany.mockResolvedValue([]);
    prisma.batchEnrollment.findFirst.mockResolvedValue(null);
    prisma.booking.findMany.mockResolvedValue([]);
    prisma.booking.findFirst.mockResolvedValue(null);
    prisma.booking.updateMany.mockResolvedValue({ count: 0 });
  });

  it("deletes a batch and invalidates trial slots cache", async () => {
    prisma.batch.findUnique.mockResolvedValue({
      id: "batch-1",
      studioId: "studio-1",
      _count: { enrollments: 0 },
    });
    prisma.batch.delete.mockResolvedValue({ id: "batch-1" });

    await expect(service.remove("batch-1")).resolves.toEqual({ id: "batch-1" });
    expect(trialSlotsCache.invalidate).toHaveBeenCalledWith("studio-1");
  });

  it("rejects delete when the batch has enrolled students", async () => {
    prisma.batch.findUnique.mockResolvedValue({
      id: "batch-1",
      studioId: "studio-1",
      _count: { enrollments: 2 },
    });

    await expect(service.remove("batch-1")).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(prisma.batch.delete).not.toHaveBeenCalled();
  });

  it("rejects enroll when actor is not linked to the student", async () => {
    prisma.familyMember.findUnique.mockResolvedValue(null);
    prisma.parentChild.findUnique.mockResolvedValue(null);

    await expect(
      service.enroll(
        "batch-1",
        "student-2",
        {
          id: "student-1",
          role: UserRole.STUDENT,
        } as never,
        "sub-1",
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("rejects member self-enroll when batch is not SELF_JOIN", async () => {
    prisma.batch.findUnique.mockResolvedValue({
      id: "batch-1",
      active: true,
      capacity: 10,
      category: "ADULTS",
      enrollmentMode: EnrollmentMode.STAFF_ONLY,
      enrollments: [],
    });

    await expect(
      service.enroll(
        "batch-1",
        "student-1",
        {
          id: "student-1",
          role: UserRole.STUDENT,
        } as never,
        "sub-1",
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("enrolls with a package and creates a pending invoice", async () => {
    prisma.batch.findUnique.mockResolvedValue({
      id: "batch-1",
      active: true,
      capacity: 10,
      category: "ADULTS",
      enrollmentMode: EnrollmentMode.SELF_JOIN,
      enrollments: [],
    });
    memberships.beginBatchEnrollment.mockResolvedValue({
      kind: "prepaid",
      invoice: {
        id: "inv-1",
        amount: 2000,
        status: "PENDING",
      },
    });
    prisma.batchEnrollment.upsert.mockResolvedValue({
      id: "enroll-1",
      batchId: "batch-1",
      studentId: "student-1",
    });

    await expect(
      service.enroll(
        "batch-1",
        "student-1",
        {
          id: "student-1",
          role: UserRole.STUDENT,
        } as never,
        "sub-1",
      ),
    ).resolves.toMatchObject({
      batchId: "batch-1",
      studentId: "student-1",
      invoice: { id: "inv-1", amount: 2000 },
    });
    expect(memberships.beginBatchEnrollment).toHaveBeenCalledWith({
      batchId: "batch-1",
      subscriptionId: "sub-1",
      studentId: "student-1",
      paymentHold: false,
    });
    await vi.waitFor(() => {
      expect(chat.announceMembersJoined).toHaveBeenCalledWith(
        "student-1",
        "batch-1",
        ["student-1"],
      );
    });
  });

  it("rejects enroll when student is already enrolled", async () => {
    prisma.batch.findUnique.mockResolvedValue({
      id: "batch-1",
      active: true,
      capacity: 10,
      category: "ADULTS",
      enrollmentMode: EnrollmentMode.STAFF_ONLY,
      enrollments: [{ studentId: "student-1" }],
    });

    await expect(
      service.enroll(
        "batch-1",
        "student-1",
        { id: "staff-1", role: UserRole.STAFF } as never,
        "sub-1",
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(memberships.beginBatchEnrollment).not.toHaveBeenCalled();
    expect(chat.announceMembersJoined).not.toHaveBeenCalled();
  });

  it("bulk enrolls multiple students with one locked capacity check", async () => {
    prisma.batch.findUnique.mockResolvedValue({
      id: "batch-1",
      active: true,
      capacity: 10,
      category: "ADULTS",
      enrollmentMode: EnrollmentMode.STAFF_ONLY,
      enrollments: [],
    });
    memberships.beginBatchEnrollment
      .mockResolvedValueOnce({
        kind: "prepaid",
        invoice: { id: "inv-1", amount: 2000, status: "PENDING" },
      })
      .mockResolvedValueOnce({
        kind: "prepaid",
        invoice: { id: "inv-2", amount: 2000, status: "PENDING" },
      });
    prisma.batchEnrollment.upsert
      .mockResolvedValueOnce({
        id: "enroll-1",
        batchId: "batch-1",
        studentId: "student-1",
      })
      .mockResolvedValueOnce({
        id: "enroll-2",
        batchId: "batch-1",
        studentId: "student-2",
      });

    await expect(
      service.enrollBulk(
        "batch-1",
        ["student-1", "student-2"],
        { id: "staff-1", role: UserRole.STAFF } as never,
        "sub-1",
      ),
    ).resolves.toMatchObject({
      enrollments: [
        {
          studentId: "student-1",
          invoice: { id: "inv-1", amount: 2000 },
        },
        {
          studentId: "student-2",
          invoice: { id: "inv-2", amount: 2000 },
        },
      ],
    });
    expect(memberships.beginBatchEnrollment).toHaveBeenCalledTimes(2);
    expect(memberships.purchaseForBatch).not.toHaveBeenCalled();
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(
      memberships.beginBatchEnrollment.mock.invocationCallOrder[0]!,
    ).toBeLessThan(prisma.$transaction.mock.invocationCallOrder[0]!);
    await vi.waitFor(() => {
      expect(chat.announceMembersJoined).toHaveBeenCalledWith(
        "staff-1",
        "batch-1",
        ["student-1", "student-2"],
      );
    });
  });

  it("rejects bulk enroll for non-staff actors", async () => {
    await expect(
      service.enrollBulk(
        "batch-1",
        ["student-1", "student-2"],
        { id: "student-1", role: UserRole.STUDENT } as never,
        "sub-1",
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.batch.findUnique).not.toHaveBeenCalled();
  });

  it("rejects bulk enroll when any student is already enrolled", async () => {
    prisma.batch.findUnique.mockResolvedValue({
      id: "batch-1",
      active: true,
      capacity: 10,
      category: "ADULTS",
      enrollmentMode: EnrollmentMode.STAFF_ONLY,
      enrollments: [{ studentId: "student-2" }],
    });

    await expect(
      service.enrollBulk(
        "batch-1",
        ["student-1", "student-2"],
        { id: "staff-1", role: UserRole.STAFF } as never,
        "sub-1",
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(memberships.beginBatchEnrollment).not.toHaveBeenCalled();
  });

  it("rejects bulk enroll with duplicate student ids", async () => {
    await expect(
      service.enrollBulk(
        "batch-1",
        ["student-1", "student-1"],
        { id: "staff-1", role: UserRole.STAFF } as never,
        "sub-1",
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.batch.findUnique).not.toHaveBeenCalled();
  });
});

describe("BatchesService.listByStudio viewer enrollment", () => {
  const prisma = {
    batch: { findMany: vi.fn() },
    batchEnrollment: { findMany: vi.fn(), findFirst: vi.fn() },
    booking: { findMany: vi.fn(), updateMany: vi.fn() },
    user: { findUnique: vi.fn() },
    parentChild: { findUnique: vi.fn() },
  };

  const media = {
    signReadUrl: vi.fn(async (url: string | null) =>
      url ? `signed:${url}` : null,
    ),
    signReadUrls: vi.fn(async (urls: string[]) =>
      urls.map((url) => `signed:${url}`),
    ),
  };

  let service: BatchesService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new BatchesService(
      prisma as never,
      { decryptUser: (user: unknown) => user } as never,
      {
        assertNoConflicts: vi.fn(),
        assertStudentAvailableForBatch: vi.fn(),
      } as never,
      { invalidate: vi.fn() } as never,
      media as never,
      { purchaseForBatch: vi.fn() } as never,
      { refundInvoice: vi.fn() } as never,
      { announceMembersJoined: vi.fn().mockResolvedValue(undefined) } as never,
    );
    prisma.batchEnrollment.findMany.mockResolvedValue([]);
    prisma.batchEnrollment.findFirst.mockResolvedValue(null);
    prisma.booking.findMany.mockResolvedValue([]);
    prisma.booking.updateMany.mockResolvedValue({ count: 0 });
    prisma.user.findUnique.mockResolvedValue({ ageRange: null });
  });

  it("signs trainer photo and branch cover urls for discover cards", async () => {
    prisma.batch.findMany.mockResolvedValue([
      {
        id: "batch-1",
        name: "Hip Hop",
        capacity: 20,
        scheduleJson: {},
        danceCategories: [],
        enrollments: [],
        trainers: [
          {
            trainer: {
              id: "trainer-1",
              name: "Alex",
              photoUrl: "avatars/alex.jpg",
            },
          },
        ],
        plans: [],
        _count: { enrollments: 0 },
        branch: {
          id: "branch-1",
          name: "Downtown",
          address: "1 Main St",
          photos: ["uploads/downtown.jpg"],
          coverMedia: { objectKey: "uploads/downtown-cover.jpg" },
          media: [],
        },
        coverImageUrl: "batches/cover.jpg",
      },
    ]);

    const rows = await service.listByStudio("studio-1");

    expect(rows[0]?.coverImageUrl).toBe("signed:batches/cover.jpg");
    expect(rows[0]?.trainers[0]?.trainer.photoUrl).toBe(
      "signed:avatars/alex.jpg",
    );
    expect(rows[0]?.branch).toMatchObject({
      coverImageUrl: "signed:uploads/downtown-cover.jpg",
      photos: ["signed:uploads/downtown.jpg"],
    });
  });

  it("marks viewerEnrolled when studentId matches an enrollment", async () => {
    prisma.batch.findMany.mockResolvedValue([
      {
        id: "batch-1",
        name: "Hip Hop",
        capacity: 20,
        scheduleJson: {
          frequency: "WEEKLY",
          weekdays: [1],
          startDate: "2026-01-01",
          endDate: "2026-12-31",
          startTime: "18:00",
          endTime: "19:00",
          utcOffsetMinutes: 330,
        },
        danceCategories: [{ name: "Hip Hop" }],
        enrollments: [
          {
            studentId: "student-1",
            enrolledAt: new Date("2026-01-01T00:00:00.000Z"),
          },
          {
            studentId: "student-2",
            enrolledAt: new Date("2026-01-01T00:00:00.000Z"),
          },
        ],
        trainers: [],
        plans: [],
        _count: { enrollments: 2 },
        branch: null,
        coverImageUrl: null,
      },
    ]);

    const rows = await service.listByStudio("studio-1", {
      studentId: "student-1",
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: "batch-1",
      viewerEnrolled: true,
      viewerEnrollment: { enrolledAt: expect.any(Date) },
      viewerBooking: null,
    });
  });

  it("marks viewerEnrolled false when student is not enrolled", async () => {
    prisma.batch.findMany.mockResolvedValue([
      {
        id: "batch-1",
        name: "Hip Hop",
        capacity: 20,
        scheduleJson: {},
        danceCategories: [],
        enrollments: [
          {
            studentId: "student-2",
            enrolledAt: new Date("2026-01-01T00:00:00.000Z"),
          },
        ],
        trainers: [],
        plans: [],
        _count: { enrollments: 1 },
        branch: null,
        coverImageUrl: null,
      },
    ]);

    const rows = await service.listByStudio("studio-1", {
      studentId: "student-1",
    });

    expect(rows[0]).toMatchObject({
      id: "batch-1",
      viewerEnrolled: false,
      viewerEnrollment: null,
      viewerBooking: null,
    });
  });

  it("returns enrollment and open booking for the viewer", async () => {
    prisma.batch.findMany.mockResolvedValue([
      {
        id: "batch-1",
        name: "Hip Hop",
        capacity: 20,
        scheduleJson: {},
        danceCategories: [],
        enrollments: [
          {
            studentId: "student-1",
            enrolledAt: new Date("2026-01-01T00:00:00.000Z"),
          },
        ],
        trainers: [],
        plans: [],
        _count: { enrollments: 1 },
        branch: null,
        coverImageUrl: null,
      },
      {
        id: "batch-2",
        name: "Jazz",
        capacity: 12,
        scheduleJson: {},
        danceCategories: [],
        enrollments: [],
        trainers: [],
        plans: [],
        _count: { enrollments: 0 },
        branch: null,
        coverImageUrl: null,
      },
    ]);
    prisma.booking.findMany.mockImplementation(
      async (args: { select?: Record<string, boolean> }) => {
        // Viewer open-booking query selects type/status; capacity holdings do not.
        if (args.select?.type) {
          return [
            {
              id: "booking-1",
              batchId: "batch-2",
              type: "TRIAL",
              status: "PENDING",
              notes: null,
              startsAt: null,
              endsAt: null,
              paymentHoldExpiresAt: null,
            },
          ];
        }
        return [];
      },
    );

    const rows = await service.listByStudio("studio-1", {
      studentId: "student-1",
    });

    expect(rows[0]).toMatchObject({
      id: "batch-1",
      viewerEnrolled: true,
      viewerEnrollment: {
        enrolledAt: expect.any(Date),
      },
      viewerBooking: null,
    });
    expect(rows[1]).toMatchObject({
      id: "batch-2",
      viewerEnrolled: false,
      viewerEnrollment: null,
      viewerBooking: {
        id: "booking-1",
        type: "TRIAL",
        status: "PENDING",
      },
    });
  });

  it("sorts the viewer's age category ahead of other batches", async () => {
    prisma.user.findUnique.mockResolvedValue({ ageRange: "TWENTY_TO_FORTY" });
    prisma.batch.findMany.mockResolvedValue([
      {
        id: "kids-1",
        name: "Kids Ballet",
        category: "KIDS",
        capacity: 20,
        scheduleJson: {},
        danceCategories: [],
        enrollments: [],
        trainers: [],
        plans: [],
        _count: { enrollments: 0 },
        branch: null,
        coverImageUrl: null,
      },
      {
        id: "adults-1",
        name: "Adult Hip Hop",
        category: "ADULTS",
        capacity: 20,
        scheduleJson: {},
        danceCategories: [],
        enrollments: [],
        trainers: [],
        plans: [],
        _count: { enrollments: 0 },
        branch: null,
        coverImageUrl: null,
      },
      {
        id: "adults-2",
        name: "Adult Salsa",
        category: "ADULTS",
        capacity: 20,
        scheduleJson: {},
        danceCategories: [],
        enrollments: [],
        trainers: [],
        plans: [],
        _count: { enrollments: 0 },
        branch: null,
        coverImageUrl: null,
      },
    ]);

    const rows = await service.listByStudio("studio-1", {
      studentId: "student-1",
    });

    expect(rows.map((row) => row.id)).toEqual([
      "adults-1",
      "adults-2",
      "kids-1",
    ]);
  });

  it("sorts by the authenticated student's age without studentId query", async () => {
    prisma.batch.findMany.mockResolvedValue([
      {
        id: "kids-1",
        name: "Kids Ballet",
        category: "KIDS",
        capacity: 20,
        scheduleJson: {},
        danceCategories: [],
        enrollments: [],
        trainers: [],
        plans: [],
        _count: { enrollments: 0 },
        branch: null,
        coverImageUrl: null,
      },
      {
        id: "adults-1",
        name: "Adult Hip Hop",
        category: "ADULTS",
        capacity: 20,
        scheduleJson: {},
        danceCategories: [],
        enrollments: [],
        trainers: [],
        plans: [],
        _count: { enrollments: 0 },
        branch: null,
        coverImageUrl: null,
      },
    ]);

    const rows = await service.listByStudio("studio-1", {}, {
      id: "student-1",
      role: "STUDENT",
      ageRange: "TWENTY_TO_FORTY",
    } as never);

    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    expect(rows.map((row) => row.id)).toEqual(["adults-1", "kids-1"]);
  });
});

describe("BatchesService.switchBatch", () => {
  const prisma = {
    batch: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    batchEnrollment: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      delete: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
    },
    booking: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      updateMany: vi.fn(),
    },
    session: {
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
    $queryRaw: vi.fn(),
  };

  const scheduleConflicts = {
    assertStudentAvailableForBatch: vi.fn().mockResolvedValue(undefined),
  };

  const memberships = {
    findActiveForBatch: vi.fn(),
    purchaseForBatch: vi.fn(),
    moveCurrentTrackToBatch: vi.fn(),
  };

  const chat = {
    announceMembersJoined: vi.fn().mockResolvedValue(undefined),
  };

  let service: BatchesService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new BatchesService(
      prisma as never,
      { decryptUser: (user: unknown) => user } as never,
      scheduleConflicts as never,
      { invalidate: vi.fn() } as never,
      { signReadUrl: vi.fn(async (url: string | null) => url) } as never,
      memberships as never,
      { refundInvoice: vi.fn() } as never,
      chat as never,
    );
    prisma.$transaction.mockImplementation(
      async (callback: (tx: typeof prisma) => unknown) => callback(prisma),
    );
    prisma.$queryRaw.mockResolvedValue([{ id: "batch-2" }]);
    prisma.batchEnrollment.findMany.mockResolvedValue([]);
    prisma.batchEnrollment.findFirst.mockResolvedValue(null);
    prisma.batchEnrollment.findUnique.mockResolvedValue(null);
    prisma.booking.findMany.mockResolvedValue([]);
    prisma.booking.findFirst.mockResolvedValue(null);
    prisma.booking.updateMany.mockResolvedValue({ count: 0 });
    prisma.session.findMany.mockResolvedValue([]);
  });

  it("moves a paid student when the target offers the same plan", async () => {
    prisma.batch.findUnique
      .mockResolvedValueOnce({
        id: "batch-1",
        studioId: "studio-1",
        category: BatchCategory.KIDS,
        enrollments: [{ studentId: "student-1" }],
      })
      .mockResolvedValueOnce({
        id: "batch-2",
        studioId: "studio-1",
        category: BatchCategory.KIDS,
        active: true,
        capacity: 10,
        plans: [{ subscriptionId: "sub-1" }],
      });
    memberships.findActiveForBatch.mockResolvedValue({
      subscriptionId: "sub-1",
      status: "ACTIVE",
      periodStart: new Date("2026-01-01"),
      periodEnd: new Date("2026-12-31"),
      subscription: { id: "sub-1", name: "Kids Monthly", active: true },
      coveredStudents: [{ studentId: "student-1", seatRole: "KID" }],
    });
    prisma.batchEnrollment.upsert.mockResolvedValue({
      id: "enroll-2",
      batchId: "batch-2",
      studentId: "student-1",
      status: "ACTIVE",
    });

    await expect(
      service.switchBatch("batch-1", "student-1", "batch-2"),
    ).resolves.toMatchObject({
      batchId: "batch-2",
      studentId: "student-1",
    });

    expect(
      scheduleConflicts.assertStudentAvailableForBatch,
    ).toHaveBeenCalledWith("student-1", "batch-2", {
      excludeBatchIds: ["batch-1"],
    });
    expect(prisma.batchEnrollment.update).toHaveBeenCalledWith({
      where: {
        batchId_studentId: { batchId: "batch-1", studentId: "student-1" },
      },
      data: expect.objectContaining({
        status: "ENDED",
        endReason: "SWITCH",
      }),
    });
    expect(prisma.batchEnrollment.upsert).toHaveBeenCalledWith({
      where: {
        batchId_studentId: { batchId: "batch-2", studentId: "student-1" },
      },
      update: expect.objectContaining({ status: "ACTIVE" }),
      create: expect.objectContaining({
        batchId: "batch-2",
        studentId: "student-1",
        status: "ACTIVE",
      }),
    });
    await vi.waitFor(() => {
      expect(chat.announceMembersJoined).toHaveBeenCalledWith(
        "student-1",
        "batch-2",
        ["student-1"],
      );
    });
  });

  it("rejects when target does not offer the student's plan", async () => {
    prisma.batch.findUnique
      .mockResolvedValueOnce({
        id: "batch-1",
        studioId: "studio-1",
        category: BatchCategory.KIDS,
        enrollments: [{ studentId: "student-1" }],
      })
      .mockResolvedValueOnce({
        id: "batch-2",
        studioId: "studio-1",
        category: BatchCategory.KIDS,
        active: true,
        capacity: 10,
        plans: [{ subscriptionId: "sub-other" }],
      });
    memberships.findActiveForBatch.mockResolvedValue({
      subscriptionId: "sub-1",
      status: "ACTIVE",
      periodStart: new Date("2026-01-01"),
      periodEnd: new Date("2026-12-31"),
      subscription: { id: "sub-1", name: "Kids Monthly", active: true },
      coveredStudents: [{ studentId: "student-1", seatRole: "KID" }],
    });

    await expect(
      service.switchBatch("batch-1", "student-1", "batch-2"),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.batchEnrollment.update).not.toHaveBeenCalled();
  });

  it("allows a different-plan target when includeAllPrices is set", async () => {
    prisma.batch.findUnique
      .mockResolvedValueOnce({
        id: "batch-1",
        studioId: "studio-1",
        category: BatchCategory.KIDS,
        enrollments: [{ studentId: "student-1" }],
      })
      .mockResolvedValueOnce({
        id: "batch-2",
        studioId: "studio-1",
        category: BatchCategory.KIDS,
        active: true,
        capacity: 10,
        plans: [{ subscriptionId: "sub-other" }],
      });
    memberships.findActiveForBatch.mockResolvedValue({
      subscriptionId: "sub-1",
      status: "ACTIVE",
      periodStart: new Date("2026-01-01"),
      periodEnd: new Date("2026-12-31"),
      subscription: { id: "sub-1", name: "Kids Monthly", active: true },
      coveredStudents: [{ studentId: "student-1", seatRole: "KID" }],
    });
    prisma.batchEnrollment.upsert.mockResolvedValue({
      id: "enroll-2",
      batchId: "batch-2",
      studentId: "student-1",
      status: "ACTIVE",
    });

    await expect(
      service.switchBatch("batch-1", "student-1", "batch-2", {
        includeAllPrices: true,
      }),
    ).resolves.toMatchObject({
      batchId: "batch-2",
      studentId: "student-1",
    });
    expect(prisma.batchEnrollment.update).toHaveBeenCalled();
  });

  it("allows a different-category target when includeAllAges is set", async () => {
    prisma.batch.findUnique
      .mockResolvedValueOnce({
        id: "batch-1",
        studioId: "studio-1",
        category: BatchCategory.KIDS,
        enrollments: [{ studentId: "student-1" }],
      })
      .mockResolvedValueOnce({
        id: "batch-2",
        studioId: "studio-1",
        category: BatchCategory.ADULTS,
        active: true,
        capacity: 10,
        plans: [{ subscriptionId: "sub-1" }],
      });
    memberships.findActiveForBatch.mockResolvedValue({
      subscriptionId: "sub-1",
      status: "ACTIVE",
      periodStart: new Date("2026-01-01"),
      periodEnd: new Date("2026-12-31"),
      subscription: { id: "sub-1", name: "Kids Monthly", active: true },
      coveredStudents: [{ studentId: "student-1", seatRole: "KID" }],
    });
    prisma.batchEnrollment.upsert.mockResolvedValue({
      id: "enroll-2",
      batchId: "batch-2",
      studentId: "student-1",
      status: "ACTIVE",
    });

    await expect(
      service.switchBatch("batch-1", "student-1", "batch-2", {
        includeAllAges: true,
      }),
    ).resolves.toMatchObject({
      batchId: "batch-2",
      studentId: "student-1",
    });
    expect(prisma.batchEnrollment.update).toHaveBeenCalled();
  });

  it("rejects a different-category target without includeAllAges", async () => {
    prisma.batch.findUnique
      .mockResolvedValueOnce({
        id: "batch-1",
        studioId: "studio-1",
        category: BatchCategory.KIDS,
        enrollments: [{ studentId: "student-1" }],
      })
      .mockResolvedValueOnce({
        id: "batch-2",
        studioId: "studio-1",
        category: BatchCategory.ADULTS,
        active: true,
        capacity: 10,
        plans: [{ subscriptionId: "sub-1" }],
      });
    memberships.findActiveForBatch.mockResolvedValue({
      subscriptionId: "sub-1",
      status: "ACTIVE",
      periodStart: new Date("2026-01-01"),
      periodEnd: new Date("2026-12-31"),
      subscription: { id: "sub-1", name: "Kids Monthly", active: true },
      coveredStudents: [{ studentId: "student-1", seatRole: "KID" }],
    });

    await expect(
      service.switchBatch("batch-1", "student-1", "batch-2"),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.batchEnrollment.update).not.toHaveBeenCalled();
  });

  it("rejects when student is not enrolled in the source batch", async () => {
    prisma.batch.findUnique
      .mockResolvedValueOnce({
        id: "batch-1",
        studioId: "studio-1",
        category: BatchCategory.KIDS,
        enrollments: [],
      })
      .mockResolvedValueOnce({
        id: "batch-2",
        studioId: "studio-1",
        category: BatchCategory.KIDS,
        active: true,
        capacity: 10,
        plans: [{ subscriptionId: "sub-1" }],
      });

    await expect(
      service.switchBatch("batch-1", "student-1", "batch-2"),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects inactive target batches", async () => {
    prisma.batch.findUnique
      .mockResolvedValueOnce({
        id: "batch-1",
        studioId: "studio-1",
        category: BatchCategory.KIDS,
        enrollments: [{ studentId: "student-1" }],
      })
      .mockResolvedValueOnce({
        id: "batch-2",
        studioId: "studio-1",
        category: BatchCategory.KIDS,
        active: false,
        capacity: 10,
        plans: [],
      });

    await expect(
      service.switchBatch("batch-1", "student-1", "batch-2"),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects when the target batch is full", async () => {
    prisma.batch.findUnique
      .mockResolvedValueOnce({
        id: "batch-1",
        studioId: "studio-1",
        category: BatchCategory.KIDS,
        enrollments: [{ studentId: "student-1" }],
      })
      .mockResolvedValueOnce({
        id: "batch-2",
        studioId: "studio-1",
        category: BatchCategory.KIDS,
        active: true,
        capacity: 1,
        plans: [],
      });
    prisma.batchEnrollment.findMany.mockResolvedValue([
      { studentId: "other-student" },
    ]);

    await expect(
      service.switchBatch("batch-1", "student-1", "batch-2"),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.batchEnrollment.update).not.toHaveBeenCalled();
  });

  it("lists same-plan targets for paid members", async () => {
    prisma.batch.findUnique.mockResolvedValue({
      id: "batch-1",
      studioId: "studio-1",
      category: BatchCategory.KIDS,
      enrollments: [{ studentId: "student-1" }],
    });
    prisma.batchEnrollment.findMany.mockResolvedValue([{ batchId: "batch-1" }]);
    memberships.findActiveForBatch.mockResolvedValue({
      subscriptionId: "sub-1",
      status: "ACTIVE",
      periodStart: new Date("2026-01-01"),
      periodEnd: new Date("2026-12-31"),
      subscription: { id: "sub-1", name: "Kids Monthly", active: true },
      coveredStudents: [{ studentId: "student-1", seatRole: "KID" }],
    });
    prisma.batch.findMany.mockResolvedValue([
      {
        id: "batch-2",
        name: "Kids 2",
        category: BatchCategory.KIDS,
        capacity: 10,
        branch: { name: "Main" },
        plans: [
          {
            subscription: {
              price: 2000,
              active: true,
              name: "Kids Monthly",
              adultSeats: 0,
              kidSeats: 1,
              billingCadence: "MONTHLY",
            },
          },
        ],
      },
    ]);

    const result = await service.listSwitchTargets("batch-1", "student-1");

    expect(prisma.batch.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          plans: { some: { subscriptionId: "sub-1" } },
        }),
      }),
    );
    expect(result).toMatchObject({
      studentId: "student-1",
      includeAllPrices: false,
      subscription: { id: "sub-1", name: "Kids Monthly" },
      targets: [
        {
          id: "batch-2",
          name: "Kids 2",
          remainingSeats: 10,
          branchName: "Main",
          price: 2000,
        },
      ],
    });
  });

  it("lists all category-matching targets when includeAllPrices is set", async () => {
    prisma.batch.findUnique.mockResolvedValue({
      id: "batch-1",
      studioId: "studio-1",
      category: BatchCategory.KIDS,
      enrollments: [{ studentId: "student-1" }],
    });
    prisma.batchEnrollment.findMany.mockResolvedValue([{ batchId: "batch-1" }]);
    memberships.findActiveForBatch.mockResolvedValue({
      subscriptionId: "sub-1",
      status: "ACTIVE",
      periodStart: new Date("2026-01-01"),
      periodEnd: new Date("2026-12-31"),
      subscription: { id: "sub-1", name: "Kids Monthly", active: true },
      coveredStudents: [{ studentId: "student-1", seatRole: "KID" }],
    });
    prisma.batch.findMany.mockResolvedValue([
      {
        id: "batch-2",
        name: "Kids Premium",
        category: BatchCategory.KIDS,
        capacity: 10,
        branch: { name: "Main" },
        plans: [
          {
            subscription: {
              price: 5000,
              active: true,
              name: "Kids Premium",
              adultSeats: 0,
              kidSeats: 1,
              billingCadence: "MONTHLY",
            },
          },
        ],
      },
    ]);

    const result = await service.listSwitchTargets("batch-1", "student-1", {
      includeAllPrices: true,
    });

    const findManyArgs = prisma.batch.findMany.mock.calls[0]?.[0] as {
      where: { plans?: unknown };
    };
    expect(findManyArgs.where.plans).toBeUndefined();
    expect(result).toMatchObject({
      includeAllPrices: true,
      targets: [
        {
          id: "batch-2",
          name: "Kids Premium",
          price: 5000,
        },
      ],
    });
  });

  it("lists targets of other categories when includeAllAges is set", async () => {
    prisma.batch.findUnique.mockResolvedValue({
      id: "batch-1",
      studioId: "studio-1",
      category: BatchCategory.KIDS,
      enrollments: [{ studentId: "student-1" }],
    });
    prisma.batchEnrollment.findMany.mockResolvedValue([{ batchId: "batch-1" }]);
    memberships.findActiveForBatch.mockResolvedValue({
      subscriptionId: "sub-1",
      status: "ACTIVE",
      periodStart: new Date("2026-01-01"),
      periodEnd: new Date("2026-12-31"),
      subscription: { id: "sub-1", name: "Kids Monthly", active: true },
      coveredStudents: [{ studentId: "student-1", seatRole: "KID" }],
    });
    prisma.batch.findMany.mockResolvedValue([
      {
        id: "batch-2",
        name: "Adults 1",
        category: BatchCategory.ADULTS,
        capacity: 10,
        branch: { name: "Main" },
        plans: [
          {
            subscription: {
              price: 5000,
              active: true,
              name: "Adults Monthly",
              adultSeats: 1,
              kidSeats: 0,
              billingCadence: "MONTHLY",
            },
          },
        ],
      },
    ]);

    const result = await service.listSwitchTargets("batch-1", "student-1", {
      includeAllAges: true,
    });

    expect(result).toMatchObject({
      includeAllAges: true,
      targets: [
        {
          id: "batch-2",
          name: "Adults 1",
          category: BatchCategory.ADULTS,
          price: 5000,
        },
      ],
    });
  });

  it("returns a reason when paid member has no covering subscription", async () => {
    prisma.batch.findUnique.mockResolvedValue({
      id: "batch-1",
      studioId: "studio-1",
      category: BatchCategory.KIDS,
      enrollments: [{ studentId: "student-1" }],
    });
    prisma.batchEnrollment.findMany.mockResolvedValue([{ batchId: "batch-1" }]);
    memberships.findActiveForBatch.mockResolvedValue(null);

    const result = await service.listSwitchTargets("batch-1", "student-1");

    expect(result).toEqual({
      studentId: "student-1",
      subscription: null,
      includeAllPrices: false,
      includeAllAges: false,
      reason: "No active subscription covering this batch",
      targets: [],
    });
  });
});

describe("BatchesService.unenroll", () => {
  const prisma = {
    batch: {
      findUnique: vi.fn(),
    },
    batchEnrollment: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    booking: {
      updateMany: vi.fn(),
      count: vi.fn(),
    },
    invoice: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn(),
  };

  const memberships = {
    findActiveForBatch: vi.fn(),
  };

  const billing = {
    refundInvoice: vi.fn(),
  };

  let service: BatchesService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new BatchesService(
      prisma as never,
      { decryptUser: (user: { name: string }) => user } as never,
      {
        assertNoConflicts: vi.fn(),
        assertStudentAvailableForBatch: vi.fn(),
      } as never,
      { invalidate: vi.fn() } as never,
      { signReadUrl: vi.fn(async (url: string | null) => url) } as never,
      memberships as never,
      billing as never,
      { announceMembersJoined: vi.fn().mockResolvedValue(undefined) } as never,
    );
    prisma.$transaction.mockImplementation(
      async (callback: (tx: typeof prisma) => unknown) => callback(prisma),
    );
    prisma.booking.updateMany.mockResolvedValue({ count: 1 });
    prisma.invoice.findMany.mockResolvedValue([]);
    prisma.invoice.deleteMany.mockResolvedValue({ count: 0 });
  });

  it("soft-ends enrollment and cancels future bookings without refund", async () => {
    prisma.batchEnrollment.findFirst.mockResolvedValue({
      id: "enroll-1",
      batchId: "batch-1",
      studentId: "student-1",
      status: "ACTIVE",
      batch: { id: "batch-1", studioId: "studio-1", name: "Beginner" },
    });
    prisma.batchEnrollment.update.mockResolvedValue({
      id: "enroll-1",
      status: "ENDED",
      endReason: "UNENROLL",
    });

    const result = await service.unenroll("batch-1", "student-1");

    expect(billing.refundInvoice).not.toHaveBeenCalled();
    expect(prisma.batchEnrollment.update).toHaveBeenCalledWith({
      where: { id: "enroll-1" },
      data: expect.objectContaining({
        status: "ENDED",
        endReason: "UNENROLL",
      }),
    });
    expect(prisma.booking.updateMany).toHaveBeenCalled();
    expect(result).toMatchObject({
      cancelledFutureBookings: 1,
      voidedPendingInvoices: 0,
      refundedInvoice: null,
    });
  });

  it("refunds when requested and a paid invoice exists", async () => {
    prisma.batchEnrollment.findFirst.mockResolvedValue({
      id: "enroll-1",
      batchId: "batch-1",
      studentId: "student-1",
      status: "ACTIVE",
      batch: { id: "batch-1", studioId: "studio-1", name: "Beginner" },
    });
    prisma.batch.findUnique.mockResolvedValue({
      studioId: "studio-1",
      plans: [{ subscriptionId: "sub-1" }],
    });
    memberships.findActiveForBatch.mockResolvedValue({
      id: "mem-1",
      subscriptionId: "sub-1",
    });
    prisma.invoice.findFirst.mockResolvedValue({
      id: "inv-1",
      amount: 2000,
      status: "PAID",
      paymentMethod: "CASH",
      paidAt: new Date("2026-08-01"),
    });
    billing.refundInvoice.mockResolvedValue({
      id: "inv-1",
      amount: 2000,
      refundedAmount: 2000,
      thisRefundAmount: 2000,
      status: "REFUNDED",
    });
    prisma.batchEnrollment.update.mockResolvedValue({
      id: "enroll-1",
      status: "ENDED",
    });

    const result = await service.unenroll("batch-1", "student-1", {
      refund: true,
      refundAmount: 1200,
    });

    expect(billing.refundInvoice).toHaveBeenCalledWith("inv-1", {
      reason: "Unenrolled from batch Beginner",
      amount: 1200,
    });
    expect(result.refundedInvoice).toEqual({
      id: "inv-1",
      amount: 2000,
      refundedAmount: 2000,
      thisRefundAmount: 2000,
      status: "REFUNDED",
    });
  });

  it("rejects refund when no paid invoice exists", async () => {
    prisma.batchEnrollment.findFirst.mockResolvedValue({
      id: "enroll-1",
      batchId: "batch-1",
      studentId: "student-1",
      status: "ACTIVE",
      batch: { id: "batch-1", studioId: "studio-1", name: "Beginner" },
    });
    prisma.batch.findUnique.mockResolvedValue({
      studioId: "studio-1",
      plans: [{ subscriptionId: "sub-1" }],
    });
    memberships.findActiveForBatch.mockResolvedValue(null);
    prisma.invoice.findFirst.mockResolvedValue(null);

    await expect(
      service.unenroll("batch-1", "student-1", { refund: true }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(billing.refundInvoice).not.toHaveBeenCalled();
  });
});

describe("BatchesService.getById roster split", () => {
  const prisma = {
    batch: { findUniqueOrThrow: vi.fn() },
    batchEnrollment: { findMany: vi.fn() },
    batchRating: { findUnique: vi.fn() },
    booking: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      updateMany: vi.fn(),
    },
    invoice: { findMany: vi.fn() },
  };

  const memberships = {
    findStudentIdsWithActiveMonthForBatch: vi.fn(),
    findMonthlyUnpaidStudentIds: vi.fn(),
  };

  const media = {
    signReadUrl: vi.fn(async (url: string | null) =>
      url ? `signed:${url}` : null,
    ),
  };

  let service: BatchesService;

  const student = (
    id: string,
    name: string,
    photoUrl: string | null = null,
  ) => ({
    id,
    name,
    email: `${id}@example.com`,
    phone: null,
    photoUrl,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    service = new BatchesService(
      prisma as never,
      { decryptUser: (user: unknown) => user } as never,
      {
        assertNoConflicts: vi.fn(),
        assertStudentAvailableForBatch: vi.fn(),
      } as never,
      { invalidate: vi.fn() } as never,
      media as never,
      memberships as never,
      { refundInvoice: vi.fn() } as never,
      { announceMembersJoined: vi.fn().mockResolvedValue(undefined) } as never,
    );
    prisma.booking.updateMany.mockResolvedValue({ count: 0 });
    prisma.booking.findMany.mockResolvedValue([]);
    prisma.booking.findFirst.mockResolvedValue(null);
    prisma.batchRating.findUnique.mockResolvedValue(null);
    prisma.invoice.findMany.mockResolvedValue([]);
    memberships.findMonthlyUnpaidStudentIds.mockResolvedValue(new Set());
  });

  it("signs student photo urls on active and inactive roster rows", async () => {
    prisma.batch.findUniqueOrThrow.mockResolvedValue({
      id: "batch-1",
      studioId: "studio-1",
      category: "KIDS",
      capacity: 10,
      scheduleJson: {},
      danceCategories: [],
      coverImageUrl: null,
      branch: null,
      certificateTemplate: null,
      sessions: [],
      trainers: [],
      plans: [],
      enrollments: [
        {
          id: "en-active",
          batchId: "batch-1",
          studentId: "s-active",
          status: "ACTIVE",
          enrolledAt: new Date("2026-01-01"),
          endedAt: null,
          endReason: null,
          student: student("s-active", "Active Kid", "avatars/active.jpg"),
        },
        {
          id: "en-moved",
          batchId: "batch-1",
          studentId: "s-moved",
          status: "ENDED",
          enrolledAt: new Date("2026-01-01"),
          endedAt: new Date("2026-08-01"),
          endReason: "SWITCH",
          student: student("s-moved", "Moved Kid", "avatars/moved.jpg"),
        },
      ],
      _count: { enrollments: 1 },
    });
    memberships.findStudentIdsWithActiveMonthForBatch.mockResolvedValue(
      new Set(["s-active", "s-moved"]),
    );
    prisma.batchEnrollment.findMany.mockResolvedValue([
      { batchId: "batch-1", studentId: "s-active" },
    ]);

    const result = await service.getById("batch-1");

    expect(result.enrollments[0]?.student.photoUrl).toBe(
      "signed:avatars/active.jpg",
    );
    expect(result.inactiveEnrollments[0]?.student.photoUrl).toBe(
      "signed:avatars/moved.jpg",
    );
  });

  it("lists ACTIVE enrollments even without a month and maps inactive reasons", async () => {
    prisma.batch.findUniqueOrThrow.mockResolvedValue({
      id: "batch-1",
      studioId: "studio-1",
      category: "KIDS",
      capacity: 10,
      scheduleJson: {
        frequency: "WEEKLY",
        weekdays: [1],
        startDate: "2026-01-01",
        endDate: "2026-12-31",
        startTime: "10:00",
        endTime: "11:00",
        utcOffsetMinutes: 0,
      },
      danceCategories: [{ name: "Hip Hop" }],
      coverImageUrl: null,
      branch: null,
      certificateTemplate: null,
      sessions: [],
      trainers: [],
      plans: [],
      enrollments: [
        {
          id: "en-active",
          batchId: "batch-1",
          studentId: "s-active",
          status: "ACTIVE",
          enrolledAt: new Date("2026-01-01"),
          endedAt: null,
          endReason: null,
          student: student("s-active", "Active Kid"),
        },
        {
          id: "en-no-month",
          batchId: "batch-1",
          studentId: "s-no-month",
          status: "ACTIVE",
          enrolledAt: new Date("2026-01-01"),
          endedAt: null,
          endReason: null,
          student: student("s-no-month", "No Month"),
        },
        {
          id: "en-moved",
          batchId: "batch-1",
          studentId: "s-moved",
          status: "ENDED",
          enrolledAt: new Date("2026-01-01"),
          endedAt: new Date("2026-08-01"),
          endReason: "SWITCH",
          student: student("s-moved", "Moved Kid"),
        },
        {
          id: "en-unenrolled",
          batchId: "batch-1",
          studentId: "s-unenrolled",
          status: "ENDED",
          enrolledAt: new Date("2026-01-01"),
          endedAt: new Date("2026-08-02"),
          endReason: "UNENROLL",
          student: student("s-unenrolled", "Unenrolled Kid"),
        },
        {
          id: "en-ended-old",
          batchId: "batch-1",
          studentId: "s-ended-old",
          status: "ENDED",
          enrolledAt: new Date("2026-01-01"),
          endedAt: new Date("2026-06-01"),
          endReason: "UNENROLL",
          student: student("s-ended-old", "Old Ended"),
        },
      ],
      _count: { enrollments: 2 },
    });
    memberships.findStudentIdsWithActiveMonthForBatch.mockResolvedValue(
      new Set(["s-active", "s-moved", "s-unenrolled"]),
    );
    prisma.batchEnrollment.findMany.mockResolvedValue([
      { batchId: "batch-1", studentId: "s-active" },
      { batchId: "batch-1", studentId: "s-no-month" },
    ]);

    memberships.findMonthlyUnpaidStudentIds.mockResolvedValue(
      new Set(["s-no-month"]),
    );

    const result = await service.getById("batch-1");

    expect(
      result.enrollments.map(
        (row: { studentId: string; monthlyUnpaid: boolean }) => ({
          studentId: row.studentId,
          monthlyUnpaid: row.monthlyUnpaid,
        }),
      ),
    ).toEqual([
      { studentId: "s-active", monthlyUnpaid: false },
      { studentId: "s-no-month", monthlyUnpaid: true },
    ]);
    expect(
      result.inactiveEnrollments.map(
        (row: { studentId: string; inactiveReason: string }) => ({
          studentId: row.studentId,
          inactiveReason: row.inactiveReason,
        }),
      ),
    ).toEqual([
      { studentId: "s-moved", inactiveReason: "MOVED" },
      { studentId: "s-unenrolled", inactiveReason: "UNENROLLED" },
    ]);
    expect(result.enrollmentCount).toBe(2);
    expect(result.occupiedSeats).toBe(2);
    expect(memberships.findMonthlyUnpaidStudentIds).toHaveBeenCalledWith([
      "s-active",
      "s-no-month",
    ]);
    expect(
      memberships.findStudentIdsWithActiveMonthForBatch,
    ).toHaveBeenCalledWith(
      ["s-active", "s-no-month", "s-moved", "s-unenrolled", "s-ended-old"],
      "KIDS",
    );
  });

  it("keeps ACTIVE enrollments on the roster without a covering membership month", async () => {
    prisma.batch.findUniqueOrThrow.mockResolvedValue({
      id: "batch-1",
      studioId: "studio-1",
      category: "KIDS",
      capacity: 10,
      scheduleJson: {},
      danceCategories: [],
      coverImageUrl: null,
      branch: null,
      certificateTemplate: null,
      sessions: [],
      trainers: [],
      plans: [],
      enrollments: [
        {
          id: "en-1",
          batchId: "batch-1",
          studentId: "s-no-month",
          status: "ACTIVE",
          enrolledAt: new Date("2026-01-01"),
          endedAt: null,
          endReason: null,
          student: student("s-no-month", "No Month"),
        },
      ],
      _count: { enrollments: 1 },
    });
    memberships.findStudentIdsWithActiveMonthForBatch.mockResolvedValue(
      new Set(),
    );
    memberships.findMonthlyUnpaidStudentIds.mockResolvedValue(
      new Set(["s-no-month"]),
    );
    prisma.batchEnrollment.findMany.mockResolvedValue([
      { batchId: "batch-1", studentId: "s-no-month" },
    ]);

    const result = await service.getById("batch-1", {
      studentId: "s-no-month",
    });

    expect(
      result.enrollments.map(
        (row: { studentId: string; monthlyUnpaid: boolean }) => ({
          studentId: row.studentId,
          monthlyUnpaid: row.monthlyUnpaid,
        }),
      ),
    ).toEqual([{ studentId: "s-no-month", monthlyUnpaid: true }]);
    expect(result.inactiveEnrollments).toEqual([]);
    expect(result.enrollmentCount).toBe(1);
    expect(result.viewerEnrolled).toBe(true);
  });
});
