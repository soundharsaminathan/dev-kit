import { Inject, Injectable } from "@nestjs/common";
import type { InvoiceStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { resolvePageLimit } from "../../shared/pagination";
import { userPiiSelect } from "../../users/user-crypto.service";

const studentLiteSelect = {
  id: true,
  photoUrl: true,
  ...userPiiSelect,
} as const;

const membershipStudioSelect = {
  id: true,
  periodStart: true,
  periodEnd: true,
  billingPhase: true,
  subscription: {
    select: {
      id: true,
      kind: true,
      name: true,
      adultSeats: true,
      kidSeats: true,
      billingCadence: true,
    },
  },
} as const;

const membershipStudentSelect = {
  periodStart: true,
  periodEnd: true,
} as const;

const studioInvoiceSelect = {
  id: true,
  studentId: true,
  membershipId: true,
  amount: true,
  referralDiscount: true,
  studioDiscount: true,
  familyDiscount: true,
  refundedAmount: true,
  status: true,
  paymentMethod: true,
  paidAt: true,
  refundedAt: true,
  platformFeePercent: true,
  gstPercent: true,
  studioId: true,
  razorpayOrderId: true,
  razorpayPaymentId: true,
  paymentHoldExpiresAt: true,
  purchaseMeta: true,
  combineMeta: true,
  chargeType: true,
  attendedSessionCount: true,
  billedSessionCount: true,
  student: { select: studentLiteSelect },
  membership: { select: membershipStudioSelect },
} as const;

const studentInvoiceSelect = {
  id: true,
  studentId: true,
  membershipId: true,
  amount: true,
  referralDiscount: true,
  studioDiscount: true,
  familyDiscount: true,
  refundedAmount: true,
  status: true,
  paymentMethod: true,
  paidAt: true,
  refundedAt: true,
  platformFeePercent: true,
  gstPercent: true,
  studioId: true,
  razorpayOrderId: true,
  razorpayPaymentId: true,
  paymentHoldExpiresAt: true,
  purchaseMeta: true,
  combineMeta: true,
  chargeType: true,
  attendedSessionCount: true,
  billedSessionCount: true,
  membership: { select: membershipStudentSelect },
} as const;

@Injectable()
export class BillingQuery {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async findStudioInvoices(
    studioId: string,
    pagination: { cursor?: string; limit?: number; status?: InvoiceStatus },
  ) {
    const limit = resolvePageLimit(pagination.limit);
    const where: Prisma.InvoiceWhereInput = {
      studioId,
      ...(pagination.status ? { status: pagination.status } : {}),
    };

    const rows = await this.prisma.invoice.findMany({
      where,
      select: studioInvoiceSelect,
      orderBy: { id: "desc" },
      ...(pagination.cursor
        ? { cursor: { id: pagination.cursor }, skip: 1 }
        : {}),
      take: limit + 1,
    });

    return { rows, limit };
  }

  async findStudentInvoices(
    studentId: string,
    pagination: { cursor?: string; limit?: number },
  ) {
    const limit = resolvePageLimit(pagination.limit);

    const rows = await this.prisma.invoice.findMany({
      where: { studentId },
      select: studentInvoiceSelect,
      orderBy: { id: "desc" },
      ...(pagination.cursor
        ? { cursor: { id: pagination.cursor }, skip: 1 }
        : {}),
      take: limit + 1,
    });

    return { rows, limit };
  }
}
