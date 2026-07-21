import { ForbiddenException, NotFoundException } from "@nestjs/common";
import {
  InvoiceStatus,
  PaymentMethod,
  ProfileVisibility,
  UserRole,
} from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DecryptedUser } from "../users/user-crypto.service";
import { BillingService } from "./billing.service";

function makeUser(overrides: Partial<DecryptedUser> = {}): DecryptedUser {
  return {
    id: "owner-1",
    firebaseUid: "dev-owner-1",
    email: "owner@stepup.dev",
    name: "Owner",
    phone: null,
    role: UserRole.OWNER,
    bio: null,
    photoUrl: null,
    instagramUrl: null,
    styles: [],
    profileVisibility: ProfileVisibility.PRIVATE,
    studioId: "studio-1",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("BillingService.getTrainerAnalytics", () => {
  const prisma = {
    user: { findFirst: vi.fn() },
    batchTrainer: { findMany: vi.fn() },
    invoice: { findMany: vi.fn() },
  };

  const crypto = {
    decryptUser: vi.fn((user: { name?: string }) => ({
      ...user,
      name: user.name ?? "Decrypted",
    })),
  };

  let service: BillingService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new BillingService(prisma as never, crypto as never);
  });

  it("forces trainers to their own analytics", async () => {
    await expect(
      service.getTrainerAnalytics(
        makeUser({ id: "trainer-1", role: UserRole.TRAINER }),
        "trainer-2",
        "studio-1",
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("rejects studio mismatch", async () => {
    await expect(
      service.getTrainerAnalytics(makeUser(), "trainer-1", "studio-other"),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("rejects missing trainer", async () => {
    prisma.user.findFirst.mockResolvedValue(null);

    await expect(
      service.getTrainerAnalytics(makeUser(), "trainer-1", "studio-1"),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("aggregates invoices for students in the trainer's batches", async () => {
    prisma.user.findFirst.mockResolvedValue({
      id: "trainer-1",
      name: "Lead Trainer",
      role: UserRole.TRAINER,
      studioId: "studio-1",
    });
    prisma.batchTrainer.findMany.mockResolvedValue([
      {
        batch: {
          id: "batch-1",
          name: "Kids Hip-Hop",
          enrollments: [{ studentId: "student-1" }, { studentId: "student-2" }],
        },
      },
    ]);
    prisma.invoice.findMany.mockResolvedValue([
      {
        id: "inv-1",
        studentId: "student-1",
        amount: 2000,
        status: InvoiceStatus.PAID,
        paymentMethod: PaymentMethod.UPI_MANUAL,
        paidAt: new Date("2026-07-01T00:00:00.000Z"),
        platformFeePercent: 5,
        student: { id: "student-1", name: "Alex" },
      },
      {
        id: "inv-2",
        studentId: "student-2",
        amount: 1500,
        status: InvoiceStatus.PENDING,
        paymentMethod: null,
        paidAt: null,
        platformFeePercent: 5,
        student: { id: "student-2", name: "Sam" },
      },
      {
        id: "inv-3",
        studentId: "student-1",
        amount: 500,
        status: InvoiceStatus.OVERDUE,
        paymentMethod: null,
        paidAt: null,
        platformFeePercent: 5,
        student: { id: "student-1", name: "Alex" },
      },
    ]);

    const result = await service.getTrainerAnalytics(
      makeUser({ id: "trainer-1", role: UserRole.TRAINER }),
      "trainer-1",
      "studio-1",
    );

    expect(result.studentCount).toBe(2);
    expect(result.invoiceCount).toBe(3);
    expect(result.totals).toEqual({
      collected: 2000,
      pending: 1500,
      overdue: 500,
      platformFees: 100,
      netCollected: 1900,
    });
    expect(result.byPaymentMethod.UPI_MANUAL).toEqual({
      count: 1,
      amount: 2000,
    });
    expect(result.byBatch[0]).toMatchObject({
      batchId: "batch-1",
      collected: 2000,
      pending: 1500,
      overdue: 500,
      invoiceCount: 3,
    });
  });

  it("allows studio admins to view any trainer in their studio", async () => {
    prisma.user.findFirst.mockResolvedValue({
      id: "trainer-1",
      name: "Lead Trainer",
      role: UserRole.TRAINER,
      studioId: "studio-1",
    });
    prisma.batchTrainer.findMany.mockResolvedValue([]);
    prisma.invoice.findMany.mockResolvedValue([]);

    const result = await service.getTrainerAnalytics(
      makeUser({ role: UserRole.STAFF }),
      "trainer-1",
      "studio-1",
    );

    expect(result.trainerId).toBe("trainer-1");
    expect(result.invoiceCount).toBe(0);
    expect(result.byBatch).toEqual([]);
  });
});
