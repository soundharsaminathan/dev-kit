import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  IndividualAudience,
  MembershipSeatRole,
  MembershipStatus,
  NotificationType,
  SubscriptionKind,
} from "@prisma/client";
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
};

@Injectable()
export class MembershipsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(NotificationsService)
    private readonly notifications: NotificationsService,
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

    const periodStart = getNextPeriodStart();
    const periodEnd = getPeriodEnd(periodStart, subscription.billingCadence);

    return this.prisma.membership.create({
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
