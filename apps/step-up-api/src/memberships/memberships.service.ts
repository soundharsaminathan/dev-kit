import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  BatchCategory,
  IndividualAudience,
  MembershipSeatRole,
  MembershipStatus,
  NotificationType,
  SubscriptionKind,
} from "@prisma/client";
import { ScheduleConflictService } from "../calendar/schedule-conflict.service";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import {
  getNextPeriodStart,
  getPeriodEnd,
  membershipCoversBatch,
  seatRoleForBatchCategory,
} from "./membership-helpers";

export type CoveredStudentInput = {
  studentId: string;
  seatRole: MembershipSeatRole;
  batchId?: string;
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

    if (subscription.kind === SubscriptionKind.FAMILY) {
      await this.assertFamilyBatchPicks(args.coveredStudents);
      for (const covered of args.coveredStudents) {
        await this.scheduleConflicts.assertStudentAvailableForBatch(
          covered.studentId,
          covered.batchId!,
        );
      }
    }

    const periodStart = getNextPeriodStart();
    const periodEnd = getPeriodEnd(periodStart, subscription.billingCadence);

    return this.prisma.$transaction(async (tx) => {
      const membership = await tx.membership.create({
        data: {
          subscriptionId: subscription.id,
          purchaserUserId: args.purchaserUserId,
          periodStart,
          periodEnd,
          status: MembershipStatus.ACTIVE,
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

      if (subscription.kind === SubscriptionKind.FAMILY) {
        for (const covered of args.coveredStudents) {
          const batchId = covered.batchId!;
          await tx.batchEnrollment.upsert({
            where: {
              batchId_studentId: {
                batchId,
                studentId: covered.studentId,
              },
            },
            update: {},
            create: {
              batchId,
              studentId: covered.studentId,
            },
          });
        }
      }

      return membership;
    });
  }

  async renewManual(membershipId: string) {
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

    const periodStart = getNextPeriodStart(new Date(existing.periodEnd));
    const periodEnd = getPeriodEnd(
      periodStart,
      existing.subscription.billingCadence,
    );

    await this.prisma.membership.update({
      where: { id: membershipId },
      data: { status: MembershipStatus.EXPIRED },
    });

    const renewed = await this.prisma.membership.create({
      data: {
        subscriptionId: existing.subscriptionId,
        purchaserUserId: existing.purchaserUserId,
        periodStart,
        periodEnd,
        status: MembershipStatus.ACTIVE,
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

    await this.notifications.create({
      userId: existing.purchaserUserId,
      type: NotificationType.RENEWED,
      planName: existing.subscription.name,
      periodEnd: periodEnd.toISOString().slice(0, 10),
      dedupeKey: `RENEWED:${renewed.id}`,
      meta: {
        membershipId: renewed.id,
        subscriptionId: existing.subscriptionId,
      },
      entityType: "membership",
      entityId: renewed.id,
    });

    return renewed;
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

  private async assertFamilyBatchPicks(covered: CoveredStudentInput[]) {
    for (const seat of covered) {
      if (!seat.batchId) {
        throw new BadRequestException(
          "Each Family Pack seat requires a batch pick",
        );
      }
    }

    const batchIds = covered.map((c) => c.batchId!);
    const batches = await this.prisma.batch.findMany({
      where: { id: { in: batchIds } },
      include: {
        _count: { select: { enrollments: true } },
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

    for (const [batchId, pending] of pendingByBatch) {
      const batch = byId.get(batchId)!;
      if (batch._count.enrollments + pending > batch.capacity) {
        throw new BadRequestException(
          `Batch ${batch.name} does not have enough open seats`,
        );
      }
    }
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
