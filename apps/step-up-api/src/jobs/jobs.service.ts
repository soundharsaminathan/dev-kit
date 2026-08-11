import { getQueueToken } from "@nestjs/bullmq";
import { Inject, Injectable, Optional } from "@nestjs/common";
import { ModuleRef } from "@nestjs/core";
import {
  InvoiceStatus,
  MembershipStatus,
  NotificationType,
} from "@prisma/client";
import type { Queue } from "bullmq";
import { MembershipsService } from "../memberships/memberships.service";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import { DAILY_JOBS_QUEUE } from "../queues/queue.constants";
import { OUTBOX_EVENT_DAILY_JOBS_REQUESTED } from "../shared/outbox-events";

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_GRACE_DAYS = 3;
const DEFAULT_EXPIRE_ALERT_DAYS = 7;

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

@Injectable()
export class JobsService {
  private dailyQueue: Queue | null = null;

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(NotificationsService)
    private readonly notifications: NotificationsService,
    @Inject(MembershipsService)
    private readonly memberships: MembershipsService,
    @Optional() @Inject(ModuleRef) private readonly moduleRef?: ModuleRef,
  ) {}

  private getDailyQueue(): Queue | null {
    if (this.dailyQueue) {
      return this.dailyQueue;
    }
    if (!this.moduleRef) {
      return null;
    }
    try {
      this.dailyQueue = this.moduleRef.get<Queue>(
        getQueueToken(DAILY_JOBS_QUEUE),
        { strict: false },
      );
    } catch {
      this.dailyQueue = null;
    }
    return this.dailyQueue;
  }

  /** Enqueue daily work for the worker (API must not run bulk jobs inline). */
  async enqueueDaily() {
    const queue = this.getDailyQueue();
    if (queue) {
      const job = await queue.add(
        "daily",
        {},
        {
          jobId: `daily-jobs:http:${Date.now()}`,
          attempts: 3,
          backoff: { type: "exponential", delay: 2000 },
          removeOnComplete: 50,
          removeOnFail: 100,
        },
      );
      return { enqueued: true, jobId: job.id ?? null };
    }

    await this.prisma.outboxEvent.create({
      data: {
        type: OUTBOX_EVENT_DAILY_JOBS_REQUESTED,
        payload: {},
      },
    });
    return { enqueued: true, jobId: null, via: "outbox" as const };
  }

  async runDaily() {
    const now = new Date();
    const today = dayKey(now);

    const endedActive = await this.prisma.membership.findMany({
      where: {
        status: MembershipStatus.ACTIVE,
        periodEnd: { lt: now },
      },
      select: { id: true },
    });

    let rolledToDue = 0;
    const billableMembershipIds = new Set<string>();

    for (const membership of endedActive) {
      const result = await this.memberships.rollEndedActiveToNextDue(
        membership.id,
      );
      if (result.next) {
        billableMembershipIds.add(result.next.id);
        if (result.created) {
          rolledToDue += 1;
        }
      }
    }

    const existingBillable = await this.prisma.membership.findMany({
      where: {
        status: { in: [MembershipStatus.DUE, MembershipStatus.EXPIRED] },
      },
      select: { id: true },
    });
    for (const membership of existingBillable) {
      billableMembershipIds.add(membership.id);
    }

    let renewalInvoicesCreated = 0;
    for (const membershipId of billableMembershipIds) {
      const result = await this.memberships.ensureRenewalInvoice(membershipId);
      if (result.created) {
        renewalInvoicesCreated += 1;
      }
    }

    const studioSettings = await this.prisma.studioSettings.findMany({
      select: {
        studioId: true,
        graceDays: true,
        expireAlertDays: true,
      },
    });
    const settingsByStudio = new Map(
      studioSettings.map((row) => [row.studioId, row]),
    );

    const dueMemberships = await this.prisma.membership.findMany({
      where: { status: MembershipStatus.DUE },
      include: { subscription: true },
    });

    const membershipsToExpire = dueMemberships.filter((membership) => {
      const graceDays =
        settingsByStudio.get(membership.subscription.studioId)?.graceDays ??
        DEFAULT_GRACE_DAYS;
      const expireCutoff = new Date(now.getTime() - graceDays * DAY_MS);
      return membership.periodStart < expireCutoff;
    });

    const expireMembershipIds = membershipsToExpire.map(
      (membership) => membership.id,
    );
    const unpaidInvoicesForExpire =
      expireMembershipIds.length === 0
        ? []
        : await this.prisma.invoice.findMany({
            where: {
              membershipId: { in: expireMembershipIds },
              status: {
                in: [InvoiceStatus.PENDING, InvoiceStatus.OVERDUE],
              },
            },
            select: { membershipId: true },
          });
    const expireCoveredByOverdue = new Set(
      unpaidInvoicesForExpire
        .map((row) => row.membershipId)
        .filter((id): id is string => Boolean(id)),
    );

    let notRenewedNotifications = 0;
    for (const membership of membershipsToExpire) {
      if (expireCoveredByOverdue.has(membership.id)) {
        continue;
      }
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
      notRenewedNotifications += 1;
    }

    const expiredUpdated = await this.prisma.membership.updateMany({
      where: {
        id: {
          in: expireMembershipIds,
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

    const activeMemberships = await this.prisma.membership.findMany({
      where: {
        status: MembershipStatus.ACTIVE,
        periodEnd: { gte: now },
      },
      include: { subscription: true },
    });

    const expiringSoon = activeMemberships.filter((membership) => {
      const expireAlertDays =
        settingsByStudio.get(membership.subscription.studioId)
          ?.expireAlertDays ?? DEFAULT_EXPIRE_ALERT_DAYS;
      const alertCutoff = new Date(now.getTime() + expireAlertDays * DAY_MS);
      return membership.periodEnd <= alertCutoff;
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
      dueMemberships: rolledToDue,
      renewalInvoicesCreated,
      expiredMemberships: expiredUpdated.count,
      notRenewedNotifications,
      overdueInvoices: overdueInvoices.count,
      expiringNotifications: expiringSoon.length,
      overdueNotifications: overdueStudents.length,
      ranAt: now.toISOString(),
    };
  }
}
