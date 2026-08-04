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
  verifyPaymentSignature: vi.fn().mockReturnValue(false),
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
      membershipsStub as never,
      razorpayStub as never,
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
    expect(result.pendingPayments).toHaveLength(2);
    expect(result.pendingPayments[0]?.status).toBe("OVERDUE");
    expect(result.series.length).toBeGreaterThan(0);
    expect(result.comparison.netCollectedDeltaPct).toBeNull();
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
        membership: { periodEnd: new Date("2026-07-20T00:00:00.000Z") },
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
      dueDate: "2026-07-20T00:00:00.000Z",
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

describe("BillingService.listForStudent", () => {
  const prisma = {
    invoice: { findMany: vi.fn() },
    familyMember: { findUnique: vi.fn() },
    parentChild: { findUnique: vi.fn() },
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
      membershipsStub as never,
      razorpayStub as never,
    );
  });

  it("allows a student to list their own invoices", async () => {
    prisma.invoice.findMany.mockResolvedValue([{ id: "inv-1" }]);
    await expect(
      service.listForStudent(
        makeUser({ id: "student-1", role: UserRole.STUDENT }),
        "student-1",
      ),
    ).resolves.toEqual([{ id: "inv-1" }]);
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
    prisma.invoice.findMany.mockResolvedValue([{ id: "inv-1" }]);

    await expect(
      service.listForStudent(
        makeUser({ id: "parent-1", role: UserRole.PARENT }),
        "student-1",
      ),
    ).resolves.toEqual([{ id: "inv-1" }]);
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
    decryptUser: vi.fn((user: { name?: string }) => user),
  };
  let service: BillingService;

  beforeEach(() => {
    vi.clearAllMocks();
    membershipsStub.renewFromPaidInvoice.mockResolvedValue(null);
    service = new BillingService(
      prisma as never,
      crypto as never,
      membershipsStub as never,
      razorpayStub as never,
    );
  });

  it("marks a pending invoice paid with method and fee", async () => {
    prisma.invoice.findUniqueOrThrow.mockResolvedValue({
      id: "inv-1",
      studioId: "studio-1",
      amount: 2000,
      status: InvoiceStatus.PENDING,
      platformFeePercent: 5,
      membershipId: null,
    });
    prisma.invoice.update.mockResolvedValue({
      id: "inv-1",
      status: InvoiceStatus.PAID,
      paymentMethod: PaymentMethod.CASH,
      paidAt: new Date("2026-07-20T12:00:00.000Z"),
    });

    const result = await service.markPaid(
      makeUser({ role: UserRole.OWNER }),
      "inv-1",
      PaymentMethod.CASH,
    );

    expect(prisma.invoice.update).toHaveBeenCalledWith({
      where: { id: "inv-1" },
      data: expect.objectContaining({
        status: InvoiceStatus.PAID,
        paymentMethod: PaymentMethod.CASH,
        paidAt: expect.any(Date),
      }),
    });
    expect(result.platformFeeComputed).toBe(100);
    expect(membershipsStub.renewFromPaidInvoice).not.toHaveBeenCalled();
  });

  it("renews membership when paying a renewal invoice", async () => {
    prisma.invoice.findUniqueOrThrow.mockResolvedValue({
      id: "inv-1",
      studioId: "studio-1",
      amount: 2000,
      status: InvoiceStatus.PENDING,
      platformFeePercent: 5,
      membershipId: "mem-1",
      purchaseMeta: null,
    });
    prisma.invoice.update.mockResolvedValue({
      id: "inv-1",
      status: InvoiceStatus.PAID,
      paymentMethod: PaymentMethod.CASH,
      paidAt: new Date("2026-07-20T12:00:00.000Z"),
    });

    await service.markPaid(
      makeUser({ role: UserRole.OWNER }),
      "inv-1",
      PaymentMethod.CASH,
    );

    expect(membershipsStub.renewFromPaidInvoice).toHaveBeenCalledWith("mem-1");
  });

  it("assigns membership from purchaseMeta when marking paid", async () => {
    membershipsStub.assign.mockResolvedValue({ id: "mem-new" });
    prisma.invoice.findUniqueOrThrow.mockResolvedValue({
      id: "inv-1",
      studioId: "studio-1",
      amount: 4000,
      status: InvoiceStatus.PENDING,
      platformFeePercent: 5,
      membershipId: null,
      purchaseMeta: {
        subscriptionId: "sub-fam",
        purchaserUserId: "parent-1",
        coveredStudents: [
          { studentId: "adult-1", seatRole: "ADULT", batchId: "b1" },
          { studentId: "kid-1", seatRole: "KID", batchId: "b2" },
        ],
      },
    });
    prisma.invoice.update.mockResolvedValue({
      id: "inv-1",
      status: InvoiceStatus.PAID,
      paymentMethod: PaymentMethod.CASH,
    });

    await service.markPaid(
      makeUser({ role: UserRole.OWNER }),
      "inv-1",
      PaymentMethod.CASH,
    );

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
  });

  it("rejects trainers marking invoices paid", async () => {
    await expect(
      service.markPaid(
        makeUser({ id: "trainer-1", role: UserRole.TRAINER }),
        "inv-1",
        PaymentMethod.CASH,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.invoice.findUniqueOrThrow).not.toHaveBeenCalled();
  });

  it("rejects already-paid invoices", async () => {
    prisma.invoice.findUniqueOrThrow.mockResolvedValue({
      id: "inv-1",
      studioId: "studio-1",
      amount: 2000,
      status: InvoiceStatus.PAID,
      platformFeePercent: 5,
      membershipId: null,
    });

    await expect(
      service.markPaid(
        makeUser({ role: UserRole.STAFF }),
        "inv-1",
        PaymentMethod.UPI_MANUAL,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects marking invoices for another studio", async () => {
    prisma.invoice.findUniqueOrThrow.mockResolvedValue({
      id: "inv-1",
      studioId: "studio-other",
      amount: 2000,
      status: InvoiceStatus.PENDING,
      platformFeePercent: 5,
      membershipId: null,
    });

    await expect(
      service.markPaid(
        makeUser({ role: UserRole.OWNER, studioId: "studio-1" }),
        "inv-1",
        PaymentMethod.CASH,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe("BillingService.listByStudio", () => {
  const prisma = {
    invoice: { findMany: vi.fn() },
    subscription: { findMany: vi.fn() },
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
      membershipsStub as never,
      razorpayStub as never,
    );
    prisma.subscription.findMany.mockResolvedValue([]);
  });

  it("returns studio invoices with decrypted students", async () => {
    prisma.invoice.findMany.mockResolvedValue([
      {
        id: "inv-1",
        studioId: "studio-1",
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
    expect(crypto.decryptUser).toHaveBeenCalled();
    expect(rows[0]?.student.name).toBe("Decrypted");
    expect(rows[0]?.kind).toBe("INDIVIDUAL");
  });

  it("marks family checkout invoices via purchaseMeta", async () => {
    prisma.invoice.findMany.mockResolvedValue([
      {
        id: "inv-fam",
        studioId: "studio-1",
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

    const rows = await service.listByStudio("studio-1");
    expect(rows[0]?.kind).toBe("FAMILY");
    expect(rows[0]?.familySummary?.planName).toBe("Family Duo");
    expect(rows[0]?.familySummary?.adultCount).toBe(1);
    expect(rows[0]?.familySummary?.kidCount).toBe(1);
  });
});

describe("BillingService.createPendingInvoice", () => {
  const prisma = {
    user: { findFirst: vi.fn() },
    membership: { findFirst: vi.fn() },
    studioSettings: { findUnique: vi.fn() },
    invoice: { create: vi.fn() },
  };
  const crypto = {
    decryptUser: vi.fn((user: { name?: string }) => user),
  };
  let service: BillingService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new BillingService(
      prisma as never,
      crypto as never,
      membershipsStub as never,
      razorpayStub as never,
    );
    prisma.user.findFirst.mockResolvedValue({ id: "student-1" });
    prisma.studioSettings.findUnique.mockResolvedValue({
      platformFeePercent: 5,
    });
    prisma.invoice.create.mockResolvedValue({
      id: "inv-new",
      status: InvoiceStatus.PENDING,
      amount: 1500,
    });
  });

  it("creates a pending invoice for a studio student", async () => {
    const result = await service.createPendingInvoice(
      makeUser({ role: UserRole.STAFF, studioId: "studio-1" }),
      {
        studioId: "studio-1",
        studentId: "student-1",
        amount: 1500,
      },
    );

    expect(prisma.invoice.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        studentId: "student-1",
        studioId: "studio-1",
        amount: 1500,
        status: InvoiceStatus.PENDING,
        platformFeePercent: 5,
      }),
    });
    expect(result.id).toBe("inv-new");
  });

  it("rejects non-positive amounts", async () => {
    await expect(
      service.createPendingInvoice(makeUser({ studioId: "studio-1" }), {
        studioId: "studio-1",
        studentId: "student-1",
        amount: 0,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects creating invoices for another studio", async () => {
    await expect(
      service.createPendingInvoice(makeUser({ studioId: "studio-1" }), {
        studioId: "studio-other",
        studentId: "student-1",
        amount: 100,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
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
      membershipsStub as never,
      razorpayStub as never,
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
