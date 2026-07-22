import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  BillingCadence,
  NotificationType,
  PlanType,
  SubscriptionStatus,
} from "@prisma/client";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import {
  getFullBatchPeriod,
  getNextPeriodStart,
  getPeriodEnd,
  planCoversBatch,
} from "./subscription-helpers";

@Injectable()
export class SubscriptionsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(NotificationsService)
    private readonly notifications: NotificationsService,
  ) {}

  listForStudent(studentId: string) {
    return this.prisma.subscription.findMany({
      where: { studentId },
      include: { plan: true },
      orderBy: { periodStart: "desc" },
    });
  }

  async assignPlan(studentId: string, planId: string, batchId?: string) {
    const plan = await this.prisma.plan.findUnique({
      where: { id: planId },
    });

    if (!plan?.active) {
      throw new NotFoundException("Plan not found or inactive");
    }

    let periodStart: Date;
    let periodEnd: Date;

    if (plan.billingCadence === BillingCadence.FULL_BATCH) {
      if (!batchId) {
        throw new BadRequestException(
          "batchId is required for full-batch plans",
        );
      }

      const batch = await this.prisma.batch.findUnique({
        where: { id: batchId },
      });
      if (!batch) {
        throw new NotFoundException("Batch not found");
      }
      if (
        !planCoversBatch(plan, {
          id: batch.id,
          monthlyPlanId: batch.monthlyPlanId,
          fullBatchPlanId: batch.fullBatchPlanId,
          category: batch.category,
        })
      ) {
        throw new BadRequestException(
          "Plan is not linked to this batch as a full-batch offer",
        );
      }

      const schedule = batch.scheduleJson as {
        startDate?: string;
        endDate?: string;
      };
      if (!schedule?.startDate || !schedule?.endDate) {
        throw new BadRequestException("Batch schedule dates are required");
      }

      ({ periodStart, periodEnd } = getFullBatchPeriod({
        startDate: schedule.startDate,
        endDate: schedule.endDate,
      }));
    } else {
      periodStart = getNextPeriodStart();
      periodEnd = getPeriodEnd(periodStart);
    }

    const creditsRemaining =
      plan.type === PlanType.FIXED_BATCH ? (plan.classCredits ?? 0) : null;

    return this.prisma.subscription.create({
      data: {
        studentId,
        planId,
        periodStart,
        periodEnd,
        status: SubscriptionStatus.ACTIVE,
        creditsRemaining,
      },
      include: { plan: true },
    });
  }

  async renewManual(subscriptionId: string) {
    const existing = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { plan: true },
    });

    if (!existing) {
      throw new NotFoundException("Subscription not found");
    }

    if (existing.plan.billingCadence === BillingCadence.FULL_BATCH) {
      throw new BadRequestException(
        "Full-batch subscriptions cannot be renewed",
      );
    }

    const periodStart = getNextPeriodStart(new Date(existing.periodEnd));
    periodStart.setDate(1);
    periodStart.setHours(0, 0, 0, 0);

    const periodEnd = getPeriodEnd(periodStart);
    const creditsRemaining =
      existing.plan.type === PlanType.FIXED_BATCH
        ? (existing.plan.classCredits ?? 0)
        : null;

    await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: { status: SubscriptionStatus.EXPIRED },
    });

    const renewed = await this.prisma.subscription.create({
      data: {
        studentId: existing.studentId,
        planId: existing.planId,
        periodStart,
        periodEnd,
        status: SubscriptionStatus.ACTIVE,
        creditsRemaining,
      },
      include: { plan: true },
    });

    await this.notifications.create({
      userId: existing.studentId,
      type: NotificationType.RENEWED,
      planName: existing.plan.name,
      periodEnd: periodEnd.toISOString().slice(0, 10),
      dedupeKey: `RENEWED:${renewed.id}`,
      meta: { subscriptionId: renewed.id, planId: existing.planId },
      entityType: "subscription",
      entityId: renewed.id,
    });

    return renewed;
  }

  async consumeCredit(subscriptionId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { plan: true },
    });

    if (!subscription) {
      throw new NotFoundException("Subscription not found");
    }

    if (subscription.plan.type !== PlanType.FIXED_BATCH) {
      return subscription;
    }

    const remaining = subscription.creditsRemaining ?? 0;
    if (remaining <= 0) {
      throw new BadRequestException("No credits remaining");
    }

    return this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: { creditsRemaining: remaining - 1 },
      include: { plan: true },
    });
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

    const subscriptions = await this.prisma.subscription.findMany({
      where: {
        studentId,
        status: SubscriptionStatus.ACTIVE,
        periodStart: { lte: at },
        periodEnd: { gte: at },
      },
      include: { plan: true },
    });

    return (
      subscriptions.find((subscription) => {
        const plan = subscription.plan;
        if (!plan.active) {
          return false;
        }

        if (plan.type === PlanType.FIXED_BATCH) {
          const covers =
            batch.monthlyPlanId === plan.id ||
            batch.fullBatchPlanId === plan.id;
          return covers && (subscription.creditsRemaining ?? 0) > 0;
        }

        if (plan.type === PlanType.UNLIMITED_KIDS) {
          return batch.category === "KIDS";
        }

        if (plan.type === PlanType.UNLIMITED_ADULTS) {
          return batch.category === "ADULTS";
        }

        return false;
      }) ?? null
    );
  }
}
