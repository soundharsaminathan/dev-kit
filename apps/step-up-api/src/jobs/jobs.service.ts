import { Inject, Injectable } from "@nestjs/common";
import {
  InvoiceStatus,
  MembershipStatus,
  NotificationType,
} from "@prisma/client";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

@Injectable()
export class JobsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(NotificationsService)
    private readonly notifications: NotificationsService,
  ) {}

  async runDaily() {
    const now = new Date();
    const today = dayKey(now);

    const dueUpdated = await this.prisma.membership.updateMany({
      where: {
        status: MembershipStatus.ACTIVE,
        periodEnd: { lt: now },
      },
      data: { status: MembershipStatus.DUE },
    });

    const expireCutoff = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const membershipsToExpire = await this.prisma.membership.findMany({
      where: {
        status: MembershipStatus.DUE,
        periodEnd: { lt: expireCutoff },
      },
      include: { subscription: true },
    });

    for (const membership of membershipsToExpire) {
      await this.notifications.create({
        userId: membership.purchaserUserId,
        type: NotificationType.NOT_RENEWED,
        planName: membership.subscription.name,
        dedupeKey: `NOT_RENEWED:${membership.id}`,
        meta: {
          membershipId: membership.id,
          subscriptionId: membership.subscriptionId,
        },
        entityType: "membership",
        entityId: membership.id,
      });
    }

    const expiredUpdated = await this.prisma.membership.updateMany({
      where: {
        id: {
          in: membershipsToExpire.map((membership) => membership.id),
        },
      },
      data: {
        status: MembershipStatus.EXPIRED,
      },
    });

    const overdueInvoices = await this.prisma.invoice.updateMany({
      where: {
        status: InvoiceStatus.PENDING,
        membership: {
          status: { in: [MembershipStatus.DUE, MembershipStatus.EXPIRED] },
        },
      },
      data: { status: InvoiceStatus.OVERDUE },
    });

    const expiringSoon = await this.prisma.membership.findMany({
      where: {
        status: MembershipStatus.ACTIVE,
        periodEnd: {
          lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
          gte: now,
        },
      },
      include: { subscription: true },
    });

    for (const membership of expiringSoon) {
      await this.notifications.create({
        userId: membership.purchaserUserId,
        type: NotificationType.SUBSCRIPTION_EXPIRING,
        planName: membership.subscription.name,
        periodEnd: membership.periodEnd.toISOString().slice(0, 10),
        dedupeKey: `SUBSCRIPTION_EXPIRING:${membership.id}:${today}`,
        meta: {
          membershipId: membership.id,
          subscriptionId: membership.subscriptionId,
        },
        entityType: "membership",
        entityId: membership.id,
      });
    }

    const overdueStudents = await this.prisma.invoice.findMany({
      where: { status: InvoiceStatus.OVERDUE },
      include: { student: true },
    });

    for (const invoice of overdueStudents) {
      await this.notifications.create({
        userId: invoice.studentId,
        type: NotificationType.PAYMENT_OVERDUE,
        dedupeKey: `PAYMENT_OVERDUE:${invoice.id}:${today}`,
        meta: { invoiceId: invoice.id },
        entityType: "invoice",
        entityId: invoice.id,
      });
    }

    return {
      dueMemberships: dueUpdated.count,
      expiredMemberships: expiredUpdated.count,
      notRenewedNotifications: membershipsToExpire.length,
      overdueInvoices: overdueInvoices.count,
      expiringNotifications: expiringSoon.length,
      overdueNotifications: overdueStudents.length,
      ranAt: now.toISOString(),
    };
  }
}
