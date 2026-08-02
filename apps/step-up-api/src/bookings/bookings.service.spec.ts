import { ConflictException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BookingsService } from "./bookings.service";

const razorpayDisabled = {
  isEnabled: vi.fn().mockReturnValue(false),
  keyId: vi.fn().mockReturnValue(""),
  bookingAmountPaise: vi.fn().mockReturnValue(100),
  createOrder: vi.fn(),
  verifyPaymentSignature: vi.fn(),
};

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
    razorpayDisabled.isEnabled.mockReturnValue(false);
    service = new BookingsService(
      prisma as never,
      memberships as never,
      crypto as never,
      scheduleConflicts as never,
      razorpayDisabled as never,
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

describe("BookingsService.confirmPayment", () => {
  const tx = {
    $queryRaw: vi.fn().mockResolvedValue([{ id: "batch-1" }]),
    batch: { findUnique: vi.fn() },
    booking: {
      findUnique: vi.fn(),
      findFirst: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
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
    booking: {
      findUnique: vi.fn(),
    },
    familyMember: { findUnique: vi.fn() },
    parentChild: { findUnique: vi.fn() },
    $transaction: vi.fn(async (fn: (client: typeof tx) => unknown) => fn(tx)),
  };

  const memberships = { findActiveForBatch: vi.fn() };
  const crypto = { decryptUser: (user: unknown) => user };
  const scheduleConflicts = {
    assertNoConflicts: vi.fn(),
    assertStudentAvailableForBatch: vi.fn(),
  };

  let service: BookingsService;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma.$transaction.mockImplementation(
      async (fn: (client: typeof tx) => unknown) => fn(tx),
    );
    razorpayDisabled.isEnabled.mockReturnValue(false);
    service = new BookingsService(
      prisma as never,
      memberships as never,
      crypto as never,
      scheduleConflicts as never,
      razorpayDisabled as never,
    );
  });

  it("moves AWAITING_PAYMENT to PENDING when hold is valid", async () => {
    const booking = {
      id: "bk-1",
      studentId: "student-1",
      status: "AWAITING_PAYMENT",
      type: "TRIAL",
      batchId: "batch-1",
      paymentHoldExpiresAt: new Date(Date.now() + 60_000),
      studio: { settings: null },
    };
    tx.booking.findUnique.mockResolvedValue(booking);
    tx.batch.findUnique.mockResolvedValue({ capacity: 10 });
    tx.booking.update.mockResolvedValue({
      ...booking,
      status: "PENDING",
      paymentHoldExpiresAt: null,
    });

    await service.confirmPayment("bk-1", {
      id: "student-1",
      role: "STUDENT",
    } as never);

    expect(tx.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "bk-1" },
        data: expect.objectContaining({
          status: "PENDING",
          paymentHoldExpiresAt: null,
        }),
      }),
    );
  });

  it("rejects confirm when payment window expired", async () => {
    tx.booking.findUnique.mockResolvedValue({
      id: "bk-1",
      studentId: "student-1",
      status: "AWAITING_PAYMENT",
      type: "TRIAL",
      batchId: "batch-1",
      paymentHoldExpiresAt: new Date(Date.now() - 1_000),
    });
    tx.booking.update.mockResolvedValue({ id: "bk-1", status: "CANCELLED" });

    await expect(
      service.confirmPayment("bk-1", {
        id: "student-1",
        role: "STUDENT",
      } as never),
    ).rejects.toThrow(/Payment window expired/);
  });

  it("rejects confirm when booking is not awaiting payment", async () => {
    tx.booking.findUnique.mockResolvedValue({
      id: "bk-1",
      studentId: "student-1",
      status: "CONFIRMED",
      type: "TRIAL",
      batchId: null,
      paymentHoldExpiresAt: null,
    });

    await expect(
      service.confirmPayment("bk-1", {
        id: "student-1",
        role: "STUDENT",
      } as never),
    ).rejects.toThrow(/not awaiting payment/);
  });

  it("returns existing PENDING booking without updating", async () => {
    const booking = {
      id: "bk-1",
      studentId: "student-1",
      status: "PENDING",
      type: "TRIAL",
      batchId: null,
      paymentHoldExpiresAt: null,
    };
    tx.booking.findUnique.mockResolvedValue(booking);

    await expect(
      service.confirmPayment("bk-1", {
        id: "student-1",
        role: "STUDENT",
      } as never),
    ).resolves.toEqual(booking);
    expect(tx.booking.update).not.toHaveBeenCalled();
  });

  it("rejects confirm when Razorpay is enabled and signature is missing", async () => {
    razorpayDisabled.isEnabled.mockReturnValue(true);
    tx.booking.findUnique.mockResolvedValue({
      id: "bk-1",
      studentId: "student-1",
      status: "AWAITING_PAYMENT",
      type: "TRIAL",
      batchId: null,
      paymentHoldExpiresAt: new Date(Date.now() + 60_000),
      razorpayOrderId: "order_1",
      studio: { settings: null },
    });

    await expect(
      service.confirmPayment("bk-1", {
        id: "student-1",
        role: "STUDENT",
      } as never),
    ).rejects.toThrow(/Razorpay payment details are required/);
  });

  it("rejects confirm when Razorpay signature is invalid", async () => {
    razorpayDisabled.isEnabled.mockReturnValue(true);
    razorpayDisabled.verifyPaymentSignature.mockReturnValue(false);
    tx.booking.findUnique.mockResolvedValue({
      id: "bk-1",
      studentId: "student-1",
      status: "AWAITING_PAYMENT",
      type: "TRIAL",
      batchId: null,
      paymentHoldExpiresAt: new Date(Date.now() + 60_000),
      razorpayOrderId: "order_1",
      studio: { settings: null },
    });

    await expect(
      service.confirmPayment(
        "bk-1",
        { id: "student-1", role: "STUDENT" } as never,
        {
          razorpay_order_id: "order_1",
          razorpay_payment_id: "pay_1",
          razorpay_signature: "bad",
        },
      ),
    ).rejects.toThrow(/Invalid Razorpay payment signature/);
  });

  it("rejects confirm when Razorpay order does not match booking", async () => {
    razorpayDisabled.isEnabled.mockReturnValue(true);
    tx.booking.findUnique.mockResolvedValue({
      id: "bk-1",
      studentId: "student-1",
      status: "AWAITING_PAYMENT",
      type: "TRIAL",
      batchId: null,
      paymentHoldExpiresAt: new Date(Date.now() + 60_000),
      razorpayOrderId: "order_1",
      studio: { settings: null },
    });

    await expect(
      service.confirmPayment(
        "bk-1",
        { id: "student-1", role: "STUDENT" } as never,
        {
          razorpay_order_id: "order_other",
          razorpay_payment_id: "pay_1",
          razorpay_signature: "sig",
        },
      ),
    ).rejects.toThrow(/order does not match/);
  });

  it("confirms payment when Razorpay signature is valid", async () => {
    razorpayDisabled.isEnabled.mockReturnValue(true);
    razorpayDisabled.verifyPaymentSignature.mockReturnValue(true);
    const booking = {
      id: "bk-1",
      studentId: "student-1",
      status: "AWAITING_PAYMENT",
      type: "TRIAL",
      batchId: null,
      paymentHoldExpiresAt: new Date(Date.now() + 60_000),
      razorpayOrderId: "order_1",
      studio: { settings: null },
    };
    tx.booking.findUnique.mockResolvedValue(booking);
    tx.booking.update.mockResolvedValue({
      ...booking,
      status: "PENDING",
      paymentHoldExpiresAt: null,
      razorpayPaymentId: "pay_1",
    });

    await service.confirmPayment(
      "bk-1",
      { id: "student-1", role: "STUDENT" } as never,
      {
        razorpay_order_id: "order_1",
        razorpay_payment_id: "pay_1",
        razorpay_signature: "good",
      },
    );

    expect(tx.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "PENDING",
          razorpayPaymentId: "pay_1",
        }),
      }),
    );
  });
});

describe("BookingsService.createPaymentOrder", () => {
  const prisma = {
    booking: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    familyMember: { findUnique: vi.fn() },
    parentChild: { findUnique: vi.fn() },
    $transaction: vi.fn(async (fn: (client: unknown) => unknown) =>
      fn({
        booking: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
      }),
    ),
  };

  const memberships = { findActiveForBatch: vi.fn() };
  const crypto = { decryptUser: (user: unknown) => user };
  const scheduleConflicts = {
    assertNoConflicts: vi.fn(),
    assertStudentAvailableForBatch: vi.fn(),
  };
  const razorpay = {
    isEnabled: vi.fn(),
    keyId: vi.fn().mockReturnValue("rzp_test_key"),
    bookingAmountPaise: vi.fn().mockReturnValue(100),
    createOrder: vi.fn(),
    verifyPaymentSignature: vi.fn(),
  };

  let service: BookingsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new BookingsService(
      prisma as never,
      memberships as never,
      crypto as never,
      scheduleConflicts as never,
      razorpay as never,
    );
  });

  it("returns demo mode when Razorpay is not configured", async () => {
    razorpay.isEnabled.mockReturnValue(false);
    prisma.booking.findUnique.mockResolvedValue({
      id: "bk-1",
      studentId: "student-1",
      status: "AWAITING_PAYMENT",
      paymentHoldExpiresAt: new Date(Date.now() + 60_000),
      razorpayOrderId: null,
      studio: { settings: null },
    });

    await expect(
      service.createPaymentOrder("bk-1", {
        id: "student-1",
        role: "STUDENT",
      } as never),
    ).resolves.toEqual({ mode: "demo" });
    expect(razorpay.createOrder).not.toHaveBeenCalled();
  });

  it("returns existing order when already created", async () => {
    razorpay.isEnabled.mockReturnValue(true);
    razorpay.keyId.mockReturnValue("rzp_test_key");
    prisma.booking.findUnique.mockResolvedValue({
      id: "bk-1",
      studentId: "student-1",
      status: "AWAITING_PAYMENT",
      paymentHoldExpiresAt: new Date(Date.now() + 60_000),
      razorpayOrderId: "order_existing",
      studio: { settings: null },
    });

    await expect(
      service.createPaymentOrder("bk-1", {
        id: "student-1",
        role: "STUDENT",
      } as never),
    ).resolves.toEqual({
      mode: "razorpay",
      keyId: "rzp_test_key",
      orderId: "order_existing",
      amount: 100,
      currency: "INR",
    });
    expect(razorpay.createOrder).not.toHaveBeenCalled();
  });

  it("creates and persists a new Razorpay order", async () => {
    razorpay.isEnabled.mockReturnValue(true);
    razorpay.keyId.mockReturnValue("rzp_test_key");
    prisma.booking.findUnique.mockResolvedValue({
      id: "bk-1",
      studentId: "student-1",
      status: "AWAITING_PAYMENT",
      paymentHoldExpiresAt: new Date(Date.now() + 60_000),
      razorpayOrderId: null,
      studio: { settings: null },
    });
    razorpay.createOrder.mockResolvedValue({
      orderId: "order_new",
      amount: 100,
      currency: "INR",
    });
    prisma.booking.update.mockResolvedValue({ id: "bk-1" });

    await expect(
      service.createPaymentOrder("bk-1", {
        id: "student-1",
        role: "STUDENT",
      } as never),
    ).resolves.toEqual({
      mode: "razorpay",
      keyId: "rzp_test_key",
      orderId: "order_new",
      amount: 100,
      currency: "INR",
    });
    expect(prisma.booking.update).toHaveBeenCalledWith({
      where: { id: "bk-1" },
      data: { razorpayOrderId: "order_new" },
    });
  });

  it("passes studio settings into Razorpay when configured", async () => {
    const settings = {
      razorpayKeyId: "rzp_studio",
      razorpayKeySecret: "cipher",
      razorpaySecretIv: "iv",
    };
    razorpay.isEnabled.mockReturnValue(true);
    razorpay.keyId.mockReturnValue("rzp_studio");
    prisma.booking.findUnique.mockResolvedValue({
      id: "bk-1",
      studentId: "student-1",
      status: "AWAITING_PAYMENT",
      paymentHoldExpiresAt: new Date(Date.now() + 60_000),
      razorpayOrderId: null,
      studio: { settings },
    });
    razorpay.createOrder.mockResolvedValue({
      orderId: "order_studio",
      amount: 100,
      currency: "INR",
    });
    prisma.booking.update.mockResolvedValue({ id: "bk-1" });

    await expect(
      service.createPaymentOrder("bk-1", {
        id: "student-1",
        role: "STUDENT",
      } as never),
    ).resolves.toMatchObject({
      mode: "razorpay",
      keyId: "rzp_studio",
      orderId: "order_studio",
    });
    expect(razorpay.isEnabled).toHaveBeenCalledWith(settings);
    expect(razorpay.keyId).toHaveBeenCalledWith(settings);
    expect(razorpay.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({ receipt: "bk-1" }),
      settings,
    );
  });
});

describe("BookingsService.abandonPayment", () => {
  const tx = {
    booking: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  };

  const prisma = {
    booking: {
      findUnique: vi.fn(),
    },
    familyMember: { findUnique: vi.fn() },
    parentChild: { findUnique: vi.fn() },
    $transaction: vi.fn(async (fn: (client: typeof tx) => unknown) => fn(tx)),
  };

  const memberships = { findActiveForBatch: vi.fn() };
  const crypto = { decryptUser: (user: unknown) => user };
  const scheduleConflicts = {
    assertNoConflicts: vi.fn(),
    assertStudentAvailableForBatch: vi.fn(),
  };

  let service: BookingsService;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma.$transaction.mockImplementation(
      async (fn: (client: typeof tx) => unknown) => fn(tx),
    );
    razorpayDisabled.isEnabled.mockReturnValue(false);
    service = new BookingsService(
      prisma as never,
      memberships as never,
      crypto as never,
      scheduleConflicts as never,
      razorpayDisabled as never,
    );
  });

  it("cancels an awaiting-payment hold", async () => {
    const booking = {
      id: "bk-1",
      studentId: "student-1",
      status: "AWAITING_PAYMENT",
      paymentHoldExpiresAt: new Date(Date.now() + 60_000),
    };
    tx.booking.findUnique.mockResolvedValue(booking);
    tx.booking.update.mockResolvedValue({
      ...booking,
      status: "CANCELLED",
      paymentHoldExpiresAt: null,
    });

    await service.abandonPayment("bk-1", {
      id: "student-1",
      role: "STUDENT",
    } as never);

    expect(tx.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "bk-1" },
        data: expect.objectContaining({
          status: "CANCELLED",
          paymentHoldExpiresAt: null,
        }),
      }),
    );
  });

  it("is a no-op when booking is not awaiting payment", async () => {
    const booking = {
      id: "bk-1",
      studentId: "student-1",
      status: "PENDING",
      paymentHoldExpiresAt: null,
    };
    tx.booking.findUnique.mockResolvedValue(booking);

    await expect(
      service.abandonPayment("bk-1", {
        id: "student-1",
        role: "STUDENT",
      } as never),
    ).resolves.toEqual(booking);
    expect(tx.booking.update).not.toHaveBeenCalled();
  });
});

describe("BookingsService.cancelBooking", () => {
  const prisma = {
    booking: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    familyMember: { findUnique: vi.fn() },
    parentChild: { findUnique: vi.fn() },
  };

  const memberships = { findActiveForBatch: vi.fn() };
  const crypto = { decryptUser: (user: unknown) => user };
  const scheduleConflicts = {
    assertNoConflicts: vi.fn(),
    assertStudentAvailableForBatch: vi.fn(),
  };

  let service: BookingsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new BookingsService(
      prisma as never,
      memberships as never,
      crypto as never,
      scheduleConflicts as never,
      razorpayDisabled as never,
    );
  });

  it("cancels a confirmed booking", async () => {
    prisma.booking.findUnique.mockResolvedValue({
      id: "bk-1",
      studentId: "student-1",
      status: "CONFIRMED",
      notes: null,
    });
    prisma.booking.update.mockResolvedValue({
      id: "bk-1",
      status: "CANCELLED",
    });

    await service.cancelBooking("bk-1", {
      id: "student-1",
      role: "STUDENT",
    } as never);

    expect(prisma.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "bk-1" },
        data: expect.objectContaining({ status: "CANCELLED" }),
      }),
    );
  });

  it("rejects cancel when awaiting payment", async () => {
    prisma.booking.findUnique.mockResolvedValue({
      id: "bk-1",
      studentId: "student-1",
      status: "AWAITING_PAYMENT",
      notes: null,
    });

    await expect(
      service.cancelBooking("bk-1", {
        id: "student-1",
        role: "STUDENT",
      } as never),
    ).rejects.toThrow(/pending or confirmed/i);
  });
});

describe("BookingsService.requestReschedule", () => {
  const prisma = {
    booking: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    session: { findUnique: vi.fn() },
    familyMember: { findUnique: vi.fn() },
    parentChild: { findUnique: vi.fn() },
  };

  const memberships = { findActiveForBatch: vi.fn() };
  const crypto = { decryptUser: (user: unknown) => user };
  const scheduleConflicts = {
    assertNoConflicts: vi.fn(),
    assertStudentAvailableForBatch: vi.fn(),
  };

  let service: BookingsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new BookingsService(
      prisma as never,
      memberships as never,
      crypto as never,
      scheduleConflicts as never,
      razorpayDisabled as never,
    );
  });

  it("moves confirmed bookings to pending with new times", async () => {
    const startsAt = new Date("2026-08-10T10:00:00.000Z");
    const endsAt = new Date("2026-08-10T11:00:00.000Z");
    prisma.booking.findUnique.mockResolvedValue({
      id: "bk-1",
      studentId: "student-1",
      status: "CONFIRMED",
      batchId: null,
      trainerId: null,
      notes: null,
      batch: null,
    });
    prisma.booking.update.mockResolvedValue({
      id: "bk-1",
      status: "PENDING",
    });

    await service.requestReschedule(
      "bk-1",
      { id: "student-1", role: "STUDENT" } as never,
      {
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
      },
    );

    expect(scheduleConflicts.assertNoConflicts).toHaveBeenCalled();
    expect(prisma.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "PENDING",
          sessionId: null,
          startsAt,
          endsAt,
        }),
      }),
    );
  });

  it("rejects when neither session nor range is provided", async () => {
    await expect(
      service.requestReschedule(
        "bk-1",
        { id: "student-1", role: "STUDENT" } as never,
        {},
      ),
    ).rejects.toThrow(/sessionId or both startsAt/i);
  });
});

describe("BookingsService.create overdue invoice freeze", () => {
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
    razorpayDisabled.isEnabled.mockReturnValue(false);
    service = new BookingsService(
      prisma as never,
      memberships as never,
      crypto as never,
      scheduleConflicts as never,
      razorpayDisabled as never,
    );
  });

  it("rejects create when the student has an overdue invoice", async () => {
    prisma.invoice.findFirst.mockResolvedValue({ id: "inv-overdue" });

    await expect(
      service.create({
        studioId: "studio-1",
        studentId: "student-1",
        type: "OPEN_SEAT",
        batchId: "batch-1",
      }),
    ).rejects.toThrow(/overdue invoice/);
    expect(tx.booking.create).not.toHaveBeenCalled();
  });
});
