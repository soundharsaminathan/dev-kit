import { ConflictException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BookingsService } from "./bookings.service";

describe("BookingsService schedule conflicts", () => {
  const tx = {
    $queryRaw: vi.fn().mockResolvedValue([{ id: "batch-1" }]),
    batch: { findUnique: vi.fn() },
    booking: {
      findFirst: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    batchEnrollment: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
      count: vi.fn().mockResolvedValue(0),
    },
  };

  const prisma = {
    invoice: { findFirst: vi.fn() },
    batch: { findUnique: vi.fn() },
    booking: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    session: { findUnique: vi.fn() },
    membership: { findFirst: vi.fn() },
    $transaction: vi.fn(async (fn: (client: typeof tx) => unknown) => fn(tx)),
  };

  const memberships = {
    findActiveForBatch: vi.fn(),
  };

  const crypto = {
    decryptUser: (user: unknown) => user,
  };

  const scheduleConflicts = {
    assertNoConflicts: vi.fn().mockResolvedValue(undefined),
    assertStudentAvailableForBatch: vi.fn().mockResolvedValue(undefined),
  };

  let service: BookingsService;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma.$transaction.mockImplementation(
      async (fn: (client: typeof tx) => unknown) => fn(tx),
    );
    tx.$queryRaw.mockResolvedValue([{ id: "batch-1" }]);
    tx.booking.findMany.mockResolvedValue([]);
    tx.booking.updateMany.mockResolvedValue({ count: 0 });
    tx.batchEnrollment.findMany.mockResolvedValue([]);
    tx.batchEnrollment.findFirst.mockResolvedValue(null);
    scheduleConflicts.assertNoConflicts.mockResolvedValue(undefined);
    scheduleConflicts.assertStudentAvailableForBatch.mockResolvedValue(
      undefined,
    );
    service = new BookingsService(
      prisma as never,
      memberships as never,
      crypto as never,
      scheduleConflicts as never,
    );
  });

  it("rejects trial create when the student schedule conflicts", async () => {
    prisma.invoice.findFirst.mockResolvedValue(null);
    scheduleConflicts.assertStudentAvailableForBatch.mockRejectedValue(
      new ConflictException(
        "Student has another class at 2026-07-20T12:30:00.000Z",
      ),
    );

    await expect(
      service.create({
        studioId: "studio-1",
        studentId: "student-1",
        type: "TRIAL",
        batchId: "batch-1",
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(tx.booking.create).not.toHaveBeenCalled();
  });

  it("checks timed booking intervals against trainer and branch", async () => {
    prisma.invoice.findFirst.mockResolvedValue(null);
    prisma.batch.findUnique.mockResolvedValue({
      id: "batch-1",
      studioId: "studio-1",
      branchId: "branch-1",
      capacity: 10,
      _count: { enrollments: 0 },
      trainers: [{ trainerId: "trainer-1" }],
    });
    prisma.membership.findFirst.mockResolvedValue({ id: "mem-1" });
    tx.batch.findUnique.mockResolvedValue({
      id: "batch-1",
      studioId: "studio-1",
      capacity: 10,
    });
    tx.booking.findFirst.mockResolvedValue(null);
    tx.booking.create.mockResolvedValue({ id: "bk-1" });

    await service.create({
      studioId: "studio-1",
      studentId: "student-1",
      type: "PRIVATE",
      batchId: "batch-1",
      trainerId: "trainer-1",
      startsAt: "2026-07-20T10:00:00.000Z",
      endsAt: "2026-07-20T11:00:00.000Z",
    });

    expect(scheduleConflicts.assertNoConflicts).toHaveBeenCalledWith(
      expect.objectContaining({
        studentIds: ["student-1"],
        trainerIds: ["trainer-1"],
        branchId: "branch-1",
      }),
    );
    expect(tx.booking.create).toHaveBeenCalled();
  });

  it("creates a payment hold when requirePayment is set", async () => {
    prisma.invoice.findFirst.mockResolvedValue(null);
    tx.batch.findUnique.mockResolvedValue({
      id: "batch-1",
      studioId: "studio-1",
      capacity: 10,
    });
    tx.booking.findFirst.mockResolvedValue(null);
    tx.booking.create.mockResolvedValue({
      id: "bk-1",
      status: "AWAITING_PAYMENT",
    });

    await service.create(
      {
        studioId: "studio-1",
        studentId: "student-1",
        type: "TRIAL",
        batchId: "batch-1",
      },
      { requirePayment: true },
    );

    expect(tx.booking.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "AWAITING_PAYMENT",
          paymentHoldExpiresAt: expect.any(Date),
        }),
      }),
    );
  });

  it("rejects create when batch seats are fully reserved", async () => {
    prisma.invoice.findFirst.mockResolvedValue(null);
    tx.batch.findUnique.mockResolvedValue({
      id: "batch-1",
      studioId: "studio-1",
      capacity: 1,
    });
    tx.batchEnrollment.findMany.mockResolvedValue([
      { studentId: "other-student" },
    ]);
    tx.booking.findFirst.mockResolvedValue(null);

    await expect(
      service.create({
        studioId: "studio-1",
        studentId: "student-1",
        type: "TRIAL",
        batchId: "batch-1",
      }),
    ).rejects.toThrow("Batch is at capacity");
    expect(tx.booking.create).not.toHaveBeenCalled();
  });
});
