import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
} from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import type { DecryptedUser } from "../users/user-crypto.service";
import {
  assertCalendarRange,
  buildCalendarEvents,
  buildUnscheduledBookings,
  type CalendarQueryInput,
} from "./calendar-query";

@Injectable()
export class CalendarService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async listEvents(
    user: DecryptedUser,
    raw: {
      from: string;
      to: string;
      studioId?: string;
      branchId?: string;
      trainerId?: string;
      studentId?: string;
    },
  ) {
    const query = this.resolveQuery(user, raw);
    assertCalendarRangeSafe(query.from, query.to);

    const sessions = await this.prisma.session.findMany({
      where: {
        startsAt: { lt: query.to },
        endsAt: { gt: query.from },
        ...(query.studioId ||
        query.branchId ||
        query.trainerId ||
        query.studentId
          ? {
              batch: {
                ...(query.studioId ? { studioId: query.studioId } : {}),
                ...(query.branchId ? { branchId: query.branchId } : {}),
                ...(query.trainerId
                  ? { trainers: { some: { trainerId: query.trainerId } } }
                  : {}),
                ...(query.studentId
                  ? {
                      enrollments: {
                        some: { studentId: query.studentId },
                      },
                    }
                  : {}),
              },
            }
          : {}),
      },
      include: {
        batch: {
          include: {
            branch: { select: { id: true, name: true } },
            trainers: { select: { trainerId: true } },
            enrollments: { select: { studentId: true } },
          },
        },
      },
      orderBy: { startsAt: "asc" },
    });

    const bookings = await this.prisma.booking.findMany({
      where: {
        status: "CONFIRMED",
        ...(query.studioId ? { studioId: query.studioId } : {}),
        ...(query.studentId ? { studentId: query.studentId } : {}),
        ...(query.trainerId ? { trainerId: query.trainerId } : {}),
        OR: query.branchId
          ? [
              {
                sessionId: { not: null },
                session: {
                  startsAt: { lt: query.to },
                  endsAt: { gt: query.from },
                  batch: { branchId: query.branchId },
                },
              },
            ]
          : [
              {
                sessionId: { not: null },
                session: {
                  startsAt: { lt: query.to },
                  endsAt: { gt: query.from },
                },
              },
              {
                sessionId: null,
                startsAt: { not: null, lt: query.to },
                endsAt: { not: null, gt: query.from },
              },
            ],
      },
      include: {
        session: {
          include: {
            batch: {
              include: {
                branch: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });

    return buildCalendarEvents(sessions, bookings, query);
  }

  async listUnscheduled(
    user: DecryptedUser,
    raw: {
      studioId?: string;
      branchId?: string;
      trainerId?: string;
      studentId?: string;
    },
  ) {
    const query = this.resolveQuery(user, {
      from: new Date(0).toISOString(),
      to: new Date("9999-12-31").toISOString(),
      ...raw,
    });

    if (query.branchId) {
      return [];
    }

    const bookings = await this.prisma.booking.findMany({
      where: {
        status: "CONFIRMED",
        sessionId: null,
        startsAt: null,
        endsAt: null,
        ...(query.studioId ? { studioId: query.studioId } : {}),
        ...(query.studentId ? { studentId: query.studentId } : {}),
        ...(query.trainerId ? { trainerId: query.trainerId } : {}),
      },
      include: {
        session: {
          include: {
            batch: {
              include: {
                branch: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });

    return buildUnscheduledBookings(bookings, query);
  }

  private resolveQuery(
    user: DecryptedUser,
    raw: {
      from: string;
      to: string;
      studioId?: string;
      branchId?: string;
      trainerId?: string;
      studentId?: string;
    },
  ): CalendarQueryInput {
    const from = new Date(raw.from);
    const to = new Date(raw.to);
    const isStaff =
      user.role === UserRole.OWNER || user.role === UserRole.STAFF;

    let studentId = raw.studentId;
    let trainerId = raw.trainerId;

    if (studentId && !isStaff && studentId !== user.id) {
      throw new ForbiddenException("Cannot view another student's calendar");
    }
    if (trainerId && !isStaff && trainerId !== user.id) {
      throw new ForbiddenException("Cannot view another trainer's calendar");
    }

    if (!isStaff && user.role === UserRole.STUDENT) {
      studentId = user.id;
      trainerId = undefined;
    }
    if (!isStaff && user.role === UserRole.TRAINER) {
      trainerId = user.id;
      studentId = undefined;
    }
    if (user.role === UserRole.PARENT && !isStaff) {
      studentId = studentId ?? user.id;
      trainerId = undefined;
    }

    return {
      from,
      to,
      studioId: raw.studioId,
      branchId: raw.branchId,
      trainerId,
      studentId,
    };
  }
}

function assertCalendarRangeSafe(from: Date, to: Date) {
  try {
    assertCalendarRange(from, to);
  } catch (error) {
    throw new BadRequestException(
      error instanceof Error ? error.message : "Invalid date range",
    );
  }
}
