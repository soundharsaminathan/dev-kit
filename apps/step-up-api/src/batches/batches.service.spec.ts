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
    );
  });

  it("aggregates membership invoices for enrolled students", async () => {
    prisma.batch.findUnique.mockResolvedValue({
      id: "batch-1",
      studioId: "studio-1",
      enrollments: [{ studentId: "student-1" }],
    });
    prisma.invoice.findMany.mockResolvedValue([
      {
        amount: 2500,
        status: "PAID",
        membership: {
          subscription: {
            id: "sub-monthly",
            name: "Monthly",
            billingCadence: BillingCadence.MONTHLY,
          },
        },
      },
      {
        amount: 6500,
        status: "PENDING",
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
      service.enroll("batch-1", "student-2", {
        id: "student-1",
        role: UserRole.STUDENT,
      } as never),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("rejects member self-enroll when batch is not SELF_JOIN", async () => {
    prisma.batch.findUnique.mockResolvedValue({
      id: "batch-1",
      active: true,
      capacity: 10,
      enrollmentMode: EnrollmentMode.STAFF_ONLY,
      enrollments: [],
    });

    await expect(
      service.enroll("batch-1", "student-1", {
        id: "student-1",
        role: UserRole.STUDENT,
      } as never),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("enrolls a self-join student without trial options", async () => {
    prisma.batch.findUnique.mockResolvedValue({
      id: "batch-1",
      active: true,
      capacity: 10,
      enrollmentMode: EnrollmentMode.SELF_JOIN,
      enrollments: [],
    });
    prisma.batchEnrollment.upsert.mockResolvedValue({
      id: "enroll-1",
      batchId: "batch-1",
      studentId: "student-1",
    });

    await expect(
      service.enroll("batch-1", "student-1", {
        id: "student-1",
        role: UserRole.STUDENT,
      } as never),
    ).resolves.toMatchObject({
      batchId: "batch-1",
      studentId: "student-1",
    });
  });
});

describe("BatchesService.listByStudio viewer enrollment", () => {
  const prisma = {
    batch: { findMany: vi.fn() },
    batchEnrollment: { findMany: vi.fn(), findFirst: vi.fn() },
    booking: { findMany: vi.fn(), updateMany: vi.fn() },
  };

  const media = {
    signReadUrl: vi.fn(async (url: string | null) => url),
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
    );
    prisma.batchEnrollment.findMany.mockResolvedValue([]);
    prisma.batchEnrollment.findFirst.mockResolvedValue(null);
    prisma.booking.findMany.mockResolvedValue([]);
    prisma.booking.updateMany.mockResolvedValue({ count: 0 });
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
    prisma.batchEnrollment.create.mockResolvedValue({
      id: "enroll-2",
      batchId: "batch-2",
      studentId: "student-1",
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
    expect(prisma.batchEnrollment.delete).toHaveBeenCalledWith({
      where: {
        batchId_studentId: { batchId: "batch-1", studentId: "student-1" },
      },
    });
    expect(prisma.batchEnrollment.create).toHaveBeenCalledWith({
      data: {
        batchId: "batch-2",
        studentId: "student-1",
      },
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
    expect(prisma.batchEnrollment.delete).not.toHaveBeenCalled();
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
    expect(prisma.batchEnrollment.delete).not.toHaveBeenCalled();
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
      },
    ]);

    const result = await service.listSwitchTargets("batch-1", "student-1");

    expect(result).toMatchObject({
      studentId: "student-1",
      subscription: { id: "sub-1", name: "Kids Monthly" },
      targets: [
        {
          id: "batch-2",
          name: "Kids 2",
          remainingSeats: 10,
          branchName: "Main",
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
      reason: "No active subscription covering this batch",
      targets: [],
    });
  });
});
