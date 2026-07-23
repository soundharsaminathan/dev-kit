import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  BookingStatus,
  BookingType,
  InvoiceStatus,
  MembershipStatus,
  SessionStatus,
  UserRole,
} from "@prisma/client";
import {
  assertBatchHasSeat,
  expireStalePaymentHolds,
  lockBatchRow,
  paymentHoldExpiresAt,
} from "../batches/batch-capacity";
import { ScheduleConflictService } from "../calendar/schedule-conflict.service";
import { MembershipsService } from "../memberships/memberships.service";
import { PrismaService } from "../prisma/prisma.service";
import {
  type DecryptedUser,
  UserCryptoService,
  userPiiSelect,
} from "../users/user-crypto.service";

export type UpdateBookingStatusInput = {
  status: BookingStatus;
  sessionId?: string;
  startsAt?: string;
  endsAt?: string;
  trainerId?: string;
};

export type CreateBookingOptions = {
  requirePayment?: boolean;
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

  async listForStudent(studentId: string) {
    await this.prisma.$transaction(async (tx) => {
      await expireStalePaymentHolds(tx);
    });

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
    await this.prisma.$transaction(async (tx) => {
      await expireStalePaymentHolds(tx);
    });

    const bookings = await this.prisma.booking.findMany({
      where: {
        studioId,
        status: { not: BookingStatus.AWAITING_PAYMENT },
      },
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

  async getById(id: string, actor: DecryptedUser) {
    await this.prisma.$transaction(async (tx) => {
      await expireStalePaymentHolds(tx);
    });

    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        batch: {
          select: { id: true, name: true },
        },
      },
    });
    if (!booking) {
      throw new NotFoundException("Booking not found");
    }

    await this.assertCanAccessBooking(booking.studentId, actor);
    return booking;
  }

  async create(
    data: {
      studioId: string;
      studentId: string;
      type: BookingType;
      batchId?: string;
      sessionId?: string;
      trainerId?: string;
      notes?: string;
      startsAt?: string;
      endsAt?: string;
    },
    options: CreateBookingOptions = {},
  ) {
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

    if (data.startsAt && data.endsAt) {
      this.assertValidRange(data.startsAt, data.endsAt);
    }

    if (data.type !== BookingType.TRIAL) {
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
    }

    await this.assertBookingScheduleConflicts(data);

    const requirePayment = options.requirePayment === true;
    const status = requirePayment
      ? BookingStatus.AWAITING_PAYMENT
      : BookingStatus.PENDING;
    const holdExpiresAt = requirePayment ? paymentHoldExpiresAt() : null;

    return this.prisma.$transaction(async (tx) => {
      if (data.batchId) {
        await lockBatchRow(tx, data.batchId);
        await expireStalePaymentHolds(tx, data.batchId);

        const batch = await tx.batch.findUnique({
          where: { id: data.batchId },
          select: { id: true, studioId: true, capacity: true },
        });
        if (!batch || batch.studioId !== data.studioId) {
          throw new BadRequestException("Select a batch from this studio");
        }

        if (data.type !== BookingType.PRIVATE) {
          await assertBatchHasSeat(
            tx,
            data.batchId,
            batch.capacity,
            data.studentId,
          );
        }

        const existingOpen = await tx.booking.findFirst({
          where: {
            batchId: data.batchId,
            studentId: data.studentId,
            OR: [
              {
                status: {
                  in: [BookingStatus.PENDING, BookingStatus.CONFIRMED],
                },
              },
              {
                status: BookingStatus.AWAITING_PAYMENT,
                paymentHoldExpiresAt: { gt: new Date() },
              },
            ],
          },
          select: { id: true, status: true },
        });
        if (existingOpen) {
          throw new ConflictException(
            existingOpen.status === BookingStatus.AWAITING_PAYMENT
              ? "Complete payment for your existing booking hold first"
              : existingOpen.status === BookingStatus.PENDING
                ? "You already have a booking request waiting for studio approval"
                : "You already have a confirmed booking for this class",
          );
        }
      }

      return tx.booking.create({
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
          status,
          paymentHoldExpiresAt: holdExpiresAt,
        },
        include: {
          batch: { select: { id: true, name: true } },
        },
      });
    });
  }

  async confirmPayment(id: string, actor: DecryptedUser) {
    return this.prisma.$transaction(async (tx) => {
      await expireStalePaymentHolds(tx);

      const booking = await tx.booking.findUnique({ where: { id } });
      if (!booking) {
        throw new NotFoundException("Booking not found");
      }

      await this.assertCanAccessBooking(booking.studentId, actor);

      if (booking.status === BookingStatus.PENDING) {
        return booking;
      }

      if (booking.status !== BookingStatus.AWAITING_PAYMENT) {
        throw new BadRequestException("Booking is not awaiting payment");
      }

      if (
        !booking.paymentHoldExpiresAt ||
        booking.paymentHoldExpiresAt.getTime() <= Date.now()
      ) {
        await tx.booking.update({
          where: { id },
          data: {
            status: BookingStatus.CANCELLED,
            paymentHoldExpiresAt: null,
          },
        });
        throw new BadRequestException(
          "Payment window expired. Please book again.",
        );
      }

      if (booking.batchId && booking.type !== BookingType.PRIVATE) {
        await lockBatchRow(tx, booking.batchId);
        const batch = await tx.batch.findUnique({
          where: { id: booking.batchId },
          select: { capacity: true },
        });
        if (!batch) {
          throw new BadRequestException("Batch not found");
        }
        await assertBatchHasSeat(
          tx,
          booking.batchId,
          batch.capacity,
          booking.studentId,
        );
      }

      return tx.booking.update({
        where: { id },
        data: {
          status: BookingStatus.PENDING,
          paymentHoldExpiresAt: null,
        },
        include: {
          batch: { select: { id: true, name: true } },
        },
      });
    });
  }

  async abandonPayment(id: string, actor: DecryptedUser) {
    return this.prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({ where: { id } });
      if (!booking) {
        throw new NotFoundException("Booking not found");
      }

      await this.assertCanAccessBooking(booking.studentId, actor);

      if (booking.status !== BookingStatus.AWAITING_PAYMENT) {
        return booking;
      }

      return tx.booking.update({
        where: { id },
        data: {
          status: BookingStatus.CANCELLED,
          paymentHoldExpiresAt: null,
        },
        include: {
          batch: { select: { id: true, name: true } },
        },
      });
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

    if (existing.status === BookingStatus.AWAITING_PAYMENT) {
      throw new BadRequestException(
        "Cannot review a booking that is still awaiting payment",
      );
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

    if (
      becomingConfirmed &&
      existing.batchId &&
      existing.type !== BookingType.PRIVATE
    ) {
      return this.prisma.$transaction(async (tx) => {
        await lockBatchRow(tx, existing.batchId!);
        const batch = await tx.batch.findUnique({
          where: { id: existing.batchId! },
          select: { capacity: true },
        });
        if (!batch) {
          throw new BadRequestException("Batch not found");
        }
        await assertBatchHasSeat(
          tx,
          existing.batchId!,
          batch.capacity,
          existing.studentId,
        );

        return tx.booking.update({
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

  private async assertCanAccessBooking(
    studentId: string,
    actor: DecryptedUser,
  ) {
    const staffRoles: UserRole[] = [
      UserRole.OWNER,
      UserRole.STAFF,
      UserRole.TRAINER,
    ];
    if (staffRoles.includes(actor.role) || actor.id === studentId) {
      return;
    }

    const [familyLink, parentLink] = await Promise.all([
      this.prisma.familyMember.findUnique({
        where: {
          ownerUserId_memberUserId: {
            ownerUserId: actor.id,
            memberUserId: studentId,
          },
        },
      }),
      this.prisma.parentChild.findUnique({
        where: {
          parentUserId_childUserId: {
            parentUserId: actor.id,
            childUserId: studentId,
          },
        },
      }),
    ]);

    if (!familyLink && !parentLink) {
      throw new ForbiddenException("Not allowed to access this booking");
    }
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
