import { Inject, Injectable } from "@nestjs/common";
import {
  InvoiceStatus,
  NotificationType,
  SubscriptionStatus,
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

    const dueUpdated = await this.prisma.subscription.updateMany({
      where: {
        status: SubscriptionStatus.ACTIVE,
        periodEnd: { lt: now },
      },
      data: { status: SubscriptionStatus.DUE },
    });

    const expireCutoff = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const subscriptionsToExpire = await this.prisma.subscription.findMany({
      where: {
        status: SubscriptionStatus.DUE,
        periodEnd: { lt: expireCutoff },
      },
      include: { plan: true },
    });

    for (const subscription of subscriptionsToExpire) {
      await this.notifications.create({
        userId: subscription.studentId,
        type: NotificationType.NOT_RENEWED,
        planName: subscription.plan.name,
        dedupeKey: `NOT_RENEWED:${subscription.id}`,
        meta: { subscriptionId: subscription.id, planId: subscription.planId },
        entityType: "subscription",
        entityId: subscription.id,
      });
    }

    const expiredUpdated = await this.prisma.subscription.updateMany({
      where: {
        id: {
          in: subscriptionsToExpire.map((subscription) => subscription.id),
        },
      },
      data: {
        status: SubscriptionStatus.EXPIRED,
        creditsRemaining: 0,
      },
    });

    const overdueInvoices = await this.prisma.invoice.updateMany({
      where: {
        status: InvoiceStatus.PENDING,
        subscription: {
          status: { in: [SubscriptionStatus.DUE, SubscriptionStatus.EXPIRED] },
        },
      },
      data: { status: InvoiceStatus.OVERDUE },
    });

    const expiringSoon = await this.prisma.subscription.findMany({
      where: {
        status: SubscriptionStatus.ACTIVE,
        periodEnd: {
          lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
          gte: now,
        },
      },
      include: { student: true, plan: true },
    });

    for (const subscription of expiringSoon) {
      await this.notifications.create({
        userId: subscription.studentId,
        type: NotificationType.PLAN_EXPIRING,
        planName: subscription.plan.name,
        periodEnd: subscription.periodEnd.toISOString().slice(0, 10),
        dedupeKey: `PLAN_EXPIRING:${subscription.id}:${today}`,
        meta: { subscriptionId: subscription.id },
        entityType: "subscription",
        entityId: subscription.id,
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
      dueSubscriptions: dueUpdated.count,
      expiredSubscriptions: expiredUpdated.count,
      notRenewedNotifications: subscriptionsToExpire.length,
      overdueInvoices: overdueInvoices.count,
      expiringNotifications: expiringSoon.length,
      overdueNotifications: overdueStudents.length,
      ranAt: now.toISOString(),
    };
  }
}
