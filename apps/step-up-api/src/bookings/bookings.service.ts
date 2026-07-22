import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
} from "@nestjs/common";
import { BookingStatus, BookingType, InvoiceStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { SubscriptionsService } from "../subscriptions/subscriptions.service";
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
    @Inject(SubscriptionsService)
    private readonly subscriptions: SubscriptionsService,
    @Inject(UserCryptoService) private readonly crypto: UserCryptoService,
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

    const activeSubscription = await this.prisma.subscription.findFirst({
      where: {
        studentId: data.studentId,
        status: "ACTIVE",
        periodEnd: { gte: new Date() },
      },
      include: { plan: true },
    });

    if (!activeSubscription) {
      throw new BadRequestException(
        "An active plan is required for this booking",
      );
    }

    if (data.sessionId) {
      const session = await this.prisma.session.findUnique({
        where: { id: data.sessionId },
      });

      if (!session) {
        throw new BadRequestException("Session not found");
      }

      const covers = await this.subscriptions.findActiveForBatch(
        data.studentId,
        session.batchId,
      );

      if (!covers) {
        throw new BadRequestException(
          "Active subscription does not cover this session batch",
        );
      }
    }

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
