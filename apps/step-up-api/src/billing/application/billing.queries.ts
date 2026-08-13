import { Inject, Injectable, Logger } from "@nestjs/common";
import type { InvoiceStatus } from "@prisma/client";
import { ACTIVE_ENROLLMENT_WHERE } from "../../batches/enrollment-status";
import { PrismaService } from "../../prisma/prisma.service";
import { buildPage, type Page } from "../../shared/pagination";
import type { DecryptedUser } from "../../users/user-crypto.service";
import { UserPresenter } from "../../users/user-presenter";
import { BillingService } from "../billing.service";
import { invoiceDueDate } from "../../memberships/membership-helpers";
import {
  batchIdsForInvoiceDisplay,
  batchLabelForInvoice,
  parseCombineMeta,
  parsePurchaseMeta,
} from "../family-combine";
import { BillingQuery } from "../persistence/billing.query";

@Injectable()
export class BillingQueriesService {
  private readonly logger = new Logger(BillingQueriesService.name);

  constructor(
    @Inject(BillingQuery) private readonly query: BillingQuery,
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(UserPresenter) private readonly users: UserPresenter,
    @Inject(BillingService) private readonly billing: BillingService,
  ) {}

  async listByStudio(
    studioId: string,
    pagination: { cursor?: string; limit?: number; status?: InvoiceStatus } = {},
  ): Promise<Page<Record<string, unknown>>> {
    const { rows, limit } = await this.query.findStudioInvoices(
      studioId,
      pagination,
    );

    const purchaseSubIds = new Set<string>();
    const studentIds = new Set<string>();
    for (const invoice of rows) {
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
        : Promise.resolve(
            [] as Array<{ studentId: string; batchId: string }>,
          ),
    ]);
    const purchaseSubById = new Map(purchaseSubs.map((s) => [s.id, s]));
    const studentBatchMap = new Map<string, Set<string>>();
    for (const enrollment of enrollments) {
      const batchIds = studentBatchMap.get(enrollment.studentId) ?? new Set();
      batchIds.add(enrollment.batchId);
      studentBatchMap.set(enrollment.studentId, batchIds);
    }

    const batchIdsToResolve = new Set<string>();
    for (const invoice of rows) {
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

    let presentedStudents: Awaited<
      ReturnType<UserPresenter["presentLiteMany"]>
    > = [];
    try {
      presentedStudents = await this.users.presentLiteMany(
        rows.map((invoice) => invoice.student),
        { email: true, phone: true },
      );
    } catch (error) {
      this.logger.warn(
        `Invoice list student present failed; falling back to ids: ${String(error)}`,
      );
      presentedStudents = rows.map((invoice) => ({
        id: invoice.studentId,
        name: invoice.studentId,
        photoUrl: null,
      }));
    }

    const items = rows.map((invoice, index) => {
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

      const student = presentedStudents[index] ?? {
        id: invoice.studentId,
        name: invoice.studentId,
        photoUrl: null,
      };

      return {
        id: invoice.id,
        studentId: invoice.studentId,
        membershipId: invoice.membershipId,
        amount: Number(invoice.amount),
        referralDiscount: Number(invoice.referralDiscount ?? 0),
        studioDiscount: Number(invoice.studioDiscount ?? 0),
        familyDiscount: Number(invoice.familyDiscount ?? 0),
        refundedAmount: Number(invoice.refundedAmount ?? 0),
        status: invoice.status,
        paymentMethod: invoice.paymentMethod,
        paidAt: invoice.paidAt?.toISOString() ?? null,
        refundedAt: invoice.refundedAt?.toISOString() ?? null,
        platformFeePercent: invoice.platformFeePercent,
        studioId: invoice.studioId,
        razorpayOrderId: invoice.razorpayOrderId,
        razorpayPaymentId: invoice.razorpayPaymentId,
        paymentHoldExpiresAt:
          invoice.paymentHoldExpiresAt?.toISOString() ?? null,
        chargeType: invoice.chargeType,
        attendedSessionCount: invoice.attendedSessionCount,
        billedSessionCount: invoice.billedSessionCount,
        canConvertToQuarterly:
          Boolean(purchaseMeta?.firstMonthConvertToQuarterly) &&
          (invoice.status === "PENDING" || invoice.status === "OVERDUE") &&
          invoice.chargeType === "PREPAID_FULL",
        dueDate: invoiceDueDate({
          chargeType: invoice.chargeType,
          periodStart: invoice.membership?.periodStart,
          periodEnd: invoice.membership?.periodEnd,
        })?.toISOString() ?? null,
        membership: invoice.membership
          ? {
              id: invoice.membership.id,
              periodStart: invoice.membership.periodStart.toISOString(),
              periodEnd: invoice.membership.periodEnd.toISOString(),
              subscription: invoice.membership.subscription,
            }
          : null,
        student: {
          id: student.id,
          name: student.name,
          photoUrl: student.photoUrl,
          email: student.email,
          phone: student.phone,
        },
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

    return buildPage(items, limit, (row) => row.id as string);
  }

  async listForStudent(
    actor: DecryptedUser,
    studentId: string,
    pagination: { cursor?: string; limit?: number } = {},
  ): Promise<Page<Record<string, unknown>>> {
    await this.billing.assertCanAccessStudentInvoices(actor, studentId);

    const { rows, limit } = await this.query.findStudentInvoices(
      studentId,
      pagination,
    );

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
    for (const invoice of rows) {
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

    const items = rows.map((invoice) => {
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
        id: invoice.id,
        studentId: invoice.studentId,
        membershipId: invoice.membershipId,
        amount: Number(invoice.amount),
        referralDiscount: Number(invoice.referralDiscount ?? 0),
        studioDiscount: Number(invoice.studioDiscount ?? 0),
        familyDiscount: Number(invoice.familyDiscount ?? 0),
        refundedAmount: Number(invoice.refundedAmount ?? 0),
        status: invoice.status,
        paymentMethod: invoice.paymentMethod,
        paidAt: invoice.paidAt?.toISOString() ?? null,
        refundedAt: invoice.refundedAt?.toISOString() ?? null,
        dueDate:
          invoiceDueDate({
            chargeType: invoice.chargeType,
            periodStart: invoice.membership?.periodStart,
            periodEnd: invoice.membership?.periodEnd,
          })?.toISOString() ?? null,
        chargeType: invoice.chargeType,
        attendedSessionCount: invoice.attendedSessionCount,
        billedSessionCount: invoice.billedSessionCount,
        canConvertToQuarterly:
          Boolean(purchaseMeta?.firstMonthConvertToQuarterly) &&
          (invoice.status === "PENDING" || invoice.status === "OVERDUE") &&
          invoice.chargeType === "PREPAID_FULL",
        batchId,
        batchName,
        purchaseMeta,
        combineMeta,
      };
    });

    return buildPage(items, limit, (row) => row.id as string);
  }
}
