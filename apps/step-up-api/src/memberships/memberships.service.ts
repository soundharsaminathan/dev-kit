import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  BatchCategory,
  BatchEnrollmentStatus,
  BillingCadence,
  IndividualAudience,
  InvoiceChargeType,
  InvoiceStatus,
  MembershipBillingPhase,
  MembershipSeatRole,
  MembershipStatus,
  NotificationType,
  Prisma,
  SessionStatus,
  SessionType,
  SubscriptionKind,
} from "@prisma/client";
import {
  countOccupiedSeats,
  lockBatchRow,
  paymentHoldExpiresAt,
} from "../batches/batch-capacity";
import { REACTIVATE_ENROLLMENT_DATA } from "../batches/enrollment-status";
import { parseCombineMeta, parsePurchaseMeta } from "../billing/family-combine";
import { ScheduleConflictService } from "../calendar/schedule-conflict.service";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import {
  buildAdmissionInvoiceData,
  readAdmissionFeeAmount,
} from "./admission-fee";
import {
  getNextPeriodStart,
  getPeriodEnd,
  invoiceFeePercents,
  isAfterUtcDay20,
  isMonthlyPlanUnpaid,
  isPrepaidAtJoin,
  membershipCoversBatch,
  prorateByRemaining,
  seatRoleForBatchCategory,
  utcMonthStart,
} from "./membership-helpers";

export type CoveredStudentInput = {
  studentId: string;
  seatRole: MembershipSeatRole;
  batchId?: string;
};

export type InvoicePurchaseMeta = {
  batchId?: string;
  subscriptionId: string;
  purchaserUserId: string;
  coveredStudents: CoveredStudentInput[];
  firstMonthConvertToQuarterly?: boolean;
};

export type BatchEnrollmentBilling = {
  kind: "prepaid" | "postpaid" | "switch";
  invoice: {
    id: string;
    amount: unknown;
    status: InvoiceStatus;
    [key: string]: unknown;
  } | null;
};

@Injectable()
export class MembershipsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(NotificationsService)
    private readonly notifications: NotificationsService,
    @Inject(ScheduleConflictService)
    private readonly scheduleConflicts: ScheduleConflictService,
  ) {}

  listForStudent(studentId: string) {
    return this.prisma.membership.findMany({
      where: {
        OR: [
          { purchaserUserId: studentId },
          { coveredStudents: { some: { studentId } } },
        ],
      },
      include: {
        subscription: true,
        coveredStudents: true,
      },
      orderBy: { periodStart: "desc" },
    });
  }

  async assign(args: {
    subscriptionId: string;
    purchaserUserId: string;
    coveredStudents: CoveredStudentInput[];
  }) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: args.subscriptionId },
    });

    if (!subscription?.active) {
      throw new NotFoundException("Subscription not found or inactive");
    }

    this.assertCoveredSeats(subscription, args.coveredStudents);

    const seatsWithBatch = args.coveredStudents.filter((c) => c.batchId);
    if (subscription.kind === SubscriptionKind.FAMILY) {
      await this.assertFamilyBatchPicks(args.coveredStudents);
    } else if (seatsWithBatch.length > 0) {
      await this.assertBatchPicks(seatsWithBatch);
    }

    for (const covered of seatsWithBatch) {
      await this.scheduleConflicts.assertStudentAvailableForBatch(
        covered.studentId,
        covered.batchId!,
      );
    }

    const now = new Date();
    const periodStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    );
    const periodEnd = getPeriodEnd(periodStart, subscription.billingCadence);

    return this.prisma.$transaction(async (tx) => {
      const membership = await tx.membership.create({
        data: {
          subscriptionId: subscription.id,
          purchaserUserId: args.purchaserUserId,
          periodStart,
          periodEnd,
          status: MembershipStatus.ACTIVE,
          billingPhase: MembershipBillingPhase.PREPAID,
          batchId: seatsWithBatch[0]?.batchId ?? null,
          coveredStudents: {
            create: args.coveredStudents.map((c) => ({
              studentId: c.studentId,
              seatRole: c.seatRole,
            })),
          },
        },
        include: {
          subscription: true,
          coveredStudents: true,
        },
      });

      for (const covered of seatsWithBatch) {
        const batchId = covered.batchId!;
        await tx.batchEnrollment.upsert({
          where: {
            batchId_studentId: {
              batchId,
              studentId: covered.studentId,
            },
          },
          update: REACTIVATE_ENROLLMENT_DATA,
          create: {
            batchId,
            studentId: covered.studentId,
            status: BatchEnrollmentStatus.ACTIVE,
          },
        });
      }

      return membership;
    });
  }

  async purchaseForBatch(args: {
    batchId: string;
    subscriptionId: string;
    purchaserUserId: string;
    coveredStudents: CoveredStudentInput[];
    /** When false, invoice stays pending until staff collects (no checkout timer). */
    paymentHold?: boolean;
    /** Reuse an already-loaded batch instead of re-fetching it. */
    batch?: Prisma.BatchGetPayload<Record<string, never>>;
    /** Skip per-student schedule checks; the caller already validated everyone at once. */
    skipScheduleConflicts?: boolean;
  }) {
    const [batch, planLink] = await Promise.all([
      args.batch ??
        this.prisma.batch.findUnique({ where: { id: args.batchId } }),
      this.prisma.batchPlan.findUnique({
        where: {
          batchId_subscriptionId: {
            batchId: args.batchId,
            subscriptionId: args.subscriptionId,
          },
        },
        include: { subscription: true },
      }),
    ]);

    if (!batch?.active) {
      throw new NotFoundException("Batch not found or inactive");
    }
    if (!planLink?.subscription.active) {
      throw new BadRequestException(
        "That plan is not available for this batch",
      );
    }

    if (planLink.subscription.kind === SubscriptionKind.FAMILY) {
      throw new BadRequestException(
        "Family packs are studio-wide. Use family purchase instead of batch purchase.",
      );
    }

    const expectedSeat = seatRoleForBatchCategory(batch.category);
    const coveredStudents = args.coveredStudents.map((seat) => {
      if (seat.seatRole === expectedSeat) {
        return { ...seat, batchId: args.batchId };
      }
      return seat;
    });

    if (
      coveredStudents.length !== 1 ||
      coveredStudents[0]?.seatRole !== expectedSeat
    ) {
      throw new BadRequestException(
        `This batch requires a ${expectedSeat} seat for Individual plans`,
      );
    }

    this.assertCoveredSeats(planLink.subscription, coveredStudents);

    const seatsWithBatch = coveredStudents.filter((c) => c.batchId);
    if (seatsWithBatch.length > 0) {
      await this.assertBatchPicks(seatsWithBatch);
    }

    if (!args.skipScheduleConflicts) {
      for (const covered of seatsWithBatch) {
        await this.scheduleConflicts.assertStudentAvailableForBatch(
          covered.studentId,
          covered.batchId!,
        );
      }
    }

    const settings = await this.prisma.studioSettings.findUnique({
      where: { studioId: batch.studioId },
      select: { platformFeePercent: true, gstPercent: true },
    });

    const purchaseMeta: InvoicePurchaseMeta = {
      batchId: args.batchId,
      subscriptionId: args.subscriptionId,
      purchaserUserId: args.purchaserUserId,
      coveredStudents,
    };

    const holdPayment = args.paymentHold !== false;

    return this.prisma.invoice.create({
      data: {
        studentId: args.purchaserUserId,
        studioId: batch.studioId,
        amount: planLink.subscription.price,
        status: InvoiceStatus.PENDING,
        chargeType: InvoiceChargeType.PREPAID_FULL,
        ...invoiceFeePercents(settings),
        ...(holdPayment
          ? { paymentHoldExpiresAt: paymentHoldExpiresAt() }
          : {}),
        purchaseMeta,
      },
    });
  }

  /**
   * Staff bulk enroll: validate the plan once, check schedule conflicts for
   * every student, then create one pending invoice each. Capacity is the
   * caller's responsibility (typically under a locked batch row).
   */
  async purchaseForBatchBulk(args: {
    batchId: string;
    subscriptionId: string;
    studentIds: string[];
    /** When false, invoices stay pending until staff collects (no checkout timer). */
    paymentHold?: boolean;
    tx?: Prisma.TransactionClient;
  }) {
    const uniqueIds = [...new Set(args.studentIds)];
    if (uniqueIds.length === 0) {
      throw new BadRequestException("At least one student is required");
    }
    if (uniqueIds.length !== args.studentIds.length) {
      throw new BadRequestException("Duplicate students are not allowed");
    }

    const [batch, planLink] = await Promise.all([
      this.prisma.batch.findUnique({ where: { id: args.batchId } }),
      this.prisma.batchPlan.findUnique({
        where: {
          batchId_subscriptionId: {
            batchId: args.batchId,
            subscriptionId: args.subscriptionId,
          },
        },
        include: { subscription: true },
      }),
    ]);

    if (!batch?.active) {
      throw new NotFoundException("Batch not found or inactive");
    }
    if (!planLink?.subscription.active) {
      throw new BadRequestException(
        "That plan is not available for this batch",
      );
    }

    if (planLink.subscription.kind === SubscriptionKind.FAMILY) {
      throw new BadRequestException(
        "Family packs are studio-wide. Use family purchase instead of batch purchase.",
      );
    }

    const expectedSeat = seatRoleForBatchCategory(batch.category);
    this.assertCoveredSeats(planLink.subscription, [
      {
        studentId: uniqueIds[0]!,
        seatRole: expectedSeat,
        batchId: args.batchId,
      },
    ]);

    await Promise.all(
      uniqueIds.map((studentId) =>
        this.scheduleConflicts.assertStudentAvailableForBatch(
          studentId,
          args.batchId,
        ),
      ),
    );

    const settings = await this.prisma.studioSettings.findUnique({
      where: { studioId: batch.studioId },
      select: { platformFeePercent: true, gstPercent: true },
    });

    const holdPayment = args.paymentHold !== false;
    const db = args.tx ?? this.prisma;
    const invoices = [];

    for (const studentId of uniqueIds) {
      const coveredStudents: CoveredStudentInput[] = [
        {
          studentId,
          seatRole: expectedSeat,
          batchId: args.batchId,
        },
      ];
      const purchaseMeta: InvoicePurchaseMeta = {
        batchId: args.batchId,
        subscriptionId: args.subscriptionId,
        purchaserUserId: studentId,
        coveredStudents,
      };

      const invoice = await db.invoice.create({
        data: {
          studentId,
          studioId: batch.studioId,
          amount: planLink.subscription.price,
          status: InvoiceStatus.PENDING,
          chargeType: InvoiceChargeType.PREPAID_FULL,
          ...invoiceFeePercents(settings),
          ...(holdPayment
            ? { paymentHoldExpiresAt: paymentHoldExpiresAt() }
            : {}),
          purchaseMeta,
        },
      });
      invoices.push(invoice);
    }

    return invoices;
  }

  async purchaseFamily(_args: {
    studioId: string;
    subscriptionId: string;
    purchaserUserId: string;
    coveredStudents: CoveredStudentInput[];
  }): Promise<never> {
    throw new BadRequestException(
      "Family pack purchase was removed. Combine unpaid household invoices from the Invoices family tab instead.",
    );
  }

  /**
   * One-time studio admission fee on a student's first enrollment. Skips when
   * the fee is 0, an ADMISSION invoice already exists, or the student was
   * enrolled in any batch at this studio before (including ended seats).
   */
  async ensureAdmissionFeeInvoice(args: {
    studioId: string;
    studentId: string;
    batchId?: string;
    enrolledAt?: Date;
    status?: InvoiceStatus;
  }) {
    const settings = await this.prisma.studioSettings.findUnique({
      where: { studioId: args.studioId },
      select: {
        admissionFee: true,
        platformFeePercent: true,
        gstPercent: true,
      },
    });
    const amount = readAdmissionFeeAmount(settings);
    if (amount <= 0) {
      return null;
    }

    const [existingAdmission, priorEnrollment] = await Promise.all([
      this.prisma.invoice.findFirst({
        where: {
          studioId: args.studioId,
          studentId: args.studentId,
          chargeType: InvoiceChargeType.ADMISSION,
        },
        select: { id: true },
      }),
      this.prisma.batchEnrollment.findFirst({
        where: {
          studentId: args.studentId,
          batch: { studioId: args.studioId },
        },
        select: { id: true },
      }),
    ]);
    if (existingAdmission || priorEnrollment) {
      return null;
    }

    return this.prisma.invoice.create({
      data: buildAdmissionInvoiceData({
        studentId: args.studentId,
        studioId: args.studioId,
        amount,
        batchId: args.batchId,
        enrolledAt: args.enrolledAt,
        status: args.status,
        settings,
      }),
    });
  }

  async beginBatchEnrollment(args: {
    batchId: string;
    subscriptionId: string;
    studentId: string;
    paymentHold?: boolean;
    /** Reuse an already-loaded batch instead of re-fetching it. */
    batch?: Prisma.BatchGetPayload<Record<string, never>>;
    /** Skip per-student schedule checks; the caller already validated everyone at once. */
    skipScheduleConflicts?: boolean;
  }): Promise<BatchEnrollmentBilling> {
    const now = new Date();
    const batch =
      args.batch ??
      (await this.prisma.batch.findUnique({
        where: { id: args.batchId },
      }));
    if (!batch?.active) {
      throw new NotFoundException("Batch not found or inactive");
    }
    const seatRole = seatRoleForBatchCategory(batch.category);
    const track = await this.findCurrentPeriodTrack(args.studentId, now);

    if (track?.batchId && track.batchId !== args.batchId) {
      await this.moveTrackToBatch(track.id, args.batchId);
      return { kind: "switch", invoice: null };
    }

    if (track && track.batchId === args.batchId) {
      await this.closeTrackWithoutRenewal(track.id);
    }

    // Charge before the seat write so priorEnrollment stays empty on true first join.
    await this.ensureAdmissionFeeInvoice({
      studioId: batch.studioId,
      studentId: args.studentId,
      batchId: args.batchId,
      enrolledAt: now,
    });

    const firstSessionStartsAt = await this.findFirstSessionStartsAt(
      args.batchId,
      now,
    );
    if (isPrepaidAtJoin({ joinedAt: now, firstSessionStartsAt })) {
      const invoice = await this.purchaseForBatch({
        batchId: args.batchId,
        subscriptionId: args.subscriptionId,
        purchaserUserId: args.studentId,
        coveredStudents: [
          {
            studentId: args.studentId,
            seatRole,
            batchId: args.batchId,
          },
        ],
        paymentHold: args.paymentHold,
        batch,
        skipScheduleConflicts: args.skipScheduleConflicts,
      });
      // Discover checkout keeps the hold-only invoice. Staff/bulk/parent seat
      // immediately, so the membership (and invoice link) exist before payment.
      if (args.paymentHold === false) {
        const membership = await this.startMembershipForEnroll({
          batchId: args.batchId,
          subscriptionId: args.subscriptionId,
          studentId: args.studentId,
          at: now,
          billingPhase: MembershipBillingPhase.PREPAID,
          batch,
        });
        const linked = await this.prisma.invoice.update({
          where: { id: invoice.id },
          data: { membershipId: membership.id },
        });
        return { kind: "prepaid", invoice: linked };
      }
      return { kind: "prepaid", invoice };
    }

    const subscription = await this.prisma.subscription.findUnique({
      where: { id: args.subscriptionId },
    });
    if (!subscription?.active) {
      throw new NotFoundException("Subscription not found or inactive");
    }

    const membership = await this.startMembershipForEnroll({
      batchId: args.batchId,
      subscriptionId: args.subscriptionId,
      studentId: args.studentId,
      at: now,
      billingPhase: MembershipBillingPhase.FIRST_POSTPAID,
      batch,
      subscription,
    });

    const { billedSessionCount, remainingSessionCount } =
      await this.countMonthSessions(args.batchId, now);
    const amount = prorateByRemaining(
      Number(subscription.price),
      remainingSessionCount,
      billedSessionCount,
    );

    let invoice: BatchEnrollmentBilling["invoice"] = null;
    if (amount > 0 && remainingSessionCount > 0) {
      const settings = await this.prisma.studioSettings.findUnique({
        where: { studioId: batch.studioId },
        select: { platformFeePercent: true, gstPercent: true },
      });
      invoice = await this.prisma.invoice.create({
        data: {
          studentId: args.studentId,
          studioId: batch.studioId,
          membershipId: membership.id,
          amount,
          status: InvoiceStatus.PENDING,
          chargeType: InvoiceChargeType.PREPAID_PRORATED,
          attendedSessionCount: remainingSessionCount,
          billedSessionCount,
          ...invoiceFeePercents(settings),
          purchaseMeta: {
            batchId: args.batchId,
            subscriptionId: args.subscriptionId,
            purchaserUserId: args.studentId,
            coveredStudents: [
              {
                studentId: args.studentId,
                seatRole,
                batchId: args.batchId,
              },
            ],
          } as unknown as Prisma.InputJsonValue,
        },
      });
    }

    if (isAfterUtcDay20(now) && remainingSessionCount > 0) {
      await this.createEarlyNextPrepaid(membership.id, {
        firstMonthConvertToQuarterly: true,
      });
    }

    return { kind: "postpaid", invoice };
  }

  async moveCurrentTrackToBatch(studentId: string, toBatchId: string) {
    const track = await this.findCurrentPeriodTrack(studentId, new Date());
    if (!track) {
      return;
    }
    await this.moveTrackToBatch(track.id, toBatchId);
  }

  async convertUpcomingInvoiceToQuarterly(invoiceId: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        membership: {
          include: {
            subscription: true,
            coveredStudents: true,
          },
        },
      },
    });
    if (!invoice) {
      throw new NotFoundException("Invoice not found");
    }
    if (
      invoice.status !== InvoiceStatus.PENDING &&
      invoice.status !== InvoiceStatus.OVERDUE
    ) {
      throw new BadRequestException("Only an unpaid invoice can be converted");
    }
    if (invoice.chargeType !== InvoiceChargeType.PREPAID_FULL) {
      throw new BadRequestException(
        "Only the upcoming prepaid invoice can convert to quarterly",
      );
    }
    const meta = parsePurchaseMeta(invoice.purchaseMeta);
    if (!meta?.firstMonthConvertToQuarterly) {
      throw new BadRequestException(
        "Quarterly convert is only available on the first-month bill",
      );
    }
    const membership = invoice.membership;
    if (!membership) {
      throw new BadRequestException("Invoice is not linked to a membership");
    }
    if (membership.subscription.billingCadence !== BillingCadence.MONTHLY) {
      throw new BadRequestException("This invoice is already quarterly");
    }
    const batchId = membership.batchId ?? meta.batchId;
    if (!batchId) {
      throw new BadRequestException("No batch is linked to this invoice");
    }

    const quarterly = await this.prisma.batchPlan.findFirst({
      where: {
        batchId,
        subscription: {
          active: true,
          kind: SubscriptionKind.INDIVIDUAL,
          billingCadence: BillingCadence.QUARTERLY,
          individualAudience: membership.subscription.individualAudience,
        },
      },
      include: { subscription: true },
    });
    if (!quarterly) {
      throw new BadRequestException(
        "This batch does not have a quarterly plan",
      );
    }

    const periodEnd = getPeriodEnd(
      membership.periodStart,
      BillingCadence.QUARTERLY,
    );
    const nextMeta: InvoicePurchaseMeta = {
      ...meta,
      subscriptionId: quarterly.subscriptionId,
      firstMonthConvertToQuarterly: false,
    };

    const [updatedMembership, updatedInvoice] = await this.prisma.$transaction([
      this.prisma.membership.update({
        where: { id: membership.id },
        data: {
          subscriptionId: quarterly.subscriptionId,
          periodEnd,
        },
      }),
      this.prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          amount: quarterly.subscription.price,
          purchaseMeta: nextMeta as unknown as Prisma.InputJsonValue,
        },
      }),
    ]);

    return {
      membership: updatedMembership,
      invoice: {
        ...updatedInvoice,
        amount: Number(updatedInvoice.amount),
      },
    };
  }

  private async findCurrentPeriodTrack(studentId: string, at: Date) {
    const monthStart = utcMonthStart(at);
    const monthEnd = getPeriodEnd(monthStart, BillingCadence.MONTHLY);
    return this.prisma.membership.findFirst({
      where: {
        periodStart: { lte: monthEnd },
        periodEnd: { gte: monthStart },
        status: {
          in: [
            MembershipStatus.ACTIVE,
            MembershipStatus.DUE,
            MembershipStatus.EXPIRED,
          ],
        },
        coveredStudents: { some: { studentId } },
      },
      orderBy: { periodEnd: "desc" },
    });
  }

  private async moveTrackToBatch(membershipId: string, batchId: string) {
    const membership = await this.prisma.membership.findUnique({
      where: { id: membershipId },
      include: { invoices: true, coveredStudents: true },
    });
    if (!membership) {
      return;
    }

    await this.prisma.membership.update({
      where: { id: membershipId },
      data: { batchId },
    });

    const openInvoices = membership.invoices.filter(
      (invoice) =>
        invoice.status === InvoiceStatus.PENDING ||
        invoice.status === InvoiceStatus.OVERDUE,
    );
    for (const invoice of openInvoices) {
      const meta = parsePurchaseMeta(invoice.purchaseMeta);
      if (!meta) {
        continue;
      }
      const nextMeta: InvoicePurchaseMeta = {
        ...meta,
        batchId,
        coveredStudents: meta.coveredStudents.map((seat) => ({
          ...seat,
          batchId,
        })),
      };
      await this.prisma.invoice.update({
        where: { id: invoice.id },
        data: { purchaseMeta: nextMeta as unknown as Prisma.InputJsonValue },
      });
    }
  }

  private async closeTrackWithoutRenewal(membershipId: string) {
    await this.prisma.membership.update({
      where: { id: membershipId },
      data: { status: MembershipStatus.EXPIRED },
    });
  }

  private async startMembershipForEnroll(args: {
    batchId: string;
    subscriptionId: string;
    studentId: string;
    at: Date;
    billingPhase: MembershipBillingPhase;
    batch?: Prisma.BatchGetPayload<Record<string, never>>;
    subscription?: Prisma.SubscriptionGetPayload<Record<string, never>>;
  }) {
    const subscription =
      args.subscription ??
      (await this.prisma.subscription.findUnique({
        where: { id: args.subscriptionId },
      }));
    if (!subscription?.active) {
      throw new NotFoundException("Subscription not found or inactive");
    }
    const batch =
      args.batch ??
      (await this.prisma.batch.findUnique({
        where: { id: args.batchId },
      }));
    if (!batch) {
      throw new NotFoundException("Batch not found");
    }
    const periodStart = utcMonthStart(args.at);
    const periodEnd = getPeriodEnd(periodStart, subscription.billingCadence);
    const seatRole = seatRoleForBatchCategory(batch.category);

    return this.prisma.membership.create({
      data: {
        subscriptionId: subscription.id,
        purchaserUserId: args.studentId,
        periodStart,
        periodEnd,
        status: MembershipStatus.ACTIVE,
        billingPhase: args.billingPhase,
        batchId: args.batchId,
        coveredStudents: {
          create: {
            studentId: args.studentId,
            seatRole,
          },
        },
      },
    });
  }

  private async findFirstSessionStartsAt(batchId: string, at: Date) {
    const monthStart = utcMonthStart(at);
    const monthEnd = getPeriodEnd(monthStart, BillingCadence.MONTHLY);
    const session = await this.prisma.session.findFirst({
      where: {
        batchId,
        type: SessionType.REGULAR,
        status: { not: SessionStatus.CANCELLED },
        startsAt: { gte: monthStart, lte: monthEnd },
      },
      orderBy: { startsAt: "asc" },
      select: { startsAt: true },
    });
    return session?.startsAt ?? null;
  }

  private async countMonthSessions(batchId: string, at: Date) {
    const monthStart = utcMonthStart(at);
    const monthEnd = getPeriodEnd(monthStart, BillingCadence.MONTHLY);
    const baseWhere = {
      batchId,
      type: SessionType.REGULAR,
      status: { not: SessionStatus.CANCELLED },
    };
    const [billedSessionCount, remainingSessionCount] = await Promise.all([
      this.prisma.session.count({
        where: {
          ...baseWhere,
          startsAt: { gte: monthStart, lte: monthEnd },
        },
      }),
      this.prisma.session.count({
        where: {
          ...baseWhere,
          startsAt: { gt: at, lte: monthEnd },
        },
      }),
    ]);
    return { billedSessionCount, remainingSessionCount };
  }

  /**
   * After UTC day 20 with remaining sessions: open next-period DUE membership
   * and its prepaid invoice immediately (daily roll reuses alreadyOpen).
   */
  private async createEarlyNextPrepaid(
    currentMembershipId: string,
    options: { firstMonthConvertToQuarterly?: boolean } = {},
  ) {
    const existing = await this.prisma.membership.findUnique({
      where: { id: currentMembershipId },
      include: {
        subscription: true,
        coveredStudents: true,
      },
    });
    if (!existing) {
      return;
    }

    const periodStart = getNextPeriodStart(new Date(existing.periodEnd));
    const periodEnd = getPeriodEnd(
      periodStart,
      existing.subscription.billingCadence,
    );

    const alreadyOpen = await this.prisma.membership.findFirst({
      where: {
        subscriptionId: existing.subscriptionId,
        purchaserUserId: existing.purchaserUserId,
        periodStart,
        status: {
          in: [
            MembershipStatus.DUE,
            MembershipStatus.EXPIRED,
            MembershipStatus.ACTIVE,
          ],
        },
        id: { not: existing.id },
      },
    });
    if (alreadyOpen) {
      await this.ensureRenewalInvoice(alreadyOpen.id, options);
      return;
    }

    const next = await this.prisma.membership.create({
      data: {
        subscriptionId: existing.subscriptionId,
        purchaserUserId: existing.purchaserUserId,
        periodStart,
        periodEnd,
        status: MembershipStatus.DUE,
        billingPhase: MembershipBillingPhase.PREPAID,
        batchId: existing.batchId,
        coveredStudents: {
          create: existing.coveredStudents.map((c) => ({
            studentId: c.studentId,
            seatRole: c.seatRole,
          })),
        },
      },
    });

    await this.ensureRenewalInvoice(next.id, options);
  }

  private async isTrackStillEnrolled(membership: {
    batchId: string | null;
    coveredStudents: Array<{ studentId: string }>;
  }) {
    if (!membership.batchId) {
      return true;
    }
    const studentIds = membership.coveredStudents.map((seat) => seat.studentId);
    if (studentIds.length === 0) {
      return false;
    }
    const enrollment = await this.prisma.batchEnrollment.findFirst({
      where: {
        batchId: membership.batchId,
        studentId: { in: studentIds },
        status: BatchEnrollmentStatus.ACTIVE,
      },
      select: { id: true },
    });
    return Boolean(enrollment);
  }

  private async voidOpenInvoicesForTrack(membership: {
    id: string;
    batchId: string | null;
    purchaserUserId: string;
  }) {
    await this.prisma.invoice.deleteMany({
      where: {
        status: { in: [InvoiceStatus.PENDING, InvoiceStatus.OVERDUE] },
        chargeType: {
          in: [
            InvoiceChargeType.PREPAID_FULL,
            InvoiceChargeType.PREPAID_PRORATED,
          ],
        },
        OR: [
          { membershipId: membership.id },
          ...(membership.batchId
            ? [
                {
                  studentId: membership.purchaserUserId,
                  purchaseMeta: {
                    path: ["batchId"],
                    equals: membership.batchId,
                  },
                },
              ]
            : []),
        ],
      },
    });
  }

  /**
   * Prepaid renew-on-pay: activate the current DUE/EXPIRED period in place
   * (do not advance to the next period).
   * Pass notify:false when billing already emits PAYMENT_RECEIVED for the same pay.
   */
  async renewManual(membershipId: string, options?: { notify?: boolean }) {
    const notify = options?.notify !== false;
    const existing = await this.prisma.membership.findUnique({
      where: { id: membershipId },
      include: {
        subscription: true,
        coveredStudents: true,
      },
    });

    if (!existing) {
      throw new NotFoundException("Membership not found");
    }

    if (
      existing.status !== MembershipStatus.DUE &&
      existing.status !== MembershipStatus.EXPIRED
    ) {
      throw new BadRequestException(
        "Only due or expired memberships can be activated",
      );
    }

    const renewed = await this.prisma.membership.update({
      where: { id: membershipId },
      data: { status: MembershipStatus.ACTIVE },
      include: {
        subscription: true,
        coveredStudents: true,
      },
    });

    if (notify) {
      await this.notifications.create({
        userId: existing.purchaserUserId,
        type: NotificationType.RENEWED,
        planName: existing.subscription.name,
        periodEnd: existing.periodEnd.toISOString().slice(0, 10),
        dedupeKey: `RENEWED:${renewed.id}`,
        meta: {
          membershipId: renewed.id,
          subscriptionId: existing.subscriptionId,
        },
        entityType: "membership",
        entityId: renewed.id,
      });
    }

    return renewed;
  }

  /**
   * When an ACTIVE period ends, close it and open the next period as DUE
   * (prepaid invoice window starts at next periodStart).
   */
  async rollEndedActiveToNextDue(membershipId: string) {
    const existing = await this.prisma.membership.findUnique({
      where: { id: membershipId },
      include: {
        subscription: true,
        coveredStudents: true,
        purchaser: { select: { id: true, studioId: true } },
      },
    });

    if (!existing) {
      throw new NotFoundException("Membership not found");
    }

    if (existing.status !== MembershipStatus.ACTIVE) {
      return { previousId: existing.id, next: null as null, created: false };
    }

    const stillEnrolled = await this.isTrackStillEnrolled(existing);

    const periodStart = getNextPeriodStart(new Date(existing.periodEnd));
    const periodEnd = getPeriodEnd(
      periodStart,
      existing.subscription.billingCadence,
    );

    const alreadyOpen = stillEnrolled
      ? await this.prisma.membership.findFirst({
          where: {
            subscriptionId: existing.subscriptionId,
            purchaserUserId: existing.purchaserUserId,
            periodStart,
            status: {
              in: [
                MembershipStatus.DUE,
                MembershipStatus.EXPIRED,
                MembershipStatus.ACTIVE,
              ],
            },
            id: { not: existing.id },
          },
          include: {
            subscription: true,
            coveredStudents: true,
          },
        })
      : null;

    await this.prisma.membership.update({
      where: { id: membershipId },
      data: { status: MembershipStatus.EXPIRED },
    });

    if (!stillEnrolled) {
      await this.voidOpenInvoicesForTrack(existing);
      return { previousId: existing.id, next: null as null, created: false };
    }

    if (alreadyOpen) {
      return {
        previousId: existing.id,
        next: alreadyOpen,
        created: false,
      };
    }

    const next = await this.prisma.membership.create({
      data: {
        subscriptionId: existing.subscriptionId,
        purchaserUserId: existing.purchaserUserId,
        periodStart,
        periodEnd,
        status: MembershipStatus.DUE,
        billingPhase: MembershipBillingPhase.PREPAID,
        batchId: existing.batchId,
        coveredStudents: {
          create: existing.coveredStudents.map((c) => ({
            studentId: c.studentId,
            seatRole: c.seatRole,
          })),
        },
      },
      include: {
        subscription: true,
        coveredStudents: true,
      },
    });

    if (existing.billingPhase === MembershipBillingPhase.FIRST_POSTPAID) {
      await this.ensureRenewalInvoice(next.id, {
        firstMonthConvertToQuarterly: true,
      });
    }

    return { previousId: existing.id, next, created: true };
  }

  async ensureRenewalInvoice(
    membershipId: string,
    options: { firstMonthConvertToQuarterly?: boolean } = {},
  ) {
    const existing = await this.prisma.membership.findUnique({
      where: { id: membershipId },
      include: {
        subscription: true,
        coveredStudents: true,
        purchaser: { select: { id: true, studioId: true } },
      },
    });

    if (!existing) {
      throw new NotFoundException("Membership not found");
    }

    if (existing.billingPhase === MembershipBillingPhase.FIRST_POSTPAID) {
      return { invoice: null, created: false as const };
    }

    if (!existing.purchaser.studioId) {
      throw new BadRequestException("Purchaser is not assigned to a studio");
    }

    const stillEnrolled = await this.isTrackStillEnrolled(existing);
    if (!stillEnrolled) {
      return { invoice: null, created: false as const };
    }

    const open = await this.prisma.invoice.findFirst({
      where: {
        membershipId,
        status: { in: [InvoiceStatus.PENDING, InvoiceStatus.OVERDUE] },
      },
      orderBy: { id: "desc" },
    });
    if (open) {
      return { invoice: open, created: false as const };
    }

    const settings = await this.prisma.studioSettings.findUnique({
      where: { studioId: existing.purchaser.studioId },
      select: { platformFeePercent: true, gstPercent: true },
    });

    const priorWithMeta = await this.prisma.invoice.findFirst({
      where: {
        studioId: existing.purchaser.studioId,
        studentId: existing.purchaserUserId,
        purchaseMeta: { not: Prisma.DbNull },
        membership: {
          subscriptionId: existing.subscriptionId,
          purchaserUserId: existing.purchaserUserId,
        },
      },
      orderBy: { id: "desc" },
      select: { purchaseMeta: true },
    });
    const priorMeta = parsePurchaseMeta(priorWithMeta?.purchaseMeta);
    const purchaseMeta: InvoicePurchaseMeta | null = priorMeta
      ? {
          ...(priorMeta.batchId ? { batchId: priorMeta.batchId } : {}),
          ...(existing.batchId ? { batchId: existing.batchId } : {}),
          subscriptionId: existing.subscriptionId,
          purchaserUserId: existing.purchaserUserId,
          coveredStudents: existing.coveredStudents.map((seat) => {
            const priorSeat = priorMeta.coveredStudents.find(
              (entry) => entry.studentId === seat.studentId,
            );
            return {
              studentId: seat.studentId,
              seatRole: seat.seatRole,
              ...(priorSeat?.batchId
                ? { batchId: priorSeat.batchId }
                : existing.batchId
                  ? { batchId: existing.batchId }
                  : priorMeta.batchId
                    ? { batchId: priorMeta.batchId }
                    : {}),
            };
          }),
          ...(options.firstMonthConvertToQuarterly
            ? { firstMonthConvertToQuarterly: true }
            : {}),
        }
      : existing.batchId
        ? {
            batchId: existing.batchId,
            subscriptionId: existing.subscriptionId,
            purchaserUserId: existing.purchaserUserId,
            coveredStudents: existing.coveredStudents.map((seat) => ({
              studentId: seat.studentId,
              seatRole: seat.seatRole,
              batchId: existing.batchId ?? undefined,
            })),
            ...(options.firstMonthConvertToQuarterly
              ? { firstMonthConvertToQuarterly: true }
              : {}),
          }
        : options.firstMonthConvertToQuarterly
          ? {
              subscriptionId: existing.subscriptionId,
              purchaserUserId: existing.purchaserUserId,
              coveredStudents: existing.coveredStudents.map((seat) => ({
                studentId: seat.studentId,
                seatRole: seat.seatRole,
              })),
              firstMonthConvertToQuarterly: true,
            }
          : null;

    const invoice = await this.prisma.invoice.create({
      data: {
        studentId: existing.purchaserUserId,
        studioId: existing.purchaser.studioId,
        membershipId: existing.id,
        amount: existing.subscription.price,
        status: InvoiceStatus.PENDING,
        chargeType: InvoiceChargeType.PREPAID_FULL,
        ...invoiceFeePercents(settings),
        ...(purchaseMeta ? { purchaseMeta } : {}),
      },
    });

    return { invoice, created: true as const };
  }

  async requestRenewalInvoice(membershipId: string) {
    const existing = await this.prisma.membership.findUnique({
      where: { id: membershipId },
      select: { id: true, status: true },
    });

    if (!existing) {
      throw new NotFoundException("Membership not found");
    }

    if (
      existing.status !== MembershipStatus.DUE &&
      existing.status !== MembershipStatus.EXPIRED
    ) {
      throw new BadRequestException(
        "Only due or expired memberships can request renewal",
      );
    }

    const { invoice } = await this.ensureRenewalInvoice(membershipId);
    return invoice;
  }

  async renewFromPaidInvoice(membershipId: string) {
    const membership = await this.prisma.membership.findUnique({
      where: { id: membershipId },
      select: { id: true, status: true },
    });
    if (!membership) {
      return null;
    }
    if (
      membership.status !== MembershipStatus.DUE &&
      membership.status !== MembershipStatus.EXPIRED
    ) {
      return null;
    }
    return this.renewManual(membershipId, { notify: false });
  }

  async findActiveForBatch(
    studentId: string,
    batchId: string,
    at = new Date(),
  ) {
    const batch = await this.prisma.batch.findUnique({
      where: { id: batchId },
    });
    if (!batch) {
      return null;
    }

    const memberships = await this.prisma.membership.findMany({
      where: {
        status: MembershipStatus.ACTIVE,
        periodStart: { lte: at },
        periodEnd: { gte: at },
        coveredStudents: { some: { studentId } },
      },
      include: {
        subscription: true,
        coveredStudents: {
          where: { studentId },
        },
      },
    });

    return (
      memberships.find((membership) => {
        if (!membership.subscription.active) {
          return false;
        }
        const seat = membership.coveredStudents[0];
        if (!seat) {
          return false;
        }
        return membershipCoversBatch({
          status: membership.status,
          periodStart: membership.periodStart,
          periodEnd: membership.periodEnd,
          seatRole: seat.seatRole,
          batchCategory: batch.category,
          at,
        });
      }) ?? null
    );
  }

  /** Student ids with an ACTIVE membership period that covers `batchCategory`. */
  async findStudentIdsWithActiveMonthForBatch(
    studentIds: string[],
    batchCategory: BatchCategory,
    at = new Date(),
  ): Promise<Set<string>> {
    if (studentIds.length === 0) {
      return new Set();
    }

    const seatRole = seatRoleForBatchCategory(batchCategory);
    const covers = await this.prisma.membershipCoveredStudent.findMany({
      where: {
        studentId: { in: studentIds },
        seatRole,
        membership: {
          status: MembershipStatus.ACTIVE,
          periodStart: { lte: at },
          periodEnd: { gte: at },
          subscription: { active: true },
        },
      },
      select: {
        studentId: true,
        seatRole: true,
        membership: {
          select: {
            status: true,
            periodStart: true,
            periodEnd: true,
          },
        },
      },
    });

    const result = new Set<string>();
    for (const cover of covers) {
      if (
        membershipCoversBatch({
          status: cover.membership.status,
          periodStart: cover.membership.periodStart,
          periodEnd: cover.membership.periodEnd,
          seatRole: cover.seatRole,
          batchCategory,
          at,
        })
      ) {
        result.add(cover.studentId);
      }
    }
    return result;
  }

  /**
   * Students who should show as unpaid on roster/attendance:
   * - latest monthly membership is due/expired or has an open invoice
   * - or they have a pending/overdue purchase invoice (enrolled before first payment)
   */
  async findMonthlyUnpaidStudentIds(
    studentIds: string[],
  ): Promise<Set<string>> {
    if (studentIds.length === 0) {
      return new Set();
    }

    const idSet = new Set(studentIds);

    const [covers, openInvoices] = await Promise.all([
      this.prisma.membershipCoveredStudent.findMany({
        where: { studentId: { in: studentIds } },
        include: {
          membership: {
            include: {
              subscription: { select: { billingCadence: true } },
              invoices: { select: { status: true } },
            },
          },
        },
      }),
      this.prisma.invoice.findMany({
        where: {
          status: { in: [InvoiceStatus.PENDING, InvoiceStatus.OVERDUE] },
          OR: [
            { studentId: { in: studentIds } },
            {
              membership: {
                coveredStudents: {
                  some: { studentId: { in: studentIds } },
                },
              },
            },
          ],
        },
        select: {
          studentId: true,
          purchaseMeta: true,
          combineMeta: true,
          membership: {
            select: {
              coveredStudents: { select: { studentId: true } },
            },
          },
        },
      }),
    ]);

    const sorted = [...covers].sort(
      (left, right) =>
        right.membership.periodEnd.getTime() -
        left.membership.periodEnd.getTime(),
    );

    const latestMonthlyByStudent = new Map<
      string,
      (typeof covers)[number]["membership"]
    >();

    for (const cover of sorted) {
      if (
        cover.membership.subscription.billingCadence !== BillingCadence.MONTHLY
      ) {
        continue;
      }
      if (!latestMonthlyByStudent.has(cover.studentId)) {
        latestMonthlyByStudent.set(cover.studentId, cover.membership);
      }
    }

    const unpaid = new Set<string>();
    for (const [studentId, membership] of latestMonthlyByStudent) {
      if (
        isMonthlyPlanUnpaid({
          billingCadence: membership.subscription.billingCadence,
          membershipStatus: membership.status,
          invoiceStatuses: membership.invoices.map((invoice) => invoice.status),
          billingPhase: membership.billingPhase,
        })
      ) {
        unpaid.add(studentId);
      }
    }

    for (const invoice of openInvoices) {
      if (idSet.has(invoice.studentId)) {
        unpaid.add(invoice.studentId);
      }
      const meta = invoice.purchaseMeta as InvoicePurchaseMeta | null;
      if (meta?.coveredStudents) {
        for (const seat of meta.coveredStudents) {
          if (idSet.has(seat.studentId)) {
            unpaid.add(seat.studentId);
          }
        }
      }
      const combineMeta = parseCombineMeta(invoice.combineMeta);
      if (combineMeta) {
        for (const source of combineMeta.sources) {
          if (idSet.has(source.studentId)) {
            unpaid.add(source.studentId);
          }
        }
      }
      for (const seat of invoice.membership?.coveredStudents ?? []) {
        if (idSet.has(seat.studentId)) {
          unpaid.add(seat.studentId);
        }
      }
    }

    return unpaid;
  }

  private async assertFamilyBatchPicks(covered: CoveredStudentInput[]) {
    for (const seat of covered) {
      if (!seat.batchId) {
        throw new BadRequestException(
          "Each Family Pack seat requires a batch pick",
        );
      }
    }
    await this.assertBatchPicks(covered);
  }

  private async assertBatchPicks(covered: CoveredStudentInput[]) {
    const batchIds = covered.map((c) => c.batchId!).filter(Boolean);
    const batches = await this.prisma.batch.findMany({
      where: { id: { in: batchIds } },
      include: {
        enrollments: {
          where: {
            studentId: { in: covered.map((c) => c.studentId) },
          },
        },
      },
    });
    const byId = new Map(batches.map((b) => [b.id, b]));

    const pendingByBatch = new Map<string, number>();
    for (const seat of covered) {
      const batch = byId.get(seat.batchId!);
      if (!batch) {
        throw new NotFoundException(`Batch ${seat.batchId} not found`);
      }
      if (!batch.active) {
        throw new BadRequestException(`Batch ${batch.name} is not active`);
      }
      const expectedCategory =
        seat.seatRole === MembershipSeatRole.KID
          ? BatchCategory.KIDS
          : BatchCategory.ADULTS;
      if (batch.category !== expectedCategory) {
        throw new BadRequestException(
          `Batch ${batch.name} does not match ${seat.seatRole} seat`,
        );
      }

      const alreadyEnrolled = batch.enrollments.some(
        (e) => e.studentId === seat.studentId,
      );
      if (!alreadyEnrolled) {
        pendingByBatch.set(batch.id, (pendingByBatch.get(batch.id) ?? 0) + 1);
      }
    }

    await this.prisma.$transaction(async (tx) => {
      for (const [batchId, pending] of pendingByBatch) {
        const batch = byId.get(batchId)!;
        await lockBatchRow(tx, batchId);
        const occupied = await countOccupiedSeats(tx, batchId);
        if (occupied + pending > batch.capacity) {
          throw new BadRequestException(
            `Batch ${batch.name} does not have enough open seats`,
          );
        }
      }
    });
  }

  private assertCoveredSeats(
    subscription: {
      kind: SubscriptionKind;
      individualAudience: IndividualAudience | null;
      adultSeats: number;
      kidSeats: number;
    },
    covered: CoveredStudentInput[],
  ) {
    const studentIds = new Set(covered.map((c) => c.studentId));
    if (studentIds.size !== covered.length) {
      throw new BadRequestException(
        "Duplicate covered students are not allowed",
      );
    }

    const adultCount = covered.filter(
      (c) => c.seatRole === MembershipSeatRole.ADULT,
    ).length;
    const kidCount = covered.filter(
      (c) => c.seatRole === MembershipSeatRole.KID,
    ).length;

    if (
      adultCount !== subscription.adultSeats ||
      kidCount !== subscription.kidSeats
    ) {
      throw new BadRequestException(
        `Covered seats must be ${subscription.adultSeats} adult(s) and ${subscription.kidSeats} kid(s)`,
      );
    }

    if (subscription.kind === SubscriptionKind.INDIVIDUAL) {
      if (covered.length !== 1) {
        throw new BadRequestException(
          "Individual subscriptions cover exactly one student",
        );
      }
      const expected =
        subscription.individualAudience === IndividualAudience.ADULT
          ? MembershipSeatRole.ADULT
          : MembershipSeatRole.KID;
      if (covered[0]?.seatRole !== expected) {
        throw new BadRequestException(
          `Individual ${subscription.individualAudience} requires a ${expected} seat`,
        );
      }
    }
  }
}

export { seatRoleForBatchCategory };
