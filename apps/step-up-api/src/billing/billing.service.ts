import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import {
  InvoiceStatus,
  NotificationType,
  PaymentMethod,
  Prisma,
  type User,
  UserRole,
} from "@prisma/client";
import { ACTIVE_ENROLLMENT_WHERE } from "../batches/enrollment-status";
import { EmailService } from "../email/email.service";
import {
  computePlatformFee,
  invoiceDueDate,
} from "../memberships/membership-helpers";
import { MembershipsService } from "../memberships/memberships.service";
import { NotificationsService } from "../notifications/notifications.service";
import { RazorpayService } from "../payments/razorpay.service";
import { PrismaService } from "../prisma/prisma.service";
import {
  type DecryptedUser,
  UserCryptoService,
} from "../users/user-crypto.service";
import { UserPresenter } from "../users/user-presenter";
import {
  allocateFamilyDiscount,
  attributionTargetsForInvoice,
  batchIdsForInvoiceDisplay,
  batchLabelForInvoice,
  type InvoiceCombineMeta,
  parseCombineMeta,
  parsePurchaseMeta,
} from "./family-combine";

export type AnalyticsBucket = "day" | "week" | "month";

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
    refunded: number;
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
    refunded: number;
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
  series: Array<{
    start: string;
    end: string;
    collected: number;
    netCollected: number;
    invoiceCount: number;
  }>;
  comparison: {
    previousFrom: string | null;
    previousTo: string | null;
    collected: number;
    netCollected: number;
    netCollectedDelta: number;
    netCollectedDeltaPct: number | null;
    collectedDeltaPct: number | null;
  };
  pendingPayments: Array<{
    invoiceId: string;
    studentId: string;
    studentName: string;
    amount: number;
    status: "PENDING" | "OVERDUE";
    dueDate: string | null;
    batchId: string | null;
    batchName: string | null;
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

function amountToPaise(amount: Prisma.Decimal | number | string) {
  const rupees = Number(amount);
  if (!Number.isFinite(rupees) || rupees <= 0) {
    return 0;
  }
  return Math.round(rupees * 100);
}

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(UserCryptoService) private readonly crypto: UserCryptoService,
    @Inject(UserPresenter) private readonly users: UserPresenter,
    @Inject(MembershipsService)
    private readonly memberships: MembershipsService,
    @Inject(RazorpayService) private readonly razorpay: RazorpayService,
    @Inject(NotificationsService)
    private readonly notifications: NotificationsService,
    @Inject(EmailService) private readonly email: EmailService,
  ) {}

  async convertToQuarterly(actor: DecryptedUser, invoiceId: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: { id: true, studentId: true, studioId: true },
    });
    if (!invoice) {
      throw new NotFoundException("Invoice not found");
    }
    await this.assertCanAccessStudentInvoices(actor, invoice.studentId);
    if (
      actor.role !== UserRole.OWNER &&
      actor.role !== UserRole.STAFF &&
      actor.role !== UserRole.STUDENT &&
      actor.role !== UserRole.PARENT
    ) {
      throw new ForbiddenException("Cannot convert this invoice");
    }
    return this.memberships.convertUpcomingInvoiceToQuarterly(invoiceId);
  }

  async listByStudio(studioId: string) {
    const invoices = await this.prisma.invoice.findMany({
      where: { studioId },
      include: {
        student: true,
        membership: { include: { subscription: true } },
      },
      orderBy: { id: "desc" },
    });

    const purchaseSubIds = new Set<string>();
    const studentIds = new Set<string>();
    for (const invoice of invoices) {
      studentIds.add(invoice.studentId);
      const combineMeta = parseCombineMeta(invoice.combineMeta);
      for (const source of combineMeta?.sources ?? []) {
        studentIds.add(source.studentId);
      }
      if (invoice.membership?.subscription) continue;
      const meta = parsePurchaseMeta(invoice.purchaseMeta);
      if (meta) purchaseSubIds.add(meta.subscriptionId);
    }

    const [purchaseSubs, enrollments] = await Promise.all([
      purchaseSubIds.size > 0
        ? this.prisma.subscription.findMany({
            where: { id: { in: [...purchaseSubIds] } },
            select: { id: true, kind: true, name: true },
          })
        : Promise.resolve(
            [] as Array<{ id: string; kind: string; name: string }>,
          ),
      studentIds.size > 0
        ? this.prisma.batchEnrollment.findMany({
            where: {
              studentId: { in: [...studentIds] },
              batch: { studioId },
              ...ACTIVE_ENROLLMENT_WHERE,
            },
            select: { studentId: true, batchId: true },
          })
        : Promise.resolve([] as Array<{ studentId: string; batchId: string }>),
    ]);
    const purchaseSubById = new Map(purchaseSubs.map((s) => [s.id, s]));
    const studentBatchMap = new Map<string, Set<string>>();
    for (const enrollment of enrollments) {
      const batchIds = studentBatchMap.get(enrollment.studentId) ?? new Set();
      batchIds.add(enrollment.batchId);
      studentBatchMap.set(enrollment.studentId, batchIds);
    }

    const batchIdsToResolve = new Set<string>();
    for (const invoice of invoices) {
      const purchaseMeta = parsePurchaseMeta(invoice.purchaseMeta);
      const combineMeta = parseCombineMeta(invoice.combineMeta);
      for (const batchId of batchIdsForInvoiceDisplay({
        studentId: invoice.studentId,
        purchaseMeta,
        combineMeta,
        studentBatchMap,
      })) {
        batchIdsToResolve.add(batchId);
      }
    }

    const batches =
      batchIdsToResolve.size > 0
        ? await this.prisma.batch.findMany({
            where: { id: { in: [...batchIdsToResolve] }, studioId },
            select: { id: true, name: true },
          })
        : [];
    const batchNameById = new Map(
      batches.map((batch) => [batch.id, batch.name] as const),
    );

    const presentedStudents = await this.users.presentLiteMany(
      invoices.map((invoice) => invoice.student),
      { email: true, phone: true },
    );

    return invoices.map((invoice, index) => {
      const purchaseMeta = parsePurchaseMeta(invoice.purchaseMeta);
      const combineMeta = parseCombineMeta(invoice.combineMeta);
      const membershipKind = invoice.membership?.subscription?.kind;
      const purchaseSub = purchaseMeta
        ? purchaseSubById.get(purchaseMeta.subscriptionId)
        : undefined;
      const kind = combineMeta
        ? ("COMBINED" as const)
        : membershipKind === "FAMILY" || purchaseSub?.kind === "FAMILY"
          ? ("FAMILY" as const)
          : ("INDIVIDUAL" as const);

      const adultCount =
        purchaseMeta?.coveredStudents.filter((s) => s.seatRole === "ADULT")
          .length ??
        invoice.membership?.subscription?.adultSeats ??
        null;
      const kidCount =
        purchaseMeta?.coveredStudents.filter((s) => s.seatRole === "KID")
          .length ??
        invoice.membership?.subscription?.kidSeats ??
        null;
      const planName =
        invoice.membership?.subscription?.name ?? purchaseSub?.name ?? null;
      const { batchId, batchName } = batchLabelForInvoice({
        studentId: invoice.studentId,
        purchaseMeta,
        combineMeta,
        studentBatchMap,
        batchNameById,
      });

      return {
        ...invoice,
        amount: Number(invoice.amount),
        referralDiscount: Number(invoice.referralDiscount ?? 0),
        studioDiscount: Number(invoice.studioDiscount ?? 0),
        familyDiscount: Number(invoice.familyDiscount ?? 0),
        refundedAmount: Number(invoice.refundedAmount ?? 0),
        student: presentedStudents[index],
        kind,
        purchaseMeta,
        combineMeta,
        batchId,
        batchName,
        familySummary:
          kind === "FAMILY"
            ? {
                planName,
                adultCount,
                kidCount,
                coveredStudents: purchaseMeta?.coveredStudents ?? null,
              }
            : combineMeta
              ? {
                  planName: "Combined family payment",
                  adultCount: null,
                  kidCount: null,
                  coveredStudents: combineMeta.sources.map((source) => ({
                    studentId: source.studentId,
                    seatRole: "ADULT" as const,
                    batchId: source.batchId ?? undefined,
                  })),
                }
              : null,
      };
    });
  }

  async listForStudent(actor: DecryptedUser, studentId: string) {
    await this.assertCanAccessStudentInvoices(actor, studentId);
    const invoices = await this.prisma.invoice.findMany({
      where: { studentId },
      include: {
        membership: { select: { periodStart: true, periodEnd: true } },
      },
      orderBy: { id: "desc" },
    });

    const studioId = actor.studioId;
    const enrollments = studioId
      ? await this.prisma.batchEnrollment.findMany({
          where: {
            studentId,
            batch: { studioId },
            ...ACTIVE_ENROLLMENT_WHERE,
          },
          select: { studentId: true, batchId: true },
        })
      : [];
    const studentBatchMap = new Map<string, Set<string>>([
      [studentId, new Set(enrollments.map((row) => row.batchId))],
    ]);

    const batchIdsToResolve = new Set<string>();
    for (const invoice of invoices) {
      const purchaseMeta = parsePurchaseMeta(invoice.purchaseMeta);
      const combineMeta = parseCombineMeta(invoice.combineMeta);
      for (const batchId of batchIdsForInvoiceDisplay({
        studentId: invoice.studentId,
        purchaseMeta,
        combineMeta,
        studentBatchMap,
      })) {
        batchIdsToResolve.add(batchId);
      }
    }

    const batches =
      batchIdsToResolve.size > 0
        ? await this.prisma.batch.findMany({
            where: {
              id: { in: [...batchIdsToResolve] },
              ...(studioId ? { studioId } : {}),
            },
            select: { id: true, name: true },
          })
        : [];
    const batchNameById = new Map(
      batches.map((batch) => [batch.id, batch.name] as const),
    );

    return invoices.map((invoice) => {
      const purchaseMeta = parsePurchaseMeta(invoice.purchaseMeta);
      const combineMeta = parseCombineMeta(invoice.combineMeta);
      const { batchId, batchName } = batchLabelForInvoice({
        studentId: invoice.studentId,
        purchaseMeta,
        combineMeta,
        studentBatchMap,
        batchNameById,
      });
      return {
        ...invoice,
        amount: Number(invoice.amount),
        dueDate:
          invoiceDueDate({
            chargeType: invoice.chargeType,
            periodStart: invoice.membership?.periodStart,
            periodEnd: invoice.membership?.periodEnd,
          })?.toISOString() ?? null,
        batchId,
        batchName,
        purchaseMeta,
        combineMeta,
      };
    });
  }

  async getTrainerAnalytics(
    actor: DecryptedUser,
    trainerId: string,
    studioId: string,
    options: {
      from?: string;
      to?: string;
      bucket?: AnalyticsBucket;
    } = {},
  ): Promise<TrainerPaymentAnalytics> {
    const resolvedTrainerId = this.resolveTrainerScope(actor, trainerId);

    if (actor.studioId !== studioId) {
      throw new ForbiddenException("Cannot view analytics for another studio");
    }

    const from = options.from ? new Date(options.from) : null;
    const to = options.to ? new Date(options.to) : null;
    const bucket: AnalyticsBucket = options.bucket ?? inferBucket(from, to);

    if (from && Number.isNaN(from.getTime())) {
      throw new BadRequestException("Invalid from date");
    }
    if (to && Number.isNaN(to.getTime())) {
      throw new BadRequestException("Invalid to date");
    }
    if (options.bucket && !isAnalyticsBucket(options.bucket)) {
      throw new BadRequestException("Invalid bucket");
    }

    const allTrainers = resolvedTrainerId === "all";
    let scopeTrainerId = resolvedTrainerId;
    let scopeTrainerName = "All trainers";
    let batches: Array<{
      id: string;
      name: string;
      enrollments: Array<{ studentId: string }>;
    }>;

    if (allTrainers) {
      batches = await this.prisma.batch.findMany({
        where: { studioId },
        select: {
          id: true,
          name: true,
          enrollments: { select: { studentId: true } },
        },
      });
    } else {
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

      scopeTrainerId = trainer.id;
      scopeTrainerName = this.crypto.decryptUser(trainer).name;

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

      batches = batchLinks.map((link) => link.batch);
    }

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
      refunded: 0,
    }));

    if (studentIds.length === 0) {
      return {
        ...this.emptyAnalytics(
          { id: scopeTrainerId, name: scopeTrainerName },
          studioId,
          from,
          to,
          0,
        ),
        byBatch: emptyBatchRows,
      };
    }

    const invoices = await this.prisma.invoice.findMany({
      where: {
        studioId,
        OR: [
          { studentId: { in: studentIds } },
          { combineMeta: { not: Prisma.DbNull } },
        ],
      },
      include: { student: true, membership: true },
      orderBy: [{ paidAt: "desc" }, { id: "desc" }],
    });

    const batchNameById = new Map(
      batches.map((batch) => [batch.id, batch.name] as const),
    );

    const filtered = invoices.filter((invoice) => {
      if (!from && !to) {
        return true;
      }
      if (
        invoice.status === InvoiceStatus.PENDING ||
        invoice.status === InvoiceStatus.OVERDUE
      ) {
        return true;
      }
      const activityAt =
        invoice.status === InvoiceStatus.REFUNDED
          ? (invoice.refundedAt ?? invoice.paidAt)
          : invoice.paidAt;
      if (!activityAt) {
        return false;
      }
      if (from && activityAt < from) {
        return false;
      }
      if (to && activityAt > to) {
        return false;
      }
      return true;
    });

    const byStatus: TrainerPaymentAnalytics["byStatus"] = {
      [InvoiceStatus.PAID]: { count: 0, amount: 0 },
      [InvoiceStatus.PENDING]: { count: 0, amount: 0 },
      [InvoiceStatus.OVERDUE]: { count: 0, amount: 0 },
      [InvoiceStatus.REFUNDED]: { count: 0, amount: 0 },
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
        refunded: number;
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
        refunded: 0,
      });
    }

    let collected = 0;
    let pending = 0;
    let overdue = 0;
    let refunded = 0;
    let platformFees = 0;

    const mappedRows = filtered.map((invoice) => {
      const amount = Number(invoice.amount);
      const refundedAmount = Number(invoice.refundedAmount ?? 0);
      const retained = roundMoney(Math.max(0, amount - refundedAmount));
      const platformFee = computePlatformFee(
        retained > 0 ? retained : amount,
        invoice.platformFeePercent,
      );
      const student = this.crypto.decryptUser(invoice.student);
      const combineMeta = parseCombineMeta(invoice.combineMeta);
      const purchaseMeta = parsePurchaseMeta(invoice.purchaseMeta);
      const attribution = attributionTargetsForInvoice({
        studentId: invoice.studentId,
        combineMeta,
        purchaseMeta,
        studentBatchMap,
        amount,
        status: invoice.status,
      }).filter((target) => batchTotals.has(target.batchId));

      if (attribution.length === 0 && !studentIds.includes(invoice.studentId)) {
        return null;
      }

      const batchIds = [
        ...new Set(attribution.map((target) => target.batchId)),
      ];

      byStatus[invoice.status].count += 1;
      byStatus[invoice.status].amount +=
        invoice.status === InvoiceStatus.REFUNDED ? refundedAmount : amount;

      if (refundedAmount > 0) {
        refunded += refundedAmount;
      }

      if (invoice.status === InvoiceStatus.PAID) {
        collected += retained;
        platformFees += computePlatformFee(
          retained,
          invoice.platformFeePercent,
        );
        if (invoice.paymentMethod) {
          byPaymentMethod[invoice.paymentMethod].count += 1;
          byPaymentMethod[invoice.paymentMethod].amount += retained;
        }
      } else if (invoice.status === InvoiceStatus.PENDING) {
        pending += amount;
      } else if (invoice.status === InvoiceStatus.OVERDUE) {
        overdue += amount;
      }

      const creditScale =
        invoice.status === InvoiceStatus.PAID && amount > 0
          ? retained / amount
          : 1;

      for (const target of attribution) {
        const entry = batchTotals.get(target.batchId);
        if (!entry) {
          continue;
        }
        const credited = roundMoney(target.amount * creditScale);
        if (!entry.invoiceIds.has(`${invoice.id}:${target.batchId}`)) {
          entry.invoiceIds.add(`${invoice.id}:${target.batchId}`);
          if (refundedAmount > 0 && !combineMeta) {
            entry.refunded += refundedAmount;
          }
          if (invoice.status === InvoiceStatus.PAID) {
            entry.collected += credited;
          } else if (invoice.status === InvoiceStatus.PENDING) {
            entry.pending += target.amount;
          } else if (invoice.status === InvoiceStatus.OVERDUE) {
            entry.overdue += target.amount;
          }
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
    });

    const invoiceRows: TrainerPaymentAnalytics["invoices"] = mappedRows.filter(
      (row): row is NonNullable<(typeof mappedRows)[number]> => row != null,
    );

    const netCollected = roundMoney(collected - platformFees);
    const series = buildAnalyticsSeries({
      invoices: invoices.filter(
        (invoice) =>
          invoice.status === InvoiceStatus.PAID && invoice.paidAt != null,
      ),
      from,
      to,
      bucket,
    });
    const comparison = buildAnalyticsComparison({
      invoices,
      from,
      to,
      currentCollected: roundMoney(collected),
      currentNetCollected: netCollected,
    });
    const pendingPayments = buildPendingPayments({
      invoices: invoices.filter(
        (invoice) =>
          invoice.status === InvoiceStatus.PENDING ||
          invoice.status === InvoiceStatus.OVERDUE,
      ),
      studentBatchMap,
      batchNameById,
      decryptUser: (user) => this.crypto.decryptUser(user),
    });

    return {
      trainerId: scopeTrainerId,
      trainerName: scopeTrainerName,
      studioId,
      from: from?.toISOString() ?? null,
      to: to?.toISOString() ?? null,
      studentCount: studentIds.length,
      invoiceCount: filtered.length,
      totals: {
        collected: roundMoney(collected),
        pending: roundMoney(pending),
        overdue: roundMoney(overdue),
        refunded: roundMoney(refunded),
        platformFees: roundMoney(platformFees),
        netCollected,
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
        REFUNDED: {
          count: byStatus.REFUNDED.count,
          amount: roundMoney(byStatus.REFUNDED.amount),
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
        refunded: roundMoney(batch.refunded),
      })),
      invoices: invoiceRows,
      series,
      comparison,
      pendingPayments,
    };
  }

  async markPaid(
    actor: DecryptedUser,
    id: string,
    input: {
      paymentMethod: PaymentMethod;
      referralDiscount?: number;
      studioDiscount?: number;
    },
  ) {
    if (actor.role !== UserRole.OWNER && actor.role !== UserRole.STAFF) {
      throw new ForbiddenException("Only studio admins can mark invoices paid");
    }

    const invoice = await this.prisma.invoice.findUniqueOrThrow({
      where: { id },
      include: {
        student: true,
        studio: { select: { id: true, name: true } },
      },
    });

    if (actor.studioId !== invoice.studioId) {
      throw new ForbiddenException("Cannot mark invoices for another studio");
    }

    if (invoice.status === InvoiceStatus.PAID) {
      throw new BadRequestException("Invoice is already paid");
    }

    const subtotal = Number(invoice.amount);
    const familyDiscount = Number(invoice.familyDiscount ?? 0);
    const referralDiscount = roundMoney(input.referralDiscount ?? 0);
    const studioDiscount = roundMoney(input.studioDiscount ?? 0);

    if (referralDiscount < 0 || studioDiscount < 0) {
      throw new BadRequestException("Discounts cannot be negative");
    }

    const totalDiscount = roundMoney(referralDiscount + studioDiscount);
    if (totalDiscount > subtotal) {
      throw new BadRequestException(
        "Discounts cannot exceed the invoice amount",
      );
    }

    const amountPaid = roundMoney(subtotal - totalDiscount);
    const platformFee = computePlatformFee(
      amountPaid,
      invoice.platformFeePercent,
    );
    const purchaseMeta = parsePurchaseMeta(invoice.purchaseMeta);
    const combineMeta = parseCombineMeta(invoice.combineMeta);

    let membershipId = invoice.membershipId;
    if (!membershipId && purchaseMeta) {
      const membership = await this.memberships.assign({
        subscriptionId: purchaseMeta.subscriptionId,
        purchaserUserId: purchaseMeta.purchaserUserId,
        coveredStudents: purchaseMeta.coveredStudents,
      });
      membershipId = membership.id;
    }

    if (combineMeta) {
      for (const source of combineMeta.sources) {
        if (source.purchaseMeta) {
          await this.memberships.assign({
            subscriptionId: source.purchaseMeta.subscriptionId,
            purchaserUserId: source.purchaseMeta.purchaserUserId,
            coveredStudents: source.purchaseMeta.coveredStudents,
          });
        } else if (source.membershipId) {
          await this.memberships.renewFromPaidInvoice(source.membershipId);
        }
      }
    }

    const paidAt = new Date();
    const result = await this.prisma.invoice.update({
      where: { id },
      data: {
        status: InvoiceStatus.PAID,
        paymentMethod: input.paymentMethod,
        paidAt,
        amount: amountPaid,
        referralDiscount,
        studioDiscount,
        ...(membershipId ? { membershipId } : {}),
      },
    });

    if (invoice.membershipId) {
      await this.memberships.renewFromPaidInvoice(invoice.membershipId);
    }

    const student = this.crypto.decryptUser(invoice.student);
    const amountLabel = formatInr(amountPaid);
    const printSubtotal = roundMoney(
      amountPaid + referralDiscount + studioDiscount + familyDiscount,
    );

    await this.notifications.create({
      userId: invoice.studentId,
      type: NotificationType.PAYMENT_RECEIVED,
      title: "Payment received",
      body: `Your payment of ${amountLabel} was recorded.`,
      dedupeKey: `PAYMENT_RECEIVED:${invoice.id}`,
      meta: {
        invoiceId: invoice.id,
        amount: amountPaid,
        referralDiscount,
        studioDiscount,
        familyDiscount,
      },
      entityType: "invoice",
      entityId: invoice.id,
    });

    if (student.email) {
      try {
        await this.email.sendPaymentInvoice({
          to: student.email,
          studentName: student.name || "there",
          studioName: invoice.studio.name,
          invoiceId: invoice.id,
          subtotal: printSubtotal,
          referralDiscount,
          studioDiscount,
          familyDiscount,
          amountPaid,
          paymentMethod: input.paymentMethod,
          paidAt,
        });
      } catch (error) {
        this.logger.error(
          `Failed to email payment invoice ${invoice.id}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }

    return {
      ...result,
      amount: Number(result.amount),
      referralDiscount: Number(result.referralDiscount),
      studioDiscount: Number(result.studioDiscount),
      familyDiscount: Number(result.familyDiscount ?? 0),
      subtotal: printSubtotal,
      platformFeeComputed: platformFee,
      student: { id: student.id, name: student.name, email: student.email },
      studio: invoice.studio,
    };
  }

  async familyCombine(
    actor: DecryptedUser,
    data: {
      studioId: string;
      purchaserUserId: string;
      invoiceIds: string[];
      familyDiscount: number;
    },
  ) {
    if (actor.role !== UserRole.OWNER && actor.role !== UserRole.STAFF) {
      throw new ForbiddenException(
        "Only studio admins can combine family invoices",
      );
    }
    if (actor.studioId !== data.studioId) {
      throw new ForbiddenException(
        "Cannot combine invoices for another studio",
      );
    }
    if (data.invoiceIds.length < 2) {
      throw new BadRequestException("Select at least two invoices to combine");
    }

    const uniqueIds = [...new Set(data.invoiceIds)];
    if (uniqueIds.length !== data.invoiceIds.length) {
      throw new BadRequestException("Duplicate invoices in combine request");
    }

    const familyDiscount = roundMoney(data.familyDiscount);
    if (familyDiscount < 0) {
      throw new BadRequestException("Family discount cannot be negative");
    }

    const sources = await this.prisma.invoice.findMany({
      where: { id: { in: uniqueIds }, studioId: data.studioId },
      include: {
        membership: { include: { subscription: true } },
      },
    });

    if (sources.length !== uniqueIds.length) {
      throw new NotFoundException("One or more invoices were not found");
    }

    for (const invoice of sources) {
      if (
        invoice.status !== InvoiceStatus.PENDING &&
        invoice.status !== InvoiceStatus.OVERDUE
      ) {
        throw new BadRequestException("Only unpaid invoices can be combined");
      }
      if (parseCombineMeta(invoice.combineMeta)) {
        throw new BadRequestException(
          "Already combined invoices cannot be combined again",
        );
      }
      const linked =
        invoice.studentId === data.purchaserUserId ||
        (await this.isFamilyLinked(data.purchaserUserId, invoice.studentId));
      if (!linked) {
        throw new BadRequestException(
          "All invoices must belong to this family",
        );
      }
    }

    const amounts = sources.map((invoice) => Number(invoice.amount));
    const subtotal = roundMoney(
      amounts.reduce((sum, amount) => sum + amount, 0),
    );
    if (familyDiscount > subtotal) {
      throw new BadRequestException(
        "Family discount cannot exceed invoice total",
      );
    }

    let allocated: number[];
    try {
      allocated = allocateFamilyDiscount(amounts, familyDiscount);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : "Invalid family discount",
      );
    }

    const studentIds = [
      ...new Set(sources.map((invoice) => invoice.studentId)),
    ];
    const enrollments = await this.prisma.batchEnrollment.findMany({
      where: {
        studentId: { in: studentIds },
        ...ACTIVE_ENROLLMENT_WHERE,
        batch: { studioId: data.studioId },
      },
      select: { studentId: true, batchId: true },
      orderBy: { enrolledAt: "asc" },
    });
    const firstEnrollmentByStudent = new Map<string, string>();
    for (const enrollment of enrollments) {
      if (!firstEnrollmentByStudent.has(enrollment.studentId)) {
        firstEnrollmentByStudent.set(enrollment.studentId, enrollment.batchId);
      }
    }

    const combineMeta: InvoiceCombineMeta = {
      sources: sources.map((invoice, index) => {
        const purchaseMeta = parsePurchaseMeta(invoice.purchaseMeta);
        const batchId =
          purchaseMeta?.batchId ??
          firstEnrollmentByStudent.get(invoice.studentId) ??
          null;
        const originalAmount = amounts[index]!;
        const allocatedDiscount = allocated[index]!;
        return {
          invoiceId: invoice.id,
          studentId: invoice.studentId,
          batchId,
          originalAmount,
          allocatedDiscount,
          netAmount: roundMoney(originalAmount - allocatedDiscount),
          membershipId: invoice.membershipId,
          ...(purchaseMeta ? { purchaseMeta } : {}),
        };
      }),
    };

    const netAmount = roundMoney(subtotal - familyDiscount);
    const settings = await this.prisma.studioSettings.findUnique({
      where: { studioId: data.studioId },
      select: { platformFeePercent: true },
    });

    const created = await this.prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.create({
        data: {
          studentId: data.purchaserUserId,
          studioId: data.studioId,
          amount: netAmount,
          familyDiscount,
          status: InvoiceStatus.PENDING,
          platformFeePercent: settings?.platformFeePercent ?? 5,
          combineMeta,
        },
      });
      await tx.invoice.deleteMany({
        where: { id: { in: uniqueIds }, studioId: data.studioId },
      });
      return invoice;
    });

    return {
      ...created,
      amount: Number(created.amount),
      familyDiscount: Number(created.familyDiscount),
      referralDiscount: Number(created.referralDiscount ?? 0),
      studioDiscount: Number(created.studioDiscount ?? 0),
      kind: "COMBINED" as const,
      combineMeta,
      student: undefined,
    };
  }

  private async isFamilyLinked(ownerUserId: string, memberUserId: string) {
    const [family, parent] = await Promise.all([
      this.prisma.familyMember.findUnique({
        where: {
          ownerUserId_memberUserId: { ownerUserId, memberUserId },
        },
      }),
      this.prisma.parentChild.findUnique({
        where: {
          parentUserId_childUserId: {
            parentUserId: ownerUserId,
            childUserId: memberUserId,
          },
        },
      }),
    ]);
    return Boolean(family || parent);
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

  async refundInvoice(
    id: string,
    options: { amount?: number; reason?: string } = {},
  ) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        studio: {
          select: {
            id: true,
            settings: {
              select: {
                razorpayKeyId: true,
                razorpayKeySecret: true,
                razorpaySecretIv: true,
              },
            },
          },
        },
        membership: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException("Invoice not found");
    }

    if (invoice.status === InvoiceStatus.REFUNDED) {
      throw new BadRequestException("Invoice has already been fully refunded");
    }

    if (invoice.status !== InvoiceStatus.PAID) {
      throw new BadRequestException("Only paid invoices can be refunded");
    }

    const invoiceAmount = roundMoney(Number(invoice.amount));
    const alreadyRefunded = roundMoney(Number(invoice.refundedAmount ?? 0));
    const refundable = roundMoney(invoiceAmount - alreadyRefunded);

    if (refundable <= 0) {
      throw new BadRequestException("Invoice has already been fully refunded");
    }

    const requestedAmount =
      options.amount === undefined
        ? refundable
        : roundMoney(Number(options.amount));

    if (!Number.isFinite(requestedAmount) || requestedAmount <= 0) {
      throw new BadRequestException("Refund amount must be greater than 0");
    }

    if (requestedAmount > refundable) {
      throw new BadRequestException(
        `Refund amount cannot exceed ${formatInr(refundable)} remaining`,
      );
    }

    if (
      invoice.paymentMethod === PaymentMethod.RAZORPAY &&
      invoice.razorpayPaymentId
    ) {
      const amountPaise = Math.round(requestedAmount * 100);
      if (amountPaise < 100) {
        throw new BadRequestException(
          "Razorpay refunds require at least ₹1.00",
        );
      }
      await this.razorpay.createRefund(
        {
          paymentId: invoice.razorpayPaymentId,
          amountPaise,
          notes: options.reason
            ? { reason: options.reason.slice(0, 512) }
            : undefined,
        },
        invoice.studio.settings,
      );
    }

    const nextRefundedAmount = roundMoney(alreadyRefunded + requestedAmount);
    const fullyRefunded = nextRefundedAmount >= invoiceAmount;
    const refundedAt = new Date();

    const updated = await this.prisma.$transaction(async (tx) => {
      const refunded = await tx.invoice.update({
        where: { id },
        data: {
          refundedAmount: nextRefundedAmount,
          refundedAt,
          ...(fullyRefunded ? { status: InvoiceStatus.REFUNDED } : {}),
        },
      });

      if (fullyRefunded && invoice.membershipId && invoice.membership) {
        const otherActiveSeats = await tx.membershipCoveredStudent.count({
          where: {
            membershipId: invoice.membershipId,
          },
        });
        if (otherActiveSeats <= 1 && invoice.membership.status === "ACTIVE") {
          await tx.membership.update({
            where: { id: invoice.membershipId },
            data: { status: "EXPIRED" },
          });
        }
      }

      return refunded;
    });

    return {
      ...updated,
      amount: Number(updated.amount),
      referralDiscount: Number(updated.referralDiscount ?? 0),
      studioDiscount: Number(updated.studioDiscount ?? 0),
      refundedAmount: Number(updated.refundedAmount ?? 0),
      thisRefundAmount: requestedAmount,
    };
  }

  async refundInvoiceForStudio(
    actor: DecryptedUser,
    id: string,
    options: { amount?: number; reason?: string } = {},
  ) {
    if (actor.role !== UserRole.OWNER && actor.role !== UserRole.STAFF) {
      throw new ForbiddenException("Only studio admins can refund invoices");
    }

    const invoice = await this.prisma.invoice.findUnique({ where: { id } });
    if (!invoice) {
      throw new NotFoundException("Invoice not found");
    }
    if (actor.studioId !== invoice.studioId) {
      throw new ForbiddenException("Cannot refund invoices for another studio");
    }

    return this.refundInvoice(id, options);
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

  async assertCanAccessStudentInvoices(
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
    trainer: { id: string; name: string },
    studioId: string,
    from: Date | null,
    to: Date | null,
    studentCount: number,
  ): TrainerPaymentAnalytics {
    return {
      trainerId: trainer.id,
      trainerName: trainer.name,
      studioId,
      from: from?.toISOString() ?? null,
      to: to?.toISOString() ?? null,
      studentCount,
      invoiceCount: 0,
      totals: {
        collected: 0,
        pending: 0,
        overdue: 0,
        refunded: 0,
        platformFees: 0,
        netCollected: 0,
      },
      byStatus: {
        PAID: { count: 0, amount: 0 },
        PENDING: { count: 0, amount: 0 },
        OVERDUE: { count: 0, amount: 0 },
        REFUNDED: { count: 0, amount: 0 },
      },
      byPaymentMethod: {
        CASH: { count: 0, amount: 0 },
        UPI_MANUAL: { count: 0, amount: 0 },
        RAZORPAY: { count: 0, amount: 0 },
      },
      byBatch: [],
      invoices: [],
      series: [],
      comparison: {
        previousFrom: null,
        previousTo: null,
        collected: 0,
        netCollected: 0,
        netCollectedDelta: 0,
        netCollectedDeltaPct: null,
        collectedDeltaPct: null,
      },
      pendingPayments: [],
    };
  }
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function formatInr(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
}

function isAnalyticsBucket(value: string): value is AnalyticsBucket {
  return value === "day" || value === "week" || value === "month";
}

function inferBucket(from: Date | null, to: Date | null): AnalyticsBucket {
  if (!from || !to) {
    return "month";
  }
  const days = (to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000);
  if (days <= 45) {
    return "day";
  }
  if (days <= 120) {
    return "week";
  }
  return "month";
}

function startOfBucket(date: Date, bucket: AnalyticsBucket): Date {
  if (bucket === "day") {
    return new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
    );
  }
  if (bucket === "week") {
    const day = date.getUTCDay();
    const diff = (day + 6) % 7;
    return new Date(
      Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate() - diff,
      ),
    );
  }
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function endOfBucket(start: Date, bucket: AnalyticsBucket): Date {
  if (bucket === "day") {
    return new Date(
      Date.UTC(
        start.getUTCFullYear(),
        start.getUTCMonth(),
        start.getUTCDate(),
        23,
        59,
        59,
        999,
      ),
    );
  }
  if (bucket === "week") {
    return new Date(
      Date.UTC(
        start.getUTCFullYear(),
        start.getUTCMonth(),
        start.getUTCDate() + 6,
        23,
        59,
        59,
        999,
      ),
    );
  }
  return new Date(
    Date.UTC(
      start.getUTCFullYear(),
      start.getUTCMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    ),
  );
}

function nextBucketStart(start: Date, bucket: AnalyticsBucket): Date {
  if (bucket === "day") {
    return new Date(
      Date.UTC(
        start.getUTCFullYear(),
        start.getUTCMonth(),
        start.getUTCDate() + 1,
      ),
    );
  }
  if (bucket === "week") {
    return new Date(
      Date.UTC(
        start.getUTCFullYear(),
        start.getUTCMonth(),
        start.getUTCDate() + 7,
      ),
    );
  }
  return new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
}

function buildAnalyticsSeries(input: {
  invoices: Array<{
    amount: unknown;
    platformFeePercent: number;
    paidAt: Date | null;
  }>;
  from: Date | null;
  to: Date | null;
  bucket: AnalyticsBucket;
}): TrainerPaymentAnalytics["series"] {
  const paid = input.invoices.filter(
    (
      invoice,
    ): invoice is {
      amount: unknown;
      platformFeePercent: number;
      paidAt: Date;
    } => invoice.paidAt != null,
  );

  if (paid.length === 0 && (!input.from || !input.to)) {
    return [];
  }

  let rangeStart = input.from;
  let rangeEnd = input.to;
  if (!rangeStart || !rangeEnd) {
    const times = paid.map((invoice) => invoice.paidAt.getTime());
    if (times.length === 0) {
      return [];
    }
    rangeStart = rangeStart ?? new Date(Math.min(...times));
    rangeEnd = rangeEnd ?? new Date(Math.max(...times));
  }

  const series: TrainerPaymentAnalytics["series"] = [];
  let cursor = startOfBucket(rangeStart, input.bucket);
  const last = startOfBucket(rangeEnd, input.bucket);

  while (cursor.getTime() <= last.getTime()) {
    const bucketEnd = endOfBucket(cursor, input.bucket);
    let collected = 0;
    let platformFees = 0;
    let invoiceCount = 0;

    for (const invoice of paid) {
      if (invoice.paidAt < cursor || invoice.paidAt > bucketEnd) {
        continue;
      }
      if (input.from && invoice.paidAt < input.from) {
        continue;
      }
      if (input.to && invoice.paidAt > input.to) {
        continue;
      }
      const amount = Number(invoice.amount);
      collected += amount;
      platformFees += computePlatformFee(amount, invoice.platformFeePercent);
      invoiceCount += 1;
    }

    series.push({
      start: cursor.toISOString(),
      end: bucketEnd.toISOString(),
      collected: roundMoney(collected),
      netCollected: roundMoney(collected - platformFees),
      invoiceCount,
    });
    cursor = nextBucketStart(cursor, input.bucket);
  }

  return series;
}

function buildAnalyticsComparison(input: {
  invoices: Array<{
    status: InvoiceStatus;
    amount: unknown;
    platformFeePercent: number;
    paidAt: Date | null;
  }>;
  from: Date | null;
  to: Date | null;
  currentCollected: number;
  currentNetCollected: number;
}): TrainerPaymentAnalytics["comparison"] {
  if (!input.from || !input.to) {
    return {
      previousFrom: null,
      previousTo: null,
      collected: 0,
      netCollected: 0,
      netCollectedDelta: input.currentNetCollected,
      netCollectedDeltaPct: null,
      collectedDeltaPct: null,
    };
  }

  const durationMs = input.to.getTime() - input.from.getTime();
  const previousTo = new Date(input.from.getTime() - 1);
  const previousFrom = new Date(previousTo.getTime() - durationMs);

  let collected = 0;
  let platformFees = 0;
  for (const invoice of input.invoices) {
    if (
      invoice.status !== InvoiceStatus.PAID ||
      !invoice.paidAt ||
      invoice.paidAt < previousFrom ||
      invoice.paidAt > previousTo
    ) {
      continue;
    }
    const amount = Number(invoice.amount);
    collected += amount;
    platformFees += computePlatformFee(amount, invoice.platformFeePercent);
  }

  const netCollected = roundMoney(collected - platformFees);
  const collectedRounded = roundMoney(collected);
  const netCollectedDelta = roundMoney(
    input.currentNetCollected - netCollected,
  );
  const collectedDelta = roundMoney(input.currentCollected - collectedRounded);

  return {
    previousFrom: previousFrom.toISOString(),
    previousTo: previousTo.toISOString(),
    collected: collectedRounded,
    netCollected,
    netCollectedDelta,
    netCollectedDeltaPct:
      netCollected === 0
        ? null
        : roundMoney((netCollectedDelta / netCollected) * 100),
    collectedDeltaPct:
      collectedRounded === 0
        ? null
        : roundMoney((collectedDelta / collectedRounded) * 100),
  };
}

function buildPendingPayments(input: {
  invoices: Array<{
    id: string;
    studentId: string;
    amount: unknown;
    status: InvoiceStatus;
    purchaseMeta: unknown;
    combineMeta?: unknown;
    student: User;
    membership: { periodStart: Date; periodEnd?: Date } | null;
    chargeType?: import("@prisma/client").InvoiceChargeType;
  }>;
  studentBatchMap: Map<string, Set<string>>;
  batchNameById: Map<string, string>;
  decryptUser: (user: User) => { name: string };
}): TrainerPaymentAnalytics["pendingPayments"] {
  const rows = input.invoices.map((invoice) => {
    const meta = parsePurchaseMeta(invoice.purchaseMeta);
    const combineMeta = parseCombineMeta(invoice.combineMeta);
    const enrolled = [...(input.studentBatchMap.get(invoice.studentId) ?? [])];
    const batchId =
      combineMeta?.sources.find((source) => source.batchId)?.batchId ??
      meta?.batchId ??
      enrolled[0] ??
      null;
    const batchName = batchId
      ? (input.batchNameById.get(batchId) ?? null)
      : null;

    return {
      invoiceId: invoice.id,
      studentId: invoice.studentId,
      studentName: input.decryptUser(invoice.student).name,
      amount: Number(invoice.amount),
      status: invoice.status as "PENDING" | "OVERDUE",
      dueDate:
        invoiceDueDate({
          chargeType: invoice.chargeType,
          periodStart: invoice.membership?.periodStart,
          periodEnd: invoice.membership?.periodEnd,
        })?.toISOString() ?? null,
      batchId,
      batchName,
    };
  });

  rows.sort((a, b) => {
    if (a.status !== b.status) {
      return a.status === "OVERDUE" ? -1 : 1;
    }
    const aDue = a.dueDate
      ? new Date(a.dueDate).getTime()
      : Number.POSITIVE_INFINITY;
    const bDue = b.dueDate
      ? new Date(b.dueDate).getTime()
      : Number.POSITIVE_INFINITY;
    if (aDue !== bDue) {
      return aDue - bDue;
    }
    return b.amount - a.amount;
  });

  return rows;
}
