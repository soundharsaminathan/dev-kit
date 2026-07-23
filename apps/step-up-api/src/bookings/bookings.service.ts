import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
} from "@nestjs/common";
import {
  BookingStatus,
  BookingType,
  InvoiceStatus,
  MembershipStatus,
  SessionStatus,
} from "@prisma/client";
import { ScheduleConflictService } from "../calendar/schedule-conflict.service";
import { MembershipsService } from "../memberships/memberships.service";
import { PrismaService } from "../prisma/prisma.service";
import { UserCryptoService, userPiiSelect } from "../users/user-crypto.service";

export type UpdateBookingStatusInput = {
  status: BookingStatus;
  sessionId?: string;
  startsAt?: string;
  endsAt?: string;
  trainerId?: string;
};

@Injectable()
export class BookingsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(MembershipsService)
    private readonly memberships: MembershipsService,
    @Inject(UserCryptoService) private readonly crypto: UserCryptoService,
    @Inject(ScheduleConflictService)
    private readonly scheduleConflicts: ScheduleConflictService,
  ) {}

  listForStudent(studentId: string) {
    return this.prisma.booking.findMany({
      where: { studentId },
      orderBy: { id: "desc" },
      include: {
        batch: {
          select: { id: true, name: true },
        },
      },
    });
  }

  async listForStudio(studioId: string) {
    const bookings = await this.prisma.booking.findMany({
      where: { studioId },
      orderBy: { id: "desc" },
      include: {
        student: {
          select: { id: true, ...userPiiSelect },
        },
        batch: {
          select: {
            id: true,
            name: true,
            trainers: { select: { trainerId: true } },
          },
        },
      },
    });

    return bookings.map((booking) => ({
      ...booking,
      student: this.crypto.decryptUser(booking.student),
    }));
  }

  async create(data: {
    studioId: string;
    studentId: string;
    type: BookingType;
    batchId?: string;
    sessionId?: string;
    trainerId?: string;
    notes?: string;
    startsAt?: string;
    endsAt?: string;
  }) {
    const overdue = await this.prisma.invoice.findFirst({
      where: {
        studentId: data.studentId,
        status: InvoiceStatus.OVERDUE,
      },
    });

    if (overdue && data.type !== BookingType.TRIAL) {
      throw new ForbiddenException(
        "Bookings are frozen while the student has an overdue invoice",
      );
    }

    if (data.batchId) {
      const batch = await this.prisma.batch.findUnique({
        where: { id: data.batchId },
        include: {
          _count: { select: { enrollments: true } },
        },
      });
      if (!batch || batch.studioId !== data.studioId) {
        throw new BadRequestException("Select a batch from this studio");
      }
      if (
        data.type !== BookingType.PRIVATE &&
        batch._count.enrollments >= batch.capacity
      ) {
        throw new BadRequestException("Batch is at capacity");
      }

      const existingOpen = await this.prisma.booking.findFirst({
        where: {
          batchId: data.batchId,
          studentId: data.studentId,
          status: {
            in: [BookingStatus.PENDING, BookingStatus.CONFIRMED],
          },
        },
        select: { id: true, status: true },
      });
      if (existingOpen) {
        throw new ConflictException(
          existingOpen.status === BookingStatus.PENDING
            ? "You already have a booking request waiting for studio approval"
            : "You already have a confirmed booking for this class",
        );
      }
    }

    if (data.startsAt && data.endsAt) {
      this.assertValidRange(data.startsAt, data.endsAt);
    }

    if (data.type === BookingType.TRIAL) {
      await this.assertBookingScheduleConflicts(data);
      return this.prisma.booking.create({
        data: {
          studioId: data.studioId,
          studentId: data.studentId,
          type: data.type,
          batchId: data.batchId,
          sessionId: data.sessionId,
          trainerId: data.trainerId,
          notes: data.notes,
          startsAt: data.startsAt ? new Date(data.startsAt) : undefined,
          endsAt: data.endsAt ? new Date(data.endsAt) : undefined,
          status: BookingStatus.PENDING,
        },
      });
    }

    const activeMembership = await this.prisma.membership.findFirst({
      where: {
        status: MembershipStatus.ACTIVE,
        periodEnd: { gte: new Date() },
        coveredStudents: { some: { studentId: data.studentId } },
      },
    });

    if (!activeMembership) {
      throw new BadRequestException(
        "An active membership is required for this booking",
      );
    }

    if (data.sessionId) {
      const session = await this.prisma.session.findUnique({
        where: { id: data.sessionId },
      });

      if (!session) {
        throw new BadRequestException("Session not found");
      }

      const covers = await this.memberships.findActiveForBatch(
        data.studentId,
        session.batchId,
      );

      if (!covers) {
        throw new BadRequestException(
          "Active membership does not cover this session batch",
        );
      }
    }

    await this.assertBookingScheduleConflicts(data);

    return this.prisma.booking.create({
      data: {
        studioId: data.studioId,
        studentId: data.studentId,
        type: data.type,
        batchId: data.batchId,
        sessionId: data.sessionId,
        trainerId: data.trainerId,
        notes: data.notes,
        startsAt: data.startsAt ? new Date(data.startsAt) : undefined,
        endsAt: data.endsAt ? new Date(data.endsAt) : undefined,
        status: BookingStatus.PENDING,
      },
    });
  }

  async updateStatus(id: string, input: UpdateBookingStatusInput) {
    const { status, sessionId, startsAt, endsAt, trainerId } = input;

    if (startsAt && endsAt) {
      this.assertValidRange(startsAt, endsAt);
    } else if (startsAt || endsAt) {
      throw new BadRequestException("Both startsAt and endsAt are required");
    }

    if (sessionId) {
      const session = await this.prisma.session.findUnique({
        where: { id: sessionId },
      });
      if (!session) {
        throw new BadRequestException("Session not found");
      }
    }

    const existing = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        session: {
          include: {
            batch: {
              include: {
                trainers: { select: { trainerId: true } },
              },
            },
          },
        },
        batch: {
          include: {
            trainers: { select: { trainerId: true } },
          },
        },
      },
    });
    if (!existing) {
      throw new BadRequestException("Booking not found");
    }

    const nextStatus = status;
    const schedulingTouched =
      sessionId !== undefined ||
      trainerId !== undefined ||
      (startsAt !== undefined && endsAt !== undefined);
    const becomingConfirmed =
      nextStatus === BookingStatus.CONFIRMED &&
      existing.status !== BookingStatus.CONFIRMED;

    if (becomingConfirmed || schedulingTouched) {
      await this.assertBookingScheduleConflicts({
        studentId: existing.studentId,
        batchId: existing.batchId ?? undefined,
        sessionId: sessionId ?? existing.sessionId ?? undefined,
        trainerId: trainerId ?? existing.trainerId ?? undefined,
        startsAt: startsAt ?? existing.startsAt?.toISOString(),
        endsAt: endsAt ?? existing.endsAt?.toISOString(),
        excludeBookingIds: [id],
      });
    }

    return this.prisma.booking.update({
      where: { id },
      data: {
        status,
        ...(sessionId !== undefined ? { sessionId } : {}),
        ...(trainerId !== undefined ? { trainerId } : {}),
        ...(startsAt && endsAt
          ? {
              startsAt: new Date(startsAt),
              endsAt: new Date(endsAt),
            }
          : {}),
      },
    });
  }

  private async assertBookingScheduleConflicts(data: {
    studentId: string;
    batchId?: string;
    sessionId?: string;
    trainerId?: string;
    startsAt?: string;
    endsAt?: string;
    excludeBookingIds?: string[];
  }) {
    if (data.sessionId) {
      const session = await this.prisma.session.findUnique({
        where: { id: data.sessionId },
        include: {
          batch: {
            include: {
              trainers: { select: { trainerId: true } },
            },
          },
        },
      });
      if (!session || session.status === SessionStatus.CANCELLED) {
        throw new BadRequestException("Session not found");
      }

      const trainerIds = [
        ...new Set([
          ...(data.trainerId ? [data.trainerId] : []),
          ...session.batch.trainers.map((trainer) => trainer.trainerId),
        ]),
      ];

      await this.scheduleConflicts.assertNoConflicts({
        intervals: [{ startsAt: session.startsAt, endsAt: session.endsAt }],
        studentIds: [data.studentId],
        trainerIds,
        branchId: session.batch.branchId,
        excludeSessionIds: [session.id],
        excludeBookingIds: data.excludeBookingIds,
      });
      return;
    }

    if (data.startsAt && data.endsAt) {
      const startsAt = new Date(data.startsAt);
      const endsAt = new Date(data.endsAt);
      let branchId: string | undefined;
      const trainerIds = [...(data.trainerId ? [data.trainerId] : [])];

      if (data.batchId) {
        const batch = await this.prisma.batch.findUnique({
          where: { id: data.batchId },
          include: { trainers: { select: { trainerId: true } } },
        });
        if (batch) {
          branchId = batch.branchId;
          for (const trainer of batch.trainers) {
            if (!trainerIds.includes(trainer.trainerId)) {
              trainerIds.push(trainer.trainerId);
            }
          }
        }
      }

      await this.scheduleConflicts.assertNoConflicts({
        intervals: [{ startsAt, endsAt }],
        studentIds: [data.studentId],
        trainerIds,
        branchId,
        excludeBookingIds: data.excludeBookingIds,
      });
      return;
    }

    if (data.batchId) {
      await this.scheduleConflicts.assertStudentAvailableForBatch(
        data.studentId,
        data.batchId,
      );
    }
  }

  private assertValidRange(startsAt: string, endsAt: string) {
    const start = new Date(startsAt);
    const end = new Date(endsAt);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new BadRequestException("Invalid startsAt or endsAt");
    }
    if (end <= start) {
      throw new BadRequestException("endsAt must be after startsAt");
    }
  }
}
