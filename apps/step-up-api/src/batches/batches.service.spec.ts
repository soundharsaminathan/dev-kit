import { BadRequestException, ConflictException } from "@nestjs/common";
import { BillingCadence, UserRole } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BatchesService } from "./batches.service";

describe("BatchesService branch validation", () => {
  const prisma = {
    user: { findMany: vi.fn() },
    studioBranch: { findUnique: vi.fn() },
    certificateTemplate: { findUnique: vi.fn() },
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
  });

  it("rejects a branch from another studio", async () => {
    prisma.studioBranch.findUnique.mockResolvedValue({
      id: "branch-other",
      studioId: "studio-2",
    });

    await expect(
      service.create("owner-1", {
        studioId: "studio-1",
        name: "Kids",
        category: "KIDS",
        branchId: "branch-other",
        trainerIds: ["trainer-1"],
        danceCategories: [{ name: "Hip-hop", description: "Basics" }],
        scheduleJson: {
          frequency: "WEEKLY",
          weekdays: [1],
          startDate: "2026-07-20",
          endDate: "2026-07-27",
          startTime: "18:00",
          endTime: "19:00",
          utcOffsetMinutes: -330,
        },
        capacity: 12,
        enrollmentMode: "STAFF_ONLY",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.batch.create).not.toHaveBeenCalled();
  });

  it("creates a batch when the branch belongs to the studio", async () => {
    prisma.studioBranch.findUnique.mockResolvedValue({
      id: "branch-1",
      studioId: "studio-1",
    });
    prisma.batch.create.mockResolvedValue({ id: "batch-1" });

    await service.create("owner-1", {
      studioId: "studio-1",
      name: "Kids",
      category: "KIDS",
      branchId: "branch-1",
      trainerIds: ["trainer-1"],
      danceCategories: [{ name: "Hip-hop", description: "Basics" }],
      scheduleJson: {
        frequency: "WEEKLY",
        weekdays: [1],
        startDate: "2026-07-20",
        endDate: "2026-07-27",
        startTime: "18:00",
        endTime: "19:00",
        utcOffsetMinutes: -330,
      },
      capacity: 12,
      enrollmentMode: "STAFF_ONLY",
    });

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
    expect(
      prisma.batch.create.mock.calls[0]?.[0]?.data?.monthlyPlanId,
    ).toBeUndefined();
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
      service.create("owner-1", {
        studioId: "studio-1",
        name: "Kids",
        category: "KIDS",
        branchId: "branch-1",
        trainerIds: ["trainer-1"],
        danceCategories: [{ name: "Hip-hop", description: "Basics" }],
        scheduleJson: {
          frequency: "WEEKLY",
          weekdays: [1],
          startDate: "2026-07-20",
          endDate: "2026-07-27",
          startTime: "18:00",
          endTime: "19:00",
          utcOffsetMinutes: -330,
        },
        capacity: 12,
        enrollmentMode: "STAFF_ONLY",
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.batch.create).not.toHaveBeenCalled();
  });
});

describe("BatchesService update", () => {
  const prisma = {
    user: { findMany: vi.fn() },
    studioBranch: { findUnique: vi.fn() },
    certificateTemplate: { findUnique: vi.fn() },
    batch: {
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
    );
    prisma.$transaction.mockImplementation(
      async (callback: (tx: typeof prisma) => unknown) => callback(prisma),
    );
    prisma.batch.findUnique.mockResolvedValue({
      id: "batch-1",
      studioId: "studio-1",
      certificationEnabled: false,
      certificateTemplateId: null,
    });
    prisma.batch.update.mockResolvedValue({ id: "batch-1" });
    prisma.session.findMany.mockResolvedValue([]);
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
