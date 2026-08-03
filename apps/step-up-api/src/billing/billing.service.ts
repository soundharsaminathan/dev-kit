import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  InvoiceStatus,
  MembershipSeatRole,
  PaymentMethod,
  Prisma,
  type User,
  UserRole,
} from "@prisma/client";
import { computePlatformFee } from "../memberships/membership-helpers";
import {
  type CoveredStudentInput,
  type InvoicePurchaseMeta,
  MembershipsService,
} from "../memberships/memberships.service";
import { RazorpayService } from "../payments/razorpay.service";
import { PrismaService } from "../prisma/prisma.service";
import {
  type DecryptedUser,
  UserCryptoService,
} from "../users/user-crypto.service";

export type TrainerPaymentAnalytics = {
  trainerId: string;
  trainerName: string;
  studioId: string;
  from: string | null;
  to: string | null;
  studentCount: number;
  invoiceCount: number;
  totals: {
    collected: number;
    pending: number;
    overdue: number;
    platformFees: number;
    netCollected: number;
  };
  byStatus: Record<InvoiceStatus, { count: number; amount: number }>;
  byPaymentMethod: Record<PaymentMethod, { count: number; amount: number }>;
  byBatch: Array<{
    batchId: string;
    batchName: string;
    studentCount: number;
    invoiceCount: number;
    collected: number;
    pending: number;
    overdue: number;
  }>;
  invoices: Array<{
    id: string;
    studentId: string;
    studentName: string;
    amount: number;
    status: InvoiceStatus;
    paymentMethod: PaymentMethod | null;
    paidAt: string | null;
    platformFee: number;
    batchIds: string[];
  }>;
};

export type ConfirmInvoicePaymentInput = {
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
};

export type CreateInvoicePaymentOrderResult =
  | { mode: "demo" }
  | {
      mode: "razorpay";
      keyId: string;
      orderId: string;
      amount: number;
      currency: string;
    };

function parsePurchaseMeta(value: unknown): InvoicePurchaseMeta | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const meta = value as Record<string, unknown>;
  if (
    typeof meta.batchId !== "string" ||
    typeof meta.subscriptionId !== "string" ||
    typeof meta.purchaserUserId !== "string" ||
    !Array.isArray(meta.coveredStudents)
  ) {
    return null;
  }

  const coveredStudents: CoveredStudentInput[] = [];
  for (const seat of meta.coveredStudents) {
    if (!seat || typeof seat !== "object" || Array.isArray(seat)) {
      return null;
    }
    const entry = seat as Record<string, unknown>;
    if (
      typeof entry.studentId !== "string" ||
      (entry.seatRole !== MembershipSeatRole.ADULT &&
        entry.seatRole !== MembershipSeatRole.KID)
    ) {
      return null;
    }
    coveredStudents.push({
      studentId: entry.studentId,
      seatRole: entry.seatRole,
      ...(typeof entry.batchId === "string" ? { batchId: entry.batchId } : {}),
    });
  }

  return {
    batchId: meta.batchId,
    subscriptionId: meta.subscriptionId,
    purchaserUserId: meta.purchaserUserId,
    coveredStudents,
  };
}

function amountToPaise(amount: Prisma.Decimal | number | string) {
  const rupees = Number(amount);
  if (!Number.isFinite(rupees) || rupees <= 0) {
    return 0;
  }
  return Math.round(rupees * 100);
}

@Injectable()
export class BillingService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(UserCryptoService) private readonly crypto: UserCryptoService,
    @Inject(MembershipsService)
    private readonly memberships: MembershipsService,
    @Inject(RazorpayService) private readonly razorpay: RazorpayService,
  ) {}

  async listByStudio(studioId: string) {
    const invoices = await this.prisma.invoice.findMany({
      where: { studioId },
      include: { student: true, membership: true },
      orderBy: { id: "desc" },
    });

    return invoices.map((invoice) => ({
      ...invoice,
      student: this.crypto.decryptUser(invoice.student),
    }));
  }

  async listForStudent(actor: DecryptedUser, studentId: string) {
    await this.assertCanAccessStudentInvoices(actor, studentId);
    return this.prisma.invoice.findMany({
      where: { studentId },
      orderBy: { id: "desc" },
    });
  }

  async getTrainerAnalytics(
    actor: DecryptedUser,
    trainerId: string,
    studioId: string,
    options: { from?: string; to?: string } = {},
  ): Promise<TrainerPaymentAnalytics> {
    const resolvedTrainerId = this.resolveTrainerScope(actor, trainerId);

    if (actor.studioId !== studioId) {
      throw new ForbiddenException("Cannot view analytics for another studio");
    }

    const from = options.from ? new Date(options.from) : null;
    const to = options.to ? new Date(options.to) : null;

    if (from && Number.isNaN(from.getTime())) {
      throw new BadRequestException("Invalid from date");
    }
    if (to && Number.isNaN(to.getTime())) {
      throw new BadRequestException("Invalid to date");
    }

    const trainer = await this.prisma.user.findFirst({
      where: {
        id: resolvedTrainerId,
        studioId,
        role: UserRole.TRAINER,
      },
    });

    if (!trainer) {
      throw new NotFoundException("Trainer not found in this studio");
    }

    const batchLinks = await this.prisma.batchTrainer.findMany({
      where: {
        trainerId: resolvedTrainerId,
        batch: { studioId },
      },
      include: {
        batch: {
          include: {
            enrollments: true,
          },
        },
      },
    });

    const batches = batchLinks.map((link) => link.batch);
    const studentBatchMap = new Map<string, Set<string>>();

    for (const batch of batches) {
      for (const enrollment of batch.enrollments) {
        const batchIds = studentBatchMap.get(enrollment.studentId) ?? new Set();
        batchIds.add(batch.id);
        studentBatchMap.set(enrollment.studentId, batchIds);
      }
    }

    const studentIds = [...studentBatchMap.keys()];
    const emptyBatchRows = batches.map((batch) => ({
      batchId: batch.id,
      batchName: batch.name,
      studentCount: batch.enrollments.length,
      invoiceCount: 0,
      collected: 0,
      pending: 0,
      overdue: 0,
    }));

    if (studentIds.length === 0) {
      return {
        ...this.emptyAnalytics(trainer, studioId, from, to, 0),
        byBatch: emptyBatchRows,
      };
    }

    const invoices = await this.prisma.invoice.findMany({
      where: {
        studioId,
        studentId: { in: studentIds },
      },
      include: { student: true },
      orderBy: [{ paidAt: "desc" }, { id: "desc" }],
    });

    const filtered = invoices.filter((invoice) => {
      if (!from && !to) {
        return true;
      }
      if (invoice.status !== InvoiceStatus.PAID) {
        return true;
      }
      if (!invoice.paidAt) {
        return false;
      }
      if (from && invoice.paidAt < from) {
        return false;
      }
      if (to && invoice.paidAt > to) {
        return false;
      }
      return true;
    });

    const byStatus: TrainerPaymentAnalytics["byStatus"] = {
      [InvoiceStatus.PAID]: { count: 0, amount: 0 },
      [InvoiceStatus.PENDING]: { count: 0, amount: 0 },
      [InvoiceStatus.OVERDUE]: { count: 0, amount: 0 },
    };
    const byPaymentMethod: TrainerPaymentAnalytics["byPaymentMethod"] = {
      [PaymentMethod.CASH]: { count: 0, amount: 0 },
      [PaymentMethod.UPI_MANUAL]: { count: 0, amount: 0 },
      [PaymentMethod.RAZORPAY]: { count: 0, amount: 0 },
    };
    const batchTotals = new Map<
      string,
      {
        batchId: string;
        batchName: string;
        studentIds: Set<string>;
        invoiceIds: Set<string>;
        collected: number;
        pending: number;
        overdue: number;
      }
    >();

    for (const batch of batches) {
      batchTotals.set(batch.id, {
        batchId: batch.id,
        batchName: batch.name,
        studentIds: new Set(
          batch.enrollments.map((enrollment) => enrollment.studentId),
        ),
        invoiceIds: new Set(),
        collected: 0,
        pending: 0,
        overdue: 0,
      });
    }

    let collected = 0;
    let pending = 0;
    let overdue = 0;
    let platformFees = 0;

    const invoiceRows: TrainerPaymentAnalytics["invoices"] = filtered.map(
      (invoice) => {
        const amount = Number(invoice.amount);
        const platformFee = computePlatformFee(
          amount,
          invoice.platformFeePercent,
        );
        const student = this.crypto.decryptUser(invoice.student);
        const batchIds = [...(studentBatchMap.get(invoice.studentId) ?? [])];

        byStatus[invoice.status].count += 1;
        byStatus[invoice.status].amount += amount;

        if (invoice.status === InvoiceStatus.PAID) {
          collected += amount;
          platformFees += platformFee;
          if (invoice.paymentMethod) {
            byPaymentMethod[invoice.paymentMethod].count += 1;
            byPaymentMethod[invoice.paymentMethod].amount += amount;
          }
        } else if (invoice.status === InvoiceStatus.PENDING) {
          pending += amount;
        } else {
          overdue += amount;
        }

        for (const batchId of batchIds) {
          const entry = batchTotals.get(batchId);
          if (!entry || entry.invoiceIds.has(invoice.id)) {
            continue;
          }
          entry.invoiceIds.add(invoice.id);
          if (invoice.status === InvoiceStatus.PAID) {
            entry.collected += amount;
          } else if (invoice.status === InvoiceStatus.PENDING) {
            entry.pending += amount;
          } else {
            entry.overdue += amount;
          }
        }

        return {
          id: invoice.id,
          studentId: invoice.studentId,
          studentName: student.name,
          amount,
          status: invoice.status,
          paymentMethod: invoice.paymentMethod,
          paidAt: invoice.paidAt?.toISOString() ?? null,
          platformFee,
          batchIds,
        };
      },
    );

    return {
      trainerId: trainer.id,
      trainerName: this.crypto.decryptUser(trainer).name,
      studioId,
      from: from?.toISOString() ?? null,
      to: to?.toISOString() ?? null,
      studentCount: studentIds.length,
      invoiceCount: filtered.length,
      totals: {
        collected: roundMoney(collected),
        pending: roundMoney(pending),
        overdue: roundMoney(overdue),
        platformFees: roundMoney(platformFees),
        netCollected: roundMoney(collected - platformFees),
      },
      byStatus: {
        PAID: {
          count: byStatus.PAID.count,
          amount: roundMoney(byStatus.PAID.amount),
        },
        PENDING: {
          count: byStatus.PENDING.count,
          amount: roundMoney(byStatus.PENDING.amount),
        },
        OVERDUE: {
          count: byStatus.OVERDUE.count,
          amount: roundMoney(byStatus.OVERDUE.amount),
        },
      },
      byPaymentMethod: {
        CASH: {
          count: byPaymentMethod.CASH.count,
          amount: roundMoney(byPaymentMethod.CASH.amount),
        },
        UPI_MANUAL: {
          count: byPaymentMethod.UPI_MANUAL.count,
          amount: roundMoney(byPaymentMethod.UPI_MANUAL.amount),
        },
        RAZORPAY: {
          count: byPaymentMethod.RAZORPAY.count,
          amount: roundMoney(byPaymentMethod.RAZORPAY.amount),
        },
      },
      byBatch: [...batchTotals.values()].map((batch) => ({
        batchId: batch.batchId,
        batchName: batch.batchName,
        studentCount: batch.studentIds.size,
        invoiceCount: batch.invoiceIds.size,
        collected: roundMoney(batch.collected),
        pending: roundMoney(batch.pending),
        overdue: roundMoney(batch.overdue),
      })),
      invoices: invoiceRows,
    };
  }

  async markPaid(
    actor: DecryptedUser,
    id: string,
    paymentMethod: PaymentMethod,
  ) {
    if (actor.role !== UserRole.OWNER && actor.role !== UserRole.STAFF) {
      throw new ForbiddenException("Only studio admins can mark invoices paid");
    }

    const invoice = await this.prisma.invoice.findUniqueOrThrow({
      where: { id },
    });

    if (actor.studioId !== invoice.studioId) {
      throw new ForbiddenException("Cannot mark invoices for another studio");
    }

    if (invoice.status === InvoiceStatus.PAID) {
      throw new BadRequestException("Invoice is already paid");
    }

    const amount = Number(invoice.amount);
    const platformFee = computePlatformFee(amount, invoice.platformFeePercent);

    const result = await this.prisma.invoice.update({
      where: { id },
      data: {
        status: InvoiceStatus.PAID,
        paymentMethod,
        paidAt: new Date(),
      },
    });

    if (invoice.membershipId) {
      await this.memberships.renewFromPaidInvoice(invoice.membershipId);
    }

    return {
      ...result,
      platformFeeComputed: platformFee,
    };
  }

  createInvoice(data: {
    studentId: string;
    studioId: string;
    amount: number;
    membershipId?: string;
    platformFeePercent: number;
  }) {
    return this.prisma.invoice.create({
      data: {
        studentId: data.studentId,
        studioId: data.studioId,
        membershipId: data.membershipId,
        amount: data.amount,
        status: InvoiceStatus.PENDING,
        platformFeePercent: data.platformFeePercent,
      },
    });
  }

  async createPendingInvoice(
    actor: DecryptedUser,
    data: {
      studentId: string;
      studioId: string;
      amount: number;
      membershipId?: string;
    },
  ) {
    if (actor.role !== UserRole.OWNER && actor.role !== UserRole.STAFF) {
      throw new ForbiddenException("Only studio admins can create invoices");
    }
    if (actor.studioId !== data.studioId) {
      throw new ForbiddenException("Cannot create invoices for another studio");
    }
    if (!(data.amount > 0)) {
      throw new BadRequestException("Amount must be greater than zero");
    }

    const student = await this.prisma.user.findFirst({
      where: {
        id: data.studentId,
        studioId: data.studioId,
        role: UserRole.STUDENT,
      },
      select: { id: true },
    });
    if (!student) {
      throw new BadRequestException("Select a student from this studio");
    }

    if (data.membershipId) {
      const membership = await this.prisma.membership.findFirst({
        where: {
          id: data.membershipId,
          coveredStudents: { some: { studentId: data.studentId } },
        },
        select: { id: true },
      });
      if (!membership) {
        throw new BadRequestException("Membership does not cover this student");
      }
    }

    const settings = await this.prisma.studioSettings.findUnique({
      where: { studioId: data.studioId },
      select: { platformFeePercent: true },
    });

    return this.createInvoice({
      studentId: data.studentId,
      studioId: data.studioId,
      amount: data.amount,
      membershipId: data.membershipId,
      platformFeePercent: settings?.platformFeePercent ?? 5,
    });
  }

  async getCheckoutInvoice(id: string, actor: DecryptedUser) {
    await this.expireStaleCheckoutInvoices();

    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        studio: { select: { id: true, name: true } },
      },
    });
    if (!invoice) {
      throw new NotFoundException("Invoice not found");
    }

    await this.assertCanAccessStudentInvoices(actor, invoice.studentId);

    const purchaseMeta = parsePurchaseMeta(invoice.purchaseMeta);
    let batch: { id: string; name: string } | null = null;
    if (purchaseMeta?.batchId) {
      batch = await this.prisma.batch.findUnique({
        where: { id: purchaseMeta.batchId },
        select: { id: true, name: true },
      });
    }

    return {
      ...invoice,
      amount: Number(invoice.amount),
      batch,
      purchaseMeta,
    };
  }

  async createInvoicePaymentOrder(
    id: string,
    actor: DecryptedUser,
  ): Promise<CreateInvoicePaymentOrderResult> {
    await this.expireStaleCheckoutInvoices();

    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        studio: { include: { settings: true } },
      },
    });
    if (!invoice) {
      throw new NotFoundException("Invoice not found");
    }

    await this.assertCanAccessStudentInvoices(actor, invoice.studentId);
    this.assertCheckoutHold(invoice);

    const settings = invoice.studio.settings;
    if (!this.razorpay.isEnabled(settings ?? undefined)) {
      return { mode: "demo" };
    }

    const amountPaise = amountToPaise(invoice.amount);
    if (amountPaise < 100) {
      throw new BadRequestException("Amount must be at least 100 paise");
    }

    const keyId = this.razorpay.keyId(settings ?? undefined);
    if (invoice.razorpayOrderId) {
      return {
        mode: "razorpay",
        keyId,
        orderId: invoice.razorpayOrderId,
        amount: amountPaise,
        currency: "INR",
      };
    }

    const order = await this.razorpay.createOrder(
      {
        receipt: invoice.id,
        amountPaise,
        notes: { invoiceId: invoice.id },
      },
      settings ?? undefined,
    );

    await this.prisma.invoice.update({
      where: { id },
      data: { razorpayOrderId: order.orderId },
    });

    return {
      mode: "razorpay",
      keyId,
      orderId: order.orderId,
      amount: order.amount,
      currency: order.currency,
    };
  }

  async confirmInvoicePayment(
    id: string,
    actor: DecryptedUser,
    payment: ConfirmInvoicePaymentInput = {},
  ) {
    await this.expireStaleCheckoutInvoices();

    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        studio: { include: { settings: true } },
      },
    });
    if (!invoice) {
      throw new NotFoundException("Invoice not found");
    }

    await this.assertCanAccessStudentInvoices(actor, invoice.studentId);

    if (invoice.status === InvoiceStatus.PAID) {
      return {
        ...invoice,
        amount: Number(invoice.amount),
      };
    }

    this.assertCheckoutHold(invoice);

    const purchaseMeta = parsePurchaseMeta(invoice.purchaseMeta);
    if (!purchaseMeta) {
      throw new BadRequestException("Invoice is not a checkout payment");
    }

    const settings = invoice.studio.settings;
    const razorpayEnabled = this.razorpay.isEnabled(settings ?? undefined);
    let razorpayPaymentId: string | undefined;

    if (razorpayEnabled) {
      const orderId = payment.razorpay_order_id?.trim();
      const paymentId = payment.razorpay_payment_id?.trim();
      const signature = payment.razorpay_signature?.trim();

      if (!orderId || !paymentId || !signature) {
        throw new BadRequestException("Razorpay payment details are required");
      }

      if (!invoice.razorpayOrderId || invoice.razorpayOrderId !== orderId) {
        throw new BadRequestException(
          "Razorpay order does not match this invoice",
        );
      }

      const valid = this.razorpay.verifyPaymentSignature(
        {
          orderId,
          paymentId,
          signature,
        },
        settings ?? undefined,
      );
      if (!valid) {
        throw new BadRequestException("Invalid Razorpay payment signature");
      }

      razorpayPaymentId = paymentId;
    }

    const membership = await this.memberships.assign({
      subscriptionId: purchaseMeta.subscriptionId,
      purchaserUserId: purchaseMeta.purchaserUserId,
      coveredStudents: purchaseMeta.coveredStudents,
    });

    const updated = await this.prisma.invoice.update({
      where: { id },
      data: {
        status: InvoiceStatus.PAID,
        paymentMethod: PaymentMethod.RAZORPAY,
        paidAt: new Date(),
        membershipId: membership.id,
        paymentHoldExpiresAt: null,
        purchaseMeta: Prisma.DbNull,
        ...(razorpayPaymentId ? { razorpayPaymentId } : {}),
      },
    });

    return {
      ...updated,
      amount: Number(updated.amount),
      membership,
    };
  }

  async abandonInvoicePayment(id: string, actor: DecryptedUser) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id } });
    if (!invoice) {
      throw new NotFoundException("Invoice not found");
    }

    await this.assertCanAccessStudentInvoices(actor, invoice.studentId);

    if (invoice.status !== InvoiceStatus.PENDING) {
      return invoice;
    }

    if (!parsePurchaseMeta(invoice.purchaseMeta)) {
      throw new BadRequestException("Invoice is not a checkout payment");
    }

    await this.prisma.invoice.delete({ where: { id } });
    return { id, status: "CANCELLED" as const };
  }

  private async expireStaleCheckoutInvoices() {
    await this.prisma.invoice.deleteMany({
      where: {
        status: InvoiceStatus.PENDING,
        paymentHoldExpiresAt: { lte: new Date() },
        purchaseMeta: { not: Prisma.DbNull },
      },
    });
  }

  private assertCheckoutHold(invoice: {
    status: InvoiceStatus;
    paymentHoldExpiresAt: Date | null;
    purchaseMeta: Prisma.JsonValue | null;
  }) {
    if (invoice.status !== InvoiceStatus.PENDING) {
      throw new BadRequestException("Invoice is not awaiting payment");
    }
    if (!parsePurchaseMeta(invoice.purchaseMeta)) {
      throw new BadRequestException("Invoice is not a checkout payment");
    }
    if (
      !invoice.paymentHoldExpiresAt ||
      invoice.paymentHoldExpiresAt.getTime() <= Date.now()
    ) {
      throw new BadRequestException(
        "Payment window expired. Please choose a plan again.",
      );
    }
  }

  private async assertCanAccessStudentInvoices(
    actor: DecryptedUser,
    studentId: string,
  ) {
    const staffRoles: UserRole[] = [
      UserRole.OWNER,
      UserRole.STAFF,
      UserRole.TRAINER,
    ];
    if (staffRoles.includes(actor.role) || actor.id === studentId) {
      return;
    }

    const [familyLink, parentLink] = await Promise.all([
      this.prisma.familyMember.findUnique({
        where: {
          ownerUserId_memberUserId: {
            ownerUserId: actor.id,
            memberUserId: studentId,
          },
        },
      }),
      this.prisma.parentChild.findUnique({
        where: {
          parentUserId_childUserId: {
            parentUserId: actor.id,
            childUserId: studentId,
          },
        },
      }),
    ]);

    if (!familyLink && !parentLink) {
      throw new ForbiddenException("Not allowed to view these invoices");
    }
  }

  private resolveTrainerScope(actor: DecryptedUser, trainerId: string): string {
    const isStaff =
      actor.role === UserRole.OWNER || actor.role === UserRole.STAFF;

    if (actor.role === UserRole.TRAINER) {
      if (trainerId !== actor.id) {
        throw new ForbiddenException(
          "Trainers can only view their own payment analytics",
        );
      }
      return actor.id;
    }

    if (!isStaff) {
      throw new ForbiddenException(
        "Only trainers and studio admins can view payment analytics",
      );
    }

    return trainerId;
  }

  private emptyAnalytics(
    trainer: User,
    studioId: string,
    from: Date | null,
    to: Date | null,
    studentCount: number,
  ): TrainerPaymentAnalytics {
    return {
      trainerId: trainer.id,
      trainerName: this.crypto.decryptUser(trainer).name,
      studioId,
      from: from?.toISOString() ?? null,
      to: to?.toISOString() ?? null,
      studentCount,
      invoiceCount: 0,
      totals: {
        collected: 0,
        pending: 0,
        overdue: 0,
        platformFees: 0,
        netCollected: 0,
      },
      byStatus: {
        PAID: { count: 0, amount: 0 },
        PENDING: { count: 0, amount: 0 },
        OVERDUE: { count: 0, amount: 0 },
      },
      byPaymentMethod: {
        CASH: { count: 0, amount: 0 },
        UPI_MANUAL: { count: 0, amount: 0 },
        RAZORPAY: { count: 0, amount: 0 },
      },
      byBatch: [],
      invoices: [],
    };
  }
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}
