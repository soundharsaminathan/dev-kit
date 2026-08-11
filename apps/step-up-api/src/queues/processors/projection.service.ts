import { Inject, Injectable, Logger } from "@nestjs/common";
import { BookingStatus, BookingType, InvoiceStatus } from "@prisma/client";
import { ACTIVE_ENROLLMENT_WHERE } from "../../batches/enrollment-status";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class ProjectionService {
  private readonly logger = new Logger(ProjectionService.name);

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async refreshBatchSummary(batchId: string) {
    const batch = await this.prisma.batch.findUnique({
      where: { id: batchId },
      select: {
        id: true,
        studioId: true,
        capacity: true,
        active: true,
        _count: {
          select: {
            enrollments: { where: ACTIVE_ENROLLMENT_WHERE },
            trainers: true,
          },
        },
      },
    });

    if (!batch) {
      this.logger.warn(`BatchSummary skipped; batch ${batchId} missing`);
      return null;
    }

    const now = new Date();
    const reserved = await this.prisma.booking.count({
      where: {
        batchId,
        type: { notIn: [BookingType.PRIVATE, BookingType.TRIAL] },
        OR: [
          {
            status: {
              in: [BookingStatus.PENDING, BookingStatus.CONFIRMED],
            },
          },
          {
            status: BookingStatus.AWAITING_PAYMENT,
            paymentHoldExpiresAt: { gt: now },
          },
        ],
      },
    });

    const enrolled = batch._count.enrollments;
    const availableSeats = Math.max(0, batch.capacity - enrolled - reserved);

    return this.prisma.batchSummary.upsert({
      where: { batchId: batch.id },
      create: {
        batchId: batch.id,
        studioId: batch.studioId,
        capacity: batch.capacity,
        enrolled,
        reserved,
        availableSeats,
        trainerCount: batch._count.trainers,
        active: batch.active,
      },
      update: {
        capacity: batch.capacity,
        enrolled,
        reserved,
        availableSeats,
        trainerCount: batch._count.trainers,
        active: batch.active,
      },
    });
  }

  async getStudioRevenueSummary(studioId: string, period?: string) {
    const periodKey = period ?? currentMonthPeriod(new Date());
    return this.prisma.studioRevenueSummary.findUnique({
      where: {
        studioId_period: { studioId, period: periodKey },
      },
    });
  }

  async refreshStudioRevenue(studioId: string, period?: string) {
    const periodKey = period ?? currentMonthPeriod(new Date());
    const { start, end } = periodBounds(periodKey);

    const [paid, pending, refunded] = await Promise.all([
      this.prisma.invoice.findMany({
        where: {
          studioId,
          status: InvoiceStatus.PAID,
          paidAt: { gte: start, lt: end },
        },
        select: { amount: true },
      }),
      this.prisma.invoice.count({
        where: {
          studioId,
          status: { in: [InvoiceStatus.PENDING, InvoiceStatus.OVERDUE] },
        },
      }),
      this.prisma.invoice.findMany({
        where: {
          studioId,
          OR: [
            { status: InvoiceStatus.REFUNDED, refundedAt: { gte: start, lt: end } },
            {
              status: InvoiceStatus.PAID,
              refundedAmount: { gt: 0 },
              refundedAt: { gte: start, lt: end },
            },
          ],
        },
        select: { refundedAmount: true },
      }),
    ]);

    const gross = paid.reduce((sum, invoice) => sum + Number(invoice.amount), 0);
    const refunds = refunded.reduce(
      (sum, invoice) => sum + Number(invoice.refundedAmount),
      0,
    );
    const net = Math.max(0, gross - refunds);

    return this.prisma.studioRevenueSummary.upsert({
      where: {
        studioId_period: { studioId, period: periodKey },
      },
      create: {
        studioId,
        period: periodKey,
        grossRevenue: gross,
        refunds,
        netRevenue: net,
        paidInvoices: paid.length,
        pendingInvoices: pending,
      },
      update: {
        grossRevenue: gross,
        refunds,
        netRevenue: net,
        paidInvoices: paid.length,
        pendingInvoices: pending,
      },
    });
  }
}

export function currentMonthPeriod(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function periodBounds(period: string): { start: Date; end: Date } {
  const [yearRaw, monthRaw] = period.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  return { start, end };
}
