import { ConflictException, Inject, Injectable } from "@nestjs/common";
import { BookingStatus, type Prisma, SessionStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import {
  collapseWindow,
  conflictMessage,
  findScheduleConflict,
  type OccupancySlot,
  type TimeInterval,
} from "./schedule-conflict";

export type AssertNoConflictsInput = {
  intervals: TimeInterval[];
  trainerIds?: string[];
  studentIds?: string[];
  branchId?: string;
  excludeSessionIds?: string[];
  excludeBookingIds?: string[];
  excludeBatchId?: string;
  excludeBatchIds?: string[];
};

@Injectable()
export class ScheduleConflictService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async assertNoConflicts(input: AssertNoConflictsInput): Promise<void> {
    const intervals = input.intervals.filter(
      (interval) => interval.endsAt > interval.startsAt,
    );
    if (intervals.length === 0) {
      return;
    }

    const trainerIds = [...new Set(input.trainerIds ?? [])];
    const studentIds = [...new Set(input.studentIds ?? [])];
    const branchId = input.branchId;
    if (trainerIds.length === 0 && studentIds.length === 0 && !branchId) {
      return;
    }

    const window = collapseWindow(intervals);
    if (!window) {
      return;
    }

    const occupancy = await this.loadOccupancy({
      window,
      trainerIds,
      studentIds,
      branchId,
      excludeSessionIds: input.excludeSessionIds,
      excludeBookingIds: input.excludeBookingIds,
      excludeBatchIds: mergeExcludeBatchIds(
        input.excludeBatchId,
        input.excludeBatchIds,
      ),
    });

    const conflict = findScheduleConflict(intervals, occupancy, {
      trainerIds,
      studentIds,
      branchId,
    });
    if (conflict) {
      throw new ConflictException(conflictMessage(conflict));
    }
  }

  async assertStudentAvailableForBatch(
    studentId: string,
    batchId: string,
    options?: { from?: Date; excludeBatchIds?: string[] },
  ): Promise<void> {
    const from = options?.from ?? new Date();
    const sessions = await this.prisma.session.findMany({
      where: {
        batchId,
        status: { not: SessionStatus.CANCELLED },
        endsAt: { gt: from },
      },
      select: { startsAt: true, endsAt: true },
      orderBy: { startsAt: "asc" },
    });

    await this.assertNoConflicts({
      intervals: sessions,
      studentIds: [studentId],
      excludeBatchId: batchId,
      excludeBatchIds: options?.excludeBatchIds,
    });
  }

  private async loadOccupancy(args: {
    window: TimeInterval;
    trainerIds: string[];
    studentIds: string[];
    branchId?: string;
    excludeSessionIds?: string[];
    excludeBookingIds?: string[];
    excludeBatchIds?: string[];
  }): Promise<OccupancySlot[]> {
    const {
      window,
      trainerIds,
      studentIds,
      branchId,
      excludeSessionIds,
      excludeBookingIds,
      excludeBatchIds,
    } = args;
    const excludeBatchFilter =
      excludeBatchIds && excludeBatchIds.length > 0
        ? { batchId: { notIn: excludeBatchIds } }
        : {};

    const sessionPartyFilters: Prisma.SessionWhereInput[] = [];
    if (branchId) {
      sessionPartyFilters.push({ batch: { branchId } });
    }
    if (trainerIds.length > 0) {
      sessionPartyFilters.push({
        batch: { trainers: { some: { trainerId: { in: trainerIds } } } },
      });
    }
    if (studentIds.length > 0) {
      sessionPartyFilters.push({
        batch: {
          enrollments: {
            some: { studentId: { in: studentIds }, status: "ACTIVE" },
          },
        },
      });
    }

    const sessions = await this.prisma.session.findMany({
      where: {
        status: { not: SessionStatus.CANCELLED },
        startsAt: { lt: window.endsAt },
        endsAt: { gt: window.startsAt },
        ...excludeBatchFilter,
        ...(excludeSessionIds?.length
          ? { id: { notIn: excludeSessionIds } }
          : {}),
        OR: sessionPartyFilters,
      },
      select: {
        id: true,
        startsAt: true,
        endsAt: true,
        batch: {
          select: {
            branchId: true,
            trainers: { select: { trainerId: true } },
            enrollments: {
              where:
                studentIds.length > 0
                  ? { studentId: { in: studentIds }, status: "ACTIVE" }
                  : { status: "ACTIVE" },
              select: { studentId: true },
            },
          },
        },
      },
    });

    const bookingPartyFilters: Prisma.BookingWhereInput[] = [];
    if (trainerIds.length > 0) {
      bookingPartyFilters.push({ trainerId: { in: trainerIds } });
    }
    if (studentIds.length > 0) {
      bookingPartyFilters.push({ studentId: { in: studentIds } });
    }
    if (branchId) {
      bookingPartyFilters.push({
        OR: [{ session: { batch: { branchId } } }, { batch: { branchId } }],
      });
    }

    const bookings = await this.prisma.booking.findMany({
      where: {
        status: BookingStatus.CONFIRMED,
        ...(excludeBookingIds?.length
          ? { id: { notIn: excludeBookingIds } }
          : {}),
        ...(excludeSessionIds?.length
          ? {
              OR: [
                { sessionId: null },
                { sessionId: { notIn: excludeSessionIds } },
              ],
            }
          : {}),
        OR: bookingPartyFilters,
        AND: [
          {
            OR: [
              {
                sessionId: { not: null },
                session: {
                  status: { not: SessionStatus.CANCELLED },
                  startsAt: { lt: window.endsAt },
                  endsAt: { gt: window.startsAt },
                  ...excludeBatchFilter,
                  ...(excludeSessionIds?.length
                    ? { id: { notIn: excludeSessionIds } }
                    : {}),
                },
              },
              {
                sessionId: null,
                startsAt: { not: null, lt: window.endsAt },
                endsAt: { not: null, gt: window.startsAt },
              },
            ],
          },
        ],
      },
      select: {
        id: true,
        studentId: true,
        trainerId: true,
        startsAt: true,
        endsAt: true,
        session: {
          select: {
            startsAt: true,
            endsAt: true,
            batch: {
              select: {
                branchId: true,
                trainers: { select: { trainerId: true } },
              },
            },
          },
        },
        batch: {
          select: {
            branchId: true,
            trainers: { select: { trainerId: true } },
          },
        },
      },
    });

    const occupancy: OccupancySlot[] = sessions.map((session) => ({
      kind: "session" as const,
      id: session.id,
      startsAt: session.startsAt,
      endsAt: session.endsAt,
      trainerIds: session.batch.trainers.map((trainer) => trainer.trainerId),
      studentIds: session.batch.enrollments.map(
        (enrollment) => enrollment.studentId,
      ),
      branchId: session.batch.branchId,
    }));

    for (const booking of bookings) {
      const startsAt = booking.session?.startsAt ?? booking.startsAt;
      const endsAt = booking.session?.endsAt ?? booking.endsAt;
      if (!startsAt || !endsAt) {
        continue;
      }

      const trainerIdsForSlot = new Set<string>();
      if (booking.trainerId) {
        trainerIdsForSlot.add(booking.trainerId);
      }
      for (const trainer of booking.session?.batch.trainers ?? []) {
        trainerIdsForSlot.add(trainer.trainerId);
      }
      for (const trainer of booking.batch?.trainers ?? []) {
        trainerIdsForSlot.add(trainer.trainerId);
      }

      occupancy.push({
        kind: "booking",
        id: booking.id,
        startsAt,
        endsAt,
        trainerIds: [...trainerIdsForSlot],
        studentIds: [booking.studentId],
        branchId:
          booking.session?.batch.branchId ?? booking.batch?.branchId ?? null,
      });
    }

    return occupancy;
  }
}

function mergeExcludeBatchIds(
  excludeBatchId?: string,
  excludeBatchIds?: string[],
): string[] | undefined {
  const ids = [
    ...(excludeBatchId ? [excludeBatchId] : []),
    ...(excludeBatchIds ?? []),
  ];
  if (ids.length === 0) {
    return undefined;
  }
  return [...new Set(ids)];
}
