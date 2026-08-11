import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import {
  InvoiceStatus,
  PaymentMethod,
  ProfileVisibility,
  UserRole,
} from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DecryptedUser } from "../users/user-crypto.service";
import { BillingService } from "./billing.service";

const membershipsStub = {
  renewFromPaidInvoice: vi.fn().mockResolvedValue(null),
  assign: vi.fn(),
};

const razorpayStub = {
  isEnabled: vi.fn().mockReturnValue(false),
  keyId: vi.fn().mockReturnValue(""),
  createOrder: vi.fn(),
  createRefund: vi.fn(),
  verifyPaymentSignature: vi.fn().mockReturnValue(false),
};

const notificationsStub = {
  create: vi.fn().mockResolvedValue({ id: "notif-1" }),
};

const emailStub = {
  sendPaymentInvoice: vi.fn().mockResolvedValue(undefined),
};

const usersPresenter = {
  presentLite: vi.fn(
    async (user: { id: string; name?: string; photoUrl?: string | null }) => ({
      id: user.id,
      name: user.name ?? "Decrypted",
      photoUrl: user.photoUrl ?? null,
    }),
  ),
  presentLiteMany: vi.fn(
    async (
      users: Array<{ id: string; name?: string; photoUrl?: string | null }>,
    ) =>
      users.map((user) => ({
        id: user.id,
        name: user.name ?? "Decrypted",
        photoUrl: user.photoUrl ?? null,
        email: "decrypted@example.com",
        phone: null as string | null,
      })),
  ),
};

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
    batch: { findMany: vi.fn() },
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
    service = new BillingService(
      prisma as never,
      crypto as never,
      usersPresenter as never,
      membershipsStub as never,
      razorpayStub as never,
      notificationsStub as never,
      emailStub as never,
    );
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

  it("aggregates studio-wide analytics for all trainers", async () => {
    prisma.batch.findMany.mockResolvedValue([
      {
        id: "batch-1",
        name: "Kids Hip-Hop",
        enrollments: [{ studentId: "student-1" }],
      },
      {
        id: "batch-2",
        name: "Adult Contemporary",
        enrollments: [{ studentId: "student-2" }],
      },
    ]);
    prisma.invoice.findMany.mockResolvedValue([
      {
        id: "inv-1",
        studentId: "student-1",
        amount: 2000,
        status: InvoiceStatus.PAID,
        paymentMethod: PaymentMethod.CASH,
        paidAt: new Date("2026-07-01T00:00:00.000Z"),
        platformFeePercent: 5,
        purchaseMeta: null,
        membership: null,
        student: { id: "student-1", name: "Alex" },
      },
      {
        id: "inv-2",
        studentId: "student-2",
        amount: 3000,
        status: InvoiceStatus.PENDING,
        paymentMethod: null,
        paidAt: null,
        platformFeePercent: 5,
        purchaseMeta: null,
        membership: null,
        student: { id: "student-2", name: "Sam" },
      },
    ]);

    const result = await service.getTrainerAnalytics(
      makeUser(),
      "all",
      "studio-1",
    );

    expect(prisma.user.findFirst).not.toHaveBeenCalled();
    expect(prisma.batchTrainer.findMany).not.toHaveBeenCalled();
    expect(result.trainerId).toBe("all");
    expect(result.trainerName).toBe("All trainers");
    expect(result.studentCount).toBe(2);
    expect(result.invoiceCount).toBe(2);
    expect(result.totals).toEqual({
      collected: 2000,
      pending: 3000,
      overdue: 0,
      refunded: 0,
      platformFees: 100,
      netCollected: 1900,
    });
    expect(result.byBatch).toHaveLength(2);
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
        purchaseMeta: null,
        membership: null,
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
        purchaseMeta: null,
        membership: null,
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
        purchaseMeta: null,
        membership: null,
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
      refunded: 0,
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
      refunded: 0,
      invoiceCount: 3,
    });
    expect(result.pendingPayments).toHaveLength(2);
    expect(result.pendingPayments[0]?.status).toBe("OVERDUE");
    expect(result.series.length).toBeGreaterThan(0);
    expect(result.comparison.netCollectedDeltaPct).toBeNull();
  });

  it("credits combined invoice net amounts to each source batch", async () => {
    prisma.batch.findMany.mockResolvedValue([
      {
        id: "batch-kid-a",
        name: "Kids A",
        enrollments: [{ studentId: "kid-1" }],
      },
      {
        id: "batch-kid-b",
        name: "Kids B",
        enrollments: [{ studentId: "kid-2" }],
      },
    ]);
    prisma.invoice.findMany.mockResolvedValue([
      {
        id: "inv-combined",
        studentId: "owner-1",
        amount: 1900,
        status: InvoiceStatus.PAID,
        paymentMethod: PaymentMethod.CASH,
        paidAt: new Date("2026-07-01T00:00:00.000Z"),
        platformFeePercent: 5,
        purchaseMeta: null,
        combineMeta: {
          sources: [
            {
              invoiceId: "inv-a",
              studentId: "kid-1",
              batchId: "batch-kid-a",
              originalAmount: 1000,
              allocatedDiscount: 50,
              netAmount: 950,
            },
            {
              invoiceId: "inv-b",
              studentId: "kid-2",
              batchId: "batch-kid-b",
              originalAmount: 1000,
              allocatedDiscount: 50,
              netAmount: 950,
            },
          ],
        },
        membership: null,
        student: { id: "owner-1", name: "Parent" },
      },
    ]);

    const result = await service.getTrainerAnalytics(
      makeUser(),
      "all",
      "studio-1",
    );

    expect(result.byBatch.find((row) => row.batchId === "batch-kid-a")).toMatchObject({
      collected: 950,
      invoiceCount: 1,
    });
    expect(result.byBatch.find((row) => row.batchId === "batch-kid-b")).toMatchObject({
      collected: 950,
      invoiceCount: 1,
    });
  });

  it("tracks refunded totals without counting refunds as overdue", async () => {
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
          enrollments: [{ studentId: "student-1" }],
        },
      },
    ]);
    prisma.invoice.findMany.mockResolvedValue([
      {
        id: "inv-paid",
        studentId: "student-1",
        amount: 2000,
        refundedAmount: 500,
        status: InvoiceStatus.PAID,
        paymentMethod: PaymentMethod.CASH,
        paidAt: new Date("2026-07-10T12:00:00.000Z"),
        refundedAt: new Date("2026-07-20T12:00:00.000Z"),
        platformFeePercent: 5,
        purchaseMeta: null,
        membership: null,
        student: { id: "student-1", name: "Alex" },
      },
      {
        id: "inv-refunded",
        studentId: "student-1",
        amount: 1000,
        refundedAmount: 1000,
        status: InvoiceStatus.REFUNDED,
        paymentMethod: PaymentMethod.CASH,
        paidAt: new Date("2026-07-05T12:00:00.000Z"),
        refundedAt: new Date("2026-07-18T12:00:00.000Z"),
        platformFeePercent: 5,
        purchaseMeta: null,
        membership: null,
        student: { id: "student-1", name: "Alex" },
      },
    ]);

    const result = await service.getTrainerAnalytics(
      makeUser({ id: "trainer-1", role: UserRole.TRAINER }),
      "trainer-1",
      "studio-1",
    );

    expect(result.totals.collected).toBe(1500);
    expect(result.totals.overdue).toBe(0);
    expect(result.totals.refunded).toBe(1500);
    expect(result.byStatus.REFUNDED).toEqual({ count: 1, amount: 1000 });
    expect(result.byBatch[0]).toMatchObject({
      collected: 1500,
      overdue: 0,
      refunded: 1500,
    });
  });

  it("does not credit batch2 when shared students paid for batch1 (negative path)", async () => {
    prisma.batch.findMany.mockResolvedValue([
      {
        id: "batch-1",
        name: "Batch 1",
        enrollments: [
          { studentId: "s1" },
          { studentId: "s2" },
          { studentId: "s3" },
        ],
      },
      {
        id: "batch-2",
        name: "Batch 2",
        enrollments: [{ studentId: "s1" }, { studentId: "s2" }],
      },
    ]);
    prisma.invoice.findMany.mockResolvedValue([
      {
        id: "inv-s1",
        studentId: "s1",
        amount: 1000,
        status: InvoiceStatus.PAID,
        paymentMethod: PaymentMethod.CASH,
        paidAt: new Date("2026-07-01T00:00:00.000Z"),
        platformFeePercent: 5,
        purchaseMeta: {
          batchId: "batch-1",
          subscriptionId: "sub-1",
          purchaserUserId: "s1",
          coveredStudents: [
            { studentId: "s1", seatRole: "KID", batchId: "batch-1" },
          ],
        },
        membership: null,
        student: { id: "s1", name: "S1" },
      },
      {
        id: "inv-s2",
        studentId: "s2",
        amount: 1000,
        status: InvoiceStatus.PAID,
        paymentMethod: PaymentMethod.CASH,
        paidAt: new Date("2026-07-01T00:00:00.000Z"),
        platformFeePercent: 5,
        purchaseMeta: {
          batchId: "batch-1",
          subscriptionId: "sub-1",
          purchaserUserId: "s2",
          coveredStudents: [
            { studentId: "s2", seatRole: "KID", batchId: "batch-1" },
          ],
        },
        membership: null,
        student: { id: "s2", name: "S2" },
      },
      {
        id: "inv-s3",
        studentId: "s3",
        amount: 1000,
        status: InvoiceStatus.PAID,
        paymentMethod: PaymentMethod.CASH,
        paidAt: new Date("2026-07-01T00:00:00.000Z"),
        platformFeePercent: 5,
        purchaseMeta: {
          batchId: "batch-1",
          subscriptionId: "sub-1",
          purchaserUserId: "s3",
          coveredStudents: [
            { studentId: "s3", seatRole: "KID", batchId: "batch-1" },
          ],
        },
        membership: null,
        student: { id: "s3", name: "S3" },
      },
    ]);

    const result = await service.getTrainerAnalytics(
      makeUser(),
      "all",
      "studio-1",
    );

    expect(result.totals.collected).toBe(3000);
    expect(result.byBatch.find((row) => row.batchId === "batch-1")).toMatchObject({
      collected: 3000,
      invoiceCount: 3,
    });
    expect(result.byBatch.find((row) => row.batchId === "batch-2")).toMatchObject({
      collected: 0,
      invoiceCount: 0,
    });
  });

  it("builds comparison and day series for a bounded range", async () => {
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
          enrollments: [{ studentId: "student-1" }],
        },
      },
    ]);
    prisma.invoice.findMany.mockResolvedValue([
      {
        id: "inv-paid-current",
        studentId: "student-1",
        amount: 2000,
        status: InvoiceStatus.PAID,
        paymentMethod: PaymentMethod.CASH,
        paidAt: new Date("2026-07-15T12:00:00.000Z"),
        platformFeePercent: 5,
        purchaseMeta: null,
        membership: null,
        student: { id: "student-1", name: "Alex" },
      },
      {
        id: "inv-paid-prior",
        studentId: "student-1",
        amount: 1000,
        status: InvoiceStatus.PAID,
        paymentMethod: PaymentMethod.CASH,
        paidAt: new Date("2026-06-15T12:00:00.000Z"),
        platformFeePercent: 5,
        purchaseMeta: null,
        membership: null,
        student: { id: "student-1", name: "Alex" },
      },
      {
        id: "inv-pending",
        studentId: "student-1",
        amount: 800,
        status: InvoiceStatus.PENDING,
        paymentMethod: null,
        paidAt: null,
        platformFeePercent: 5,
        purchaseMeta: {
          batchId: "batch-1",
          subscriptionId: "sub-1",
          purchaserUserId: "student-1",
          coveredStudents: [{ studentId: "student-1", seatRole: "ADULT" }],
        },
        membership: { periodStart: new Date("2026-07-01T00:00:00.000Z") },
        student: { id: "student-1", name: "Alex" },
      },
    ]);

    const result = await service.getTrainerAnalytics(
      makeUser({ id: "trainer-1", role: UserRole.TRAINER }),
      "trainer-1",
      "studio-1",
      {
        from: "2026-07-01T00:00:00.000Z",
        to: "2026-07-31T23:59:59.999Z",
        bucket: "day",
      },
    );

    expect(result.totals.collected).toBe(2000);
    expect(result.comparison.collected).toBe(1000);
    expect(result.comparison.netCollected).toBe(950);
    expect(result.comparison.netCollectedDeltaPct).toBe(100);
    expect(result.series.some((point) => point.collected === 2000)).toBe(true);
    expect(result.pendingPayments[0]).toMatchObject({
      invoiceId: "inv-pending",
      dueDate: "2026-07-01T00:00:00.000Z",
      batchId: "batch-1",
      batchName: "Kids Hip-Hop",
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

describe("BillingService.refundInvoice", () => {
  const prisma = {
    invoice: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    membershipCoveredStudent: { count: vi.fn() },
    membership: { update: vi.fn() },
    $transaction: vi.fn(),
  };

  let service: BillingService;

  beforeEach(() => {
    vi.clearAllMocks();
    razorpayStub.createRefund.mockResolvedValue({
      refundId: "rfnd_1",
      amount: 50000,
    });
    service = new BillingService(
      prisma as never,
      { decryptUser: vi.fn() } as never,
      usersPresenter as never,
      membershipsStub as never,
      razorpayStub as never,
      notificationsStub as never,
      emailStub as never,
    );
    prisma.$transaction.mockImplementation(
      async (callback: (tx: typeof prisma) => unknown) => callback(prisma),
    );
  });

  it("rejects refund amounts above the remaining balance", async () => {
    prisma.invoice.findUnique.mockResolvedValue({
      id: "inv-1",
      amount: 2000,
      refundedAmount: 500,
      status: InvoiceStatus.PAID,
      paymentMethod: PaymentMethod.CASH,
      razorpayPaymentId: null,
      membershipId: null,
      membership: null,
      studio: { id: "studio-1", settings: null },
    });

    await expect(
      service.refundInvoice("inv-1", { amount: 1600 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("applies a partial cash refund and keeps the invoice paid", async () => {
    prisma.invoice.findUnique.mockResolvedValue({
      id: "inv-1",
      amount: 2000,
      refundedAmount: 0,
      referralDiscount: 0,
      studioDiscount: 0,
      status: InvoiceStatus.PAID,
      paymentMethod: PaymentMethod.CASH,
      razorpayPaymentId: null,
      membershipId: null,
      membership: null,
      studio: { id: "studio-1", settings: null },
    });
    prisma.invoice.update.mockResolvedValue({
      id: "inv-1",
      amount: 2000,
      refundedAmount: 750,
      referralDiscount: 0,
      studioDiscount: 0,
      status: InvoiceStatus.PAID,
    });

    const result = await service.refundInvoice("inv-1", { amount: 750 });

    expect(prisma.invoice.update).toHaveBeenCalledWith({
      where: { id: "inv-1" },
      data: {
        refundedAmount: 750,
        refundedAt: expect.any(Date),
      },
    });
    expect(result.status).toBe(InvoiceStatus.PAID);
    expect(result.refundedAmount).toBe(750);
    expect(result.thisRefundAmount).toBe(750);
    expect(razorpayStub.createRefund).not.toHaveBeenCalled();
  });

  it("marks the invoice refunded when the remaining balance is cleared", async () => {
    prisma.invoice.findUnique.mockResolvedValue({
      id: "inv-1",
      amount: 2000,
      refundedAmount: 500,
      referralDiscount: 0,
      studioDiscount: 0,
      status: InvoiceStatus.PAID,
      paymentMethod: PaymentMethod.CASH,
      razorpayPaymentId: null,
      membershipId: null,
      membership: null,
      studio: { id: "studio-1", settings: null },
    });
    prisma.invoice.update.mockResolvedValue({
      id: "inv-1",
      amount: 2000,
      refundedAmount: 2000,
      referralDiscount: 0,
      studioDiscount: 0,
      status: InvoiceStatus.REFUNDED,
    });

    const result = await service.refundInvoice("inv-1", { amount: 1500 });

    expect(prisma.invoice.update).toHaveBeenCalledWith({
      where: { id: "inv-1" },
      data: {
        refundedAmount: 2000,
        refundedAt: expect.any(Date),
        status: InvoiceStatus.REFUNDED,
      },
    });
    expect(result.status).toBe(InvoiceStatus.REFUNDED);
    expect(result.thisRefundAmount).toBe(1500);
  });
});

describe("BillingService.listForStudent", () => {
  const prisma = {
    invoice: { findMany: vi.fn() },
    familyMember: { findUnique: vi.fn() },
    parentChild: { findUnique: vi.fn() },
    batchEnrollment: { findMany: vi.fn() },
    batch: { findMany: vi.fn() },
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
    service = new BillingService(
      prisma as never,
      crypto as never,
      usersPresenter as never,
      membershipsStub as never,
      razorpayStub as never,
      notificationsStub as never,
      emailStub as never,
    );
    prisma.batchEnrollment.findMany.mockResolvedValue([]);
    prisma.batch.findMany.mockResolvedValue([]);
  });

  it("allows a student to list their own invoices", async () => {
    prisma.invoice.findMany.mockResolvedValue([
      {
        id: "inv-1",
        studentId: "student-1",
        amount: 1500,
        purchaseMeta: null,
        combineMeta: null,
        membership: null,
      },
    ]);
    await expect(
      service.listForStudent(
        makeUser({ id: "student-1", role: UserRole.STUDENT }),
        "student-1",
      ),
    ).resolves.toEqual([
      expect.objectContaining({
        id: "inv-1",
        amount: 1500,
        batchName: null,
        dueDate: null,
      }),
    ]);
  });

  it("rejects a student listing another student's invoices", async () => {
    prisma.familyMember.findUnique.mockResolvedValue(null);
    prisma.parentChild.findUnique.mockResolvedValue(null);

    await expect(
      service.listForStudent(
        makeUser({ id: "student-1", role: UserRole.STUDENT }),
        "student-2",
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.invoice.findMany).not.toHaveBeenCalled();
  });

  it("allows a linked parent to list a child's invoices", async () => {
    prisma.parentChild.findUnique.mockResolvedValue({
      parentUserId: "parent-1",
      childUserId: "student-1",
    });
    prisma.familyMember.findUnique.mockResolvedValue(null);
    prisma.invoice.findMany.mockResolvedValue([
      {
        id: "inv-1",
        studentId: "student-1",
        amount: 1500,
        purchaseMeta: {
          batchId: "batch-1",
          subscriptionId: "sub-1",
          purchaserUserId: "student-1",
          coveredStudents: [
            { studentId: "student-1", seatRole: "ADULT", batchId: "batch-1" },
          ],
        },
        combineMeta: null,
        membership: { periodStart: new Date("2026-07-01T00:00:00.000Z") },
      },
    ]);
    prisma.batch.findMany.mockResolvedValue([
      { id: "batch-1", name: "Kids Hip-Hop" },
    ]);

    await expect(
      service.listForStudent(
        makeUser({ id: "parent-1", role: UserRole.PARENT }),
        "student-1",
      ),
    ).resolves.toEqual([
      expect.objectContaining({
        id: "inv-1",
        batchName: "Kids Hip-Hop",
        dueDate: "2026-07-01T00:00:00.000Z",
      }),
    ]);
  });
});

describe("BillingService.markPaid", () => {
  const prisma = {
    invoice: {
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
    },
  };
  const crypto = {
    decryptUser: vi.fn(
      (user: { name?: string; email?: string; id?: string }) => ({
        id: user.id ?? "student-1",
        name: user.name ?? "Student",
        email: user.email ?? "student@example.com",
      }),
    ),
  };
  let service: BillingService;

  function unpaidInvoice(
    overrides: Record<string, unknown> = {},
  ): Record<string, unknown> {
    return {
      id: "inv-1",
      studentId: "student-1",
      studioId: "studio-1",
      amount: 2000,
      status: InvoiceStatus.PENDING,
      platformFeePercent: 5,
      membershipId: null,
      purchaseMeta: null,
      student: {
        id: "student-1",
        name: "Student",
        email: "student@example.com",
      },
      studio: { id: "studio-1", name: "Step Up Studio" },
      ...overrides,
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    membershipsStub.renewFromPaidInvoice.mockResolvedValue(null);
    notificationsStub.create.mockResolvedValue({ id: "notif-1" });
    emailStub.sendPaymentInvoice.mockResolvedValue(undefined);
    service = new BillingService(
      prisma as never,
      crypto as never,
      usersPresenter as never,
      membershipsStub as never,
      razorpayStub as never,
      notificationsStub as never,
      emailStub as never,
    );
  });

  it("marks a pending invoice paid with method and fee", async () => {
    prisma.invoice.findUniqueOrThrow.mockResolvedValue(unpaidInvoice());
    prisma.invoice.update.mockResolvedValue({
      id: "inv-1",
      status: InvoiceStatus.PAID,
      paymentMethod: PaymentMethod.CASH,
      paidAt: new Date("2026-07-20T12:00:00.000Z"),
      amount: 2000,
      referralDiscount: 0,
      studioDiscount: 0,
    });

    const result = await service.markPaid(
      makeUser({ role: UserRole.OWNER }),
      "inv-1",
      { paymentMethod: PaymentMethod.CASH },
    );

    expect(prisma.invoice.update).toHaveBeenCalledWith({
      where: { id: "inv-1" },
      data: expect.objectContaining({
        status: InvoiceStatus.PAID,
        paymentMethod: PaymentMethod.CASH,
        paidAt: expect.any(Date),
        amount: 2000,
        referralDiscount: 0,
        studioDiscount: 0,
      }),
    });
    expect(result.platformFeeComputed).toBe(100);
    expect(membershipsStub.renewFromPaidInvoice).not.toHaveBeenCalled();
    expect(notificationsStub.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "student-1",
        type: "PAYMENT_RECEIVED",
        entityId: "inv-1",
      }),
    );
    expect(emailStub.sendPaymentInvoice).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "student@example.com",
        amountPaid: 2000,
        subtotal: 2000,
      }),
    );
  });

  it("applies referral and studio discounts to the paid amount", async () => {
    prisma.invoice.findUniqueOrThrow.mockResolvedValue(unpaidInvoice());
    prisma.invoice.update.mockResolvedValue({
      id: "inv-1",
      status: InvoiceStatus.PAID,
      paymentMethod: PaymentMethod.CASH,
      paidAt: new Date("2026-07-20T12:00:00.000Z"),
      amount: 1700,
      referralDiscount: 200,
      studioDiscount: 100,
    });

    const result = await service.markPaid(
      makeUser({ role: UserRole.OWNER }),
      "inv-1",
      {
        paymentMethod: PaymentMethod.CASH,
        referralDiscount: 200,
        studioDiscount: 100,
      },
    );

    expect(prisma.invoice.update).toHaveBeenCalledWith({
      where: { id: "inv-1" },
      data: expect.objectContaining({
        amount: 1700,
        referralDiscount: 200,
        studioDiscount: 100,
      }),
    });
    expect(result.platformFeeComputed).toBe(85);
    expect(result.subtotal).toBe(2000);
  });

  it("rejects discounts that exceed the invoice amount", async () => {
    prisma.invoice.findUniqueOrThrow.mockResolvedValue(unpaidInvoice());

    await expect(
      service.markPaid(makeUser({ role: UserRole.OWNER }), "inv-1", {
        paymentMethod: PaymentMethod.CASH,
        referralDiscount: 1500,
        studioDiscount: 600,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.invoice.update).not.toHaveBeenCalled();
  });

  it("renews membership when paying a renewal invoice", async () => {
    prisma.invoice.findUniqueOrThrow.mockResolvedValue(
      unpaidInvoice({ membershipId: "mem-1" }),
    );
    prisma.invoice.update.mockResolvedValue({
      id: "inv-1",
      status: InvoiceStatus.PAID,
      paymentMethod: PaymentMethod.CASH,
      paidAt: new Date("2026-07-20T12:00:00.000Z"),
      amount: 2000,
      referralDiscount: 0,
      studioDiscount: 0,
    });

    await service.markPaid(makeUser({ role: UserRole.OWNER }), "inv-1", {
      paymentMethod: PaymentMethod.CASH,
    });

    expect(membershipsStub.renewFromPaidInvoice).toHaveBeenCalledWith("mem-1");
  });

  it("assigns membership from purchaseMeta when marking paid", async () => {
    membershipsStub.assign.mockResolvedValue({ id: "mem-new" });
    prisma.invoice.findUniqueOrThrow.mockResolvedValue(
      unpaidInvoice({
        amount: 4000,
        purchaseMeta: {
          subscriptionId: "sub-fam",
          purchaserUserId: "parent-1",
          coveredStudents: [
            { studentId: "adult-1", seatRole: "ADULT", batchId: "b1" },
            { studentId: "kid-1", seatRole: "KID", batchId: "b2" },
          ],
        },
      }),
    );
    prisma.invoice.update.mockResolvedValue({
      id: "inv-1",
      status: InvoiceStatus.PAID,
      paymentMethod: PaymentMethod.CASH,
      amount: 4000,
      referralDiscount: 0,
      studioDiscount: 0,
    });

    await service.markPaid(makeUser({ role: UserRole.OWNER }), "inv-1", {
      paymentMethod: PaymentMethod.CASH,
    });

    expect(membershipsStub.assign).toHaveBeenCalledWith({
      subscriptionId: "sub-fam",
      purchaserUserId: "parent-1",
      coveredStudents: [
        { studentId: "adult-1", seatRole: "ADULT", batchId: "b1" },
        { studentId: "kid-1", seatRole: "KID", batchId: "b2" },
      ],
    });
    expect(prisma.invoice.update).toHaveBeenCalledWith({
      where: { id: "inv-1" },
      data: expect.objectContaining({
        status: InvoiceStatus.PAID,
        membershipId: "mem-new",
      }),
    });
    const updateData = prisma.invoice.update.mock.calls[0]?.[0]?.data as {
      purchaseMeta?: unknown;
    };
    expect(updateData.purchaseMeta).toBeUndefined();
  });

  it("rejects trainers marking invoices paid", async () => {
    await expect(
      service.markPaid(
        makeUser({ id: "trainer-1", role: UserRole.TRAINER }),
        "inv-1",
        { paymentMethod: PaymentMethod.CASH },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.invoice.findUniqueOrThrow).not.toHaveBeenCalled();
  });

  it("rejects already-paid invoices", async () => {
    prisma.invoice.findUniqueOrThrow.mockResolvedValue(
      unpaidInvoice({ status: InvoiceStatus.PAID }),
    );

    await expect(
      service.markPaid(makeUser({ role: UserRole.STAFF }), "inv-1", {
        paymentMethod: PaymentMethod.UPI_MANUAL,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects marking invoices for another studio", async () => {
    prisma.invoice.findUniqueOrThrow.mockResolvedValue(
      unpaidInvoice({ studioId: "studio-other" }),
    );

    await expect(
      service.markPaid(
        makeUser({ role: UserRole.OWNER, studioId: "studio-1" }),
        "inv-1",
        { paymentMethod: PaymentMethod.CASH },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe("BillingService.listByStudio", () => {
  const prisma = {
    invoice: { findMany: vi.fn() },
    subscription: { findMany: vi.fn() },
    batchEnrollment: { findMany: vi.fn() },
    batch: { findMany: vi.fn() },
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
    service = new BillingService(
      prisma as never,
      crypto as never,
      usersPresenter as never,
      membershipsStub as never,
      razorpayStub as never,
      notificationsStub as never,
      emailStub as never,
    );
    prisma.subscription.findMany.mockResolvedValue([]);
    prisma.batchEnrollment.findMany.mockResolvedValue([]);
    prisma.batch.findMany.mockResolvedValue([]);
  });

  it("returns studio invoices with decrypted students", async () => {
    prisma.invoice.findMany.mockResolvedValue([
      {
        id: "inv-1",
        studioId: "studio-1",
        studentId: "student-1",
        amount: 1500,
        student: { id: "student-1", nameEnc: "x" },
        membership: { id: "mem-1", subscription: { kind: "INDIVIDUAL" } },
        purchaseMeta: null,
      },
    ]);

    const rows = await service.listByStudio("studio-1");

    expect(prisma.invoice.findMany).toHaveBeenCalledWith({
      where: { studioId: "studio-1" },
      include: {
        student: true,
        membership: { include: { subscription: true } },
      },
      orderBy: { id: "desc" },
    });
    expect(usersPresenter.presentLiteMany).toHaveBeenCalled();
    expect(rows[0]?.student.name).toBe("Decrypted");
    expect(rows[0]?.kind).toBe("INDIVIDUAL");
    expect(rows[0]?.batchName).toBeNull();
  });

  it("marks family checkout invoices via purchaseMeta", async () => {
    prisma.invoice.findMany.mockResolvedValue([
      {
        id: "inv-fam",
        studioId: "studio-1",
        studentId: "parent-1",
        amount: 5000,
        student: { id: "parent-1", nameEnc: "x" },
        membership: null,
        purchaseMeta: {
          subscriptionId: "sub-fam",
          purchaserUserId: "parent-1",
          coveredStudents: [
            { studentId: "adult-1", seatRole: "ADULT", batchId: "b1" },
            { studentId: "kid-1", seatRole: "KID", batchId: "b2" },
          ],
        },
      },
    ]);
    prisma.subscription.findMany.mockResolvedValue([
      { id: "sub-fam", kind: "FAMILY", name: "Family Duo" },
    ]);
    prisma.batch.findMany.mockResolvedValue([
      { id: "b1", name: "Adult Hip-Hop" },
      { id: "b2", name: "Kids Ballet" },
    ]);

    const rows = await service.listByStudio("studio-1");
    expect(rows[0]?.kind).toBe("FAMILY");
    expect(rows[0]?.familySummary?.planName).toBe("Family Duo");
    expect(rows[0]?.familySummary?.adultCount).toBe(1);
    expect(rows[0]?.familySummary?.kidCount).toBe(1);
    expect(rows[0]?.batchName).toBe("Adult Hip-Hop · Kids Ballet");
  });

  it("attaches batchName from purchaseMeta.batchId", async () => {
    prisma.invoice.findMany.mockResolvedValue([
      {
        id: "inv-1",
        studioId: "studio-1",
        studentId: "student-1",
        amount: 1500,
        student: { id: "student-1", nameEnc: "x" },
        membership: null,
        purchaseMeta: {
          batchId: "batch-1",
          subscriptionId: "sub-1",
          purchaserUserId: "student-1",
          coveredStudents: [
            { studentId: "student-1", seatRole: "ADULT", batchId: "batch-1" },
          ],
        },
      },
    ]);
    prisma.subscription.findMany.mockResolvedValue([
      { id: "sub-1", kind: "INDIVIDUAL", name: "Adult Monthly" },
    ]);
    prisma.batch.findMany.mockResolvedValue([
      { id: "batch-1", name: "Beginner Hip-Hop" },
    ]);

    const rows = await service.listByStudio("studio-1");
    expect(rows[0]?.batchId).toBe("batch-1");
    expect(rows[0]?.batchName).toBe("Beginner Hip-Hop");
  });
});

describe("BillingService invoice checkout", () => {
  const purchaseMeta = {
    batchId: "batch-1",
    subscriptionId: "sub-1",
    purchaserUserId: "student-1",
    coveredStudents: [
      { studentId: "student-1", seatRole: "ADULT", batchId: "batch-1" },
    ],
  };

  const prisma = {
    invoice: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    batch: { findUnique: vi.fn() },
    familyMember: { findUnique: vi.fn() },
    parentChild: { findUnique: vi.fn() },
  };
  const crypto = {
    decryptUser: vi.fn((user: { name?: string }) => user),
  };
  let service: BillingService;

  beforeEach(() => {
    vi.clearAllMocks();
    razorpayStub.isEnabled.mockReturnValue(false);
    razorpayStub.verifyPaymentSignature.mockReturnValue(false);
    membershipsStub.assign.mockResolvedValue({
      id: "mem-1",
      coveredStudents: [],
    });
    service = new BillingService(
      prisma as never,
      crypto as never,
      usersPresenter as never,
      membershipsStub as never,
      razorpayStub as never,
      notificationsStub as never,
      emailStub as never,
    );
  });

  it("returns demo mode when Razorpay is not configured", async () => {
    prisma.invoice.findUnique.mockResolvedValue({
      id: "inv-1",
      studentId: "student-1",
      status: InvoiceStatus.PENDING,
      amount: 3500,
      paymentHoldExpiresAt: new Date(Date.now() + 60_000),
      purchaseMeta,
      razorpayOrderId: null,
      studio: { settings: null },
    });

    await expect(
      service.createInvoicePaymentOrder(
        "inv-1",
        makeUser({ id: "student-1", role: UserRole.STUDENT }),
      ),
    ).resolves.toEqual({ mode: "demo" });
  });

  it("confirms demo payment and assigns membership", async () => {
    prisma.invoice.findUnique.mockResolvedValue({
      id: "inv-1",
      studentId: "student-1",
      status: InvoiceStatus.PENDING,
      amount: 3500,
      paymentHoldExpiresAt: new Date(Date.now() + 60_000),
      purchaseMeta,
      razorpayOrderId: null,
      studio: { settings: null },
    });
    prisma.invoice.update.mockResolvedValue({
      id: "inv-1",
      status: InvoiceStatus.PAID,
      paymentMethod: PaymentMethod.RAZORPAY,
      amount: 3500,
      membershipId: "mem-1",
    });

    const result = await service.confirmInvoicePayment(
      "inv-1",
      makeUser({ id: "student-1", role: UserRole.STUDENT }),
    );

    expect(membershipsStub.assign).toHaveBeenCalledWith({
      subscriptionId: "sub-1",
      purchaserUserId: "student-1",
      coveredStudents: purchaseMeta.coveredStudents,
    });
    expect(prisma.invoice.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: InvoiceStatus.PAID,
          paymentMethod: PaymentMethod.RAZORPAY,
          membershipId: "mem-1",
        }),
      }),
    );
    const updateData = prisma.invoice.update.mock.calls[0]?.[0]?.data as {
      purchaseMeta?: unknown;
    };
    expect(updateData.purchaseMeta).toBeUndefined();
    expect(result.status).toBe(InvoiceStatus.PAID);
  });

  it("rejects confirm when Razorpay is enabled and signature is missing", async () => {
    razorpayStub.isEnabled.mockReturnValue(true);
    prisma.invoice.findUnique.mockResolvedValue({
      id: "inv-1",
      studentId: "student-1",
      status: InvoiceStatus.PENDING,
      amount: 3500,
      paymentHoldExpiresAt: new Date(Date.now() + 60_000),
      purchaseMeta,
      razorpayOrderId: "order_1",
      studio: {
        settings: {
          razorpayKeyId: "rzp_test",
          razorpayKeySecret: "cipher",
          razorpaySecretIv: "iv",
        },
      },
    });

    await expect(
      service.confirmInvoicePayment(
        "inv-1",
        makeUser({ id: "student-1", role: UserRole.STUDENT }),
      ),
    ).rejects.toThrow(/Razorpay payment details are required/);
  });

  it("creates a Razorpay order for the plan amount in paise", async () => {
    razorpayStub.isEnabled.mockReturnValue(true);
    razorpayStub.keyId.mockReturnValue("rzp_test");
    razorpayStub.createOrder.mockResolvedValue({
      orderId: "order_new",
      amount: 350_000,
      currency: "INR",
    });
    prisma.invoice.findUnique.mockResolvedValue({
      id: "inv-1",
      studentId: "student-1",
      status: InvoiceStatus.PENDING,
      amount: 3500,
      paymentHoldExpiresAt: new Date(Date.now() + 60_000),
      purchaseMeta,
      razorpayOrderId: null,
      studio: {
        settings: {
          razorpayKeyId: "rzp_test",
          razorpayKeySecret: "cipher",
          razorpaySecretIv: "iv",
        },
      },
    });
    prisma.invoice.update.mockResolvedValue({});

    await expect(
      service.createInvoicePaymentOrder(
        "inv-1",
        makeUser({ id: "student-1", role: UserRole.STUDENT }),
      ),
    ).resolves.toEqual({
      mode: "razorpay",
      keyId: "rzp_test",
      orderId: "order_new",
      amount: 350_000,
      currency: "INR",
    });

    expect(razorpayStub.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        receipt: "inv-1",
        amountPaise: 350_000,
      }),
      expect.any(Object),
    );
  });

  it("abandons a checkout invoice by deleting it", async () => {
    prisma.invoice.findUnique.mockResolvedValue({
      id: "inv-1",
      studentId: "student-1",
      status: InvoiceStatus.PENDING,
      purchaseMeta,
    });
    prisma.invoice.delete.mockResolvedValue({});

    await expect(
      service.abandonInvoicePayment(
        "inv-1",
        makeUser({ id: "student-1", role: UserRole.STUDENT }),
      ),
    ).resolves.toEqual({ id: "inv-1", status: "CANCELLED" });
    expect(prisma.invoice.delete).toHaveBeenCalledWith({
      where: { id: "inv-1" },
    });
  });
});

describe("BillingService.familyCombine", () => {
  const prisma = {
    invoice: {
      findMany: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    batchEnrollment: { findMany: vi.fn() },
    studioSettings: { findUnique: vi.fn() },
    familyMember: { findUnique: vi.fn() },
    parentChild: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  };
  let service: BillingService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new BillingService(
      prisma as never,
      { decryptUser: vi.fn() } as never,
      usersPresenter as never,
      membershipsStub as never,
      razorpayStub as never,
      notificationsStub as never,
      emailStub as never,
    );
    prisma.$transaction.mockImplementation(
      async (fn: (tx: typeof prisma) => Promise<unknown>) => fn(prisma),
    );
    prisma.studioSettings.findUnique.mockResolvedValue({
      platformFeePercent: 5,
    });
    prisma.batchEnrollment.findMany.mockResolvedValue([
      { studentId: "kid-1", batchId: "batch-kid" },
      { studentId: "kid-2", batchId: "batch-kid" },
    ]);
    prisma.familyMember.findUnique.mockResolvedValue({ id: "link" });
    prisma.parentChild.findUnique.mockResolvedValue(null);
    prisma.invoice.create.mockResolvedValue({
      id: "inv-combined",
      studentId: "owner-1",
      studioId: "studio-1",
      amount: 1900,
      familyDiscount: 100,
      referralDiscount: 0,
      studioDiscount: 0,
      status: InvoiceStatus.PENDING,
      combineMeta: null,
    });
    prisma.invoice.deleteMany.mockResolvedValue({ count: 2 });
  });

  function unpaidSources() {
    return [
      {
        id: "inv-a",
        studentId: "kid-1",
        studioId: "studio-1",
        amount: 1000,
        status: InvoiceStatus.PENDING,
        membershipId: "mem-a",
        purchaseMeta: null,
        combineMeta: null,
        membership: null,
      },
      {
        id: "inv-b",
        studentId: "kid-2",
        studioId: "studio-1",
        amount: 1000,
        status: InvoiceStatus.PENDING,
        membershipId: "mem-b",
        purchaseMeta: null,
        combineMeta: null,
        membership: null,
      },
    ];
  }

  it("creates a combined invoice with combineMeta and deletes sources", async () => {
    prisma.invoice.findMany.mockResolvedValue(unpaidSources());

    const result = await service.familyCombine(makeUser(), {
      studioId: "studio-1",
      purchaserUserId: "owner-1",
      invoiceIds: ["inv-a", "inv-b"],
      familyDiscount: 100,
    });

    expect(result.kind).toBe("COMBINED");
    expect(result.familyDiscount).toBe(100);
    expect(result.amount).toBe(1900);
    expect(result.combineMeta?.sources).toHaveLength(2);
    expect(result.combineMeta?.sources[0]).toMatchObject({
      invoiceId: "inv-a",
      studentId: "kid-1",
      batchId: "batch-kid",
      originalAmount: 1000,
      allocatedDiscount: 50,
      netAmount: 950,
    });
    expect(prisma.invoice.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        studentId: "owner-1",
        amount: 1900,
        familyDiscount: 100,
        status: InvoiceStatus.PENDING,
        combineMeta: expect.objectContaining({
          sources: expect.any(Array),
        }),
      }),
    });
    expect(prisma.invoice.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ["inv-a", "inv-b"] }, studioId: "studio-1" },
    });
  });

  it("rejects family discount above the selected total", async () => {
    prisma.invoice.findMany.mockResolvedValue(unpaidSources());

    await expect(
      service.familyCombine(makeUser(), {
        studioId: "studio-1",
        purchaserUserId: "owner-1",
        invoiceIds: ["inv-a", "inv-b"],
        familyDiscount: 5000,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects invoices outside the family", async () => {
    prisma.invoice.findMany.mockResolvedValue(unpaidSources());
    prisma.familyMember.findUnique.mockResolvedValue(null);
    prisma.parentChild.findUnique.mockResolvedValue(null);

    await expect(
      service.familyCombine(makeUser(), {
        studioId: "studio-1",
        purchaserUserId: "owner-1",
        invoiceIds: ["inv-a", "inv-b"],
        familyDiscount: 0,
      }),
    ).rejects.toThrow(/family/i);
  });

  it("rejects fewer than two invoices", async () => {
    await expect(
      service.familyCombine(makeUser(), {
        studioId: "studio-1",
        purchaserUserId: "owner-1",
        invoiceIds: ["inv-a"],
        familyDiscount: 0,
      }),
    ).rejects.toThrow(/at least two/i);
  });
});
