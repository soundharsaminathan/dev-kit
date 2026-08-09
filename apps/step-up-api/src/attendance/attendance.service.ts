import { createHmac, timingSafeEqual } from "node:crypto";
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  AttendanceSource,
  AttendanceStatus,
  BillingCadence,
  BookingStatus,
  BookingType,
  InvoiceStatus,
  NotificationType,
  SessionStatus,
  UserRole,
} from "@prisma/client";
import { enrollmentVisibleAtSession } from "../batches/enrollment-status";
import { MembershipsService } from "../memberships/memberships.service";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import { UserCryptoService } from "../users/user-crypto.service";

const OPEN_TRIAL_STATUSES: BookingStatus[] = [
  BookingStatus.PENDING,
  BookingStatus.CONFIRMED,
];

/** Matches QR check-in: attendance can be marked from 15 minutes before start. */
const ATTENDANCE_EARLY_WINDOW_MS = 15 * 60 * 1000;

@Injectable()
export class AttendanceService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(MembershipsService)
    private readonly memberships: MembershipsService,
    @Inject(NotificationsService)
    private readonly notifications: NotificationsService,
    @Inject(ConfigService) private readonly config: ConfigService,
    @Inject(UserCryptoService) private readonly crypto: UserCryptoService,
  ) {}

  async listBySession(sessionId: string) {
    const records = await this.prisma.attendance.findMany({
      where: { sessionId },
      include: { student: true, markedBy: true },
    });

    return records.map((record) => ({
      ...record,
      student: this.crypto.decryptUser(record.student),
      markedBy: record.markedBy
        ? this.crypto.decryptUser(record.markedBy)
        : record.markedBy,
    }));
  }

  async getSessionRoster(sessionId: string) {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        batch: true,
        attendance: true,
      },
    });

    if (!session) {
      throw new BadRequestException("Session not found");
    }

    const enrollments = await this.prisma.batchEnrollment.findMany({
      where: {
        batchId: session.batchId,
        ...enrollmentVisibleAtSession(session.startsAt),
      },
      include: { student: true },
      orderBy: { studentId: "asc" },
    });

    const trialBookings = await this.prisma.booking.findMany({
      where: {
        sessionId,
        type: BookingType.TRIAL,
        status: { in: OPEN_TRIAL_STATUSES },
      },
      include: { student: true },
    });

    const attendanceByStudent = new Map(
      session.attendance.map((record) => [record.studentId, record]),
    );

    const enrolledIds = new Set(
      enrollments.map((enrollment) => enrollment.studentId),
    );
    const trialByStudent = new Map(
      trialBookings.map((booking) => [booking.studentId, booking]),
    );

    const monthlyUnpaidIds = await this.memberships.findMonthlyUnpaidStudentIds(
      enrollments.map((enrollment) => enrollment.studentId),
    );

    const roster: Array<{
      studentId: string;
      isTrial: boolean;
      trialBookingStatus: BookingStatus | null;
      monthlyUnpaid: boolean;
      paidMonths: number;
      student: ReturnType<UserCryptoService["decryptUser"]>;
      attendance: {
        id: string;
        status: AttendanceStatus;
        source: AttendanceSource;
      } | null;
    }> = [];

    for (const enrollment of enrollments) {
      const record = attendanceByStudent.get(enrollment.studentId);
      const trial = trialByStudent.get(enrollment.studentId);
      roster.push({
        studentId: enrollment.studentId,
        isTrial: Boolean(trial),
        trialBookingStatus: trial?.status ?? null,
        monthlyUnpaid: monthlyUnpaidIds.has(enrollment.studentId),
        paidMonths: 0,
        student: this.crypto.decryptUser(enrollment.student),
        attendance: record
          ? {
              id: record.id,
              status: record.status,
              source: record.source,
            }
          : null,
      });
    }

    for (const booking of trialBookings) {
      if (enrolledIds.has(booking.studentId)) continue;
      const record = attendanceByStudent.get(booking.studentId);
      roster.push({
        studentId: booking.studentId,
        isTrial: true,
        trialBookingStatus: booking.status,
        monthlyUnpaid: false,
        paidMonths: 0,
        student: this.crypto.decryptUser(booking.student),
        attendance: record
          ? {
              id: record.id,
              status: record.status,
              source: record.source,
            }
          : null,
      });
    }

    for (const record of session.attendance) {
      if (roster.some((entry) => entry.studentId === record.studentId)) {
        continue;
      }
      const student = await this.prisma.user.findUnique({
        where: { id: record.studentId },
      });
      if (!student) continue;
      roster.push({
        studentId: record.studentId,
        isTrial: true,
        trialBookingStatus: null,
        monthlyUnpaid: false,
        paidMonths: 0,
        student: this.crypto.decryptUser(student),
        attendance: {
          id: record.id,
          status: record.status,
          source: record.source,
        },
      });
    }

    const rosterStudentIds = roster.map((entry) => entry.studentId);
    const paidInvoices =
      rosterStudentIds.length === 0
        ? []
        : await this.prisma.invoice.findMany({
            where: {
              studioId: session.batch.studioId,
              studentId: { in: rosterStudentIds },
              status: InvoiceStatus.PAID,
            },
            select: {
              studentId: true,
              membership: {
                select: {
                  subscription: { select: { billingCadence: true } },
                },
              },
            },
          });
    const paidMonthsByStudent = new Map<string, number>();
    for (const invoice of paidInvoices) {
      const months =
        invoice.membership?.subscription.billingCadence ===
        BillingCadence.QUARTERLY
          ? 3
          : 1;
      paidMonthsByStudent.set(
        invoice.studentId,
        (paidMonthsByStudent.get(invoice.studentId) ?? 0) + months,
      );
    }
    for (const entry of roster) {
      entry.paidMonths = paidMonthsByStudent.get(entry.studentId) ?? 0;
    }

    roster.sort((left, right) => {
      if (left.isTrial !== right.isTrial) {
        return left.isTrial ? -1 : 1;
      }
      return left.student.name.localeCompare(right.student.name);
    });

    return roster;
  }

  async listTrialCandidates(sessionId: string, query?: string) {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: { batch: { select: { studioId: true } } },
    });
    if (!session) {
      throw new BadRequestException("Session not found");
    }

    const studioId = session.batch.studioId;
    const students = await this.prisma.user.findMany({
      where: { studioId, role: UserRole.STUDENT, active: true },
    });

    const trialBookings = await this.prisma.booking.findMany({
      where: {
        sessionId,
        type: BookingType.TRIAL,
        status: { in: OPEN_TRIAL_STATUSES },
      },
      select: { studentId: true, status: true },
    });
    const priorityByStudent = new Map(
      trialBookings.map((booking) => [booking.studentId, booking.status]),
    );

    const roster = await this.getSessionRoster(sessionId);
    const onRoster = new Set(roster.map((entry) => entry.studentId));

    const needle = query?.trim().toLowerCase() ?? "";
    const mapped = students
      .map((student) => {
        const decrypted = this.crypto.decryptUser(student);
        const bookingStatus = priorityByStudent.get(student.id);
        const priority =
          bookingStatus === BookingStatus.CONFIRMED
            ? 0
            : bookingStatus === BookingStatus.PENDING
              ? 1
              : 2;
        return {
          id: decrypted.id,
          name: decrypted.name,
          email: decrypted.email,
          phone: decrypted.phone,
          priority,
          trialBookingStatus: bookingStatus ?? null,
          alreadyOnRoster: onRoster.has(student.id),
        };
      })
      .filter((student) => {
        if (!needle) return true;
        const haystack =
          `${student.name} ${student.email ?? ""} ${student.phone ?? ""}`.toLowerCase();
        return haystack.includes(needle);
      })
      .sort((left, right) => {
        if (left.priority !== right.priority) {
          return left.priority - right.priority;
        }
        return left.name.localeCompare(right.name);
      })
      .slice(0, 50);

    return mapped;
  }

  async addTrialToSession(sessionId: string, studentId: string) {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        batch: { select: { id: true, studioId: true, active: true } },
      },
    });
    if (!session) {
      throw new BadRequestException("Session not found");
    }
    if (session.status === SessionStatus.CANCELLED) {
      throw new BadRequestException(
        "Cannot add a trial to a cancelled session",
      );
    }
    if (!session.batch.active) {
      throw new BadRequestException("Batch is not active");
    }

    const student = await this.prisma.user.findFirst({
      where: {
        id: studentId,
        studioId: session.batch.studioId,
        role: UserRole.STUDENT,
      },
    });
    if (!student) {
      throw new BadRequestException("Student not found in this studio");
    }

    const existing = await this.prisma.booking.findFirst({
      where: {
        sessionId,
        studentId,
        type: BookingType.TRIAL,
        status: { in: OPEN_TRIAL_STATUSES },
      },
    });

    if (existing) {
      if (existing.status === BookingStatus.PENDING) {
        await this.prisma.booking.update({
          where: { id: existing.id },
          data: { status: BookingStatus.CONFIRMED },
        });
      }
    } else {
      await this.prisma.booking.create({
        data: {
          studioId: session.batch.studioId,
          studentId,
          type: BookingType.TRIAL,
          batchId: session.batchId,
          sessionId,
          status: BookingStatus.CONFIRMED,
        },
      });
    }

    const roster = await this.getSessionRoster(sessionId);
    const entry = roster.find((row) => row.studentId === studentId);
    if (!entry) {
      throw new BadRequestException("Failed to add trial student to roster");
    }
    return entry;
  }

  async markAllPresent(sessionId: string, markedById: string) {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      select: { id: true, startsAt: true },
    });
    if (!session) {
      throw new BadRequestException("Session not found");
    }
    this.assertAttendanceWindowOpen(session.startsAt);

    const roster = await this.getSessionRoster(sessionId);
    const targets = roster.filter((entry) => {
      if (entry.attendance?.status === AttendanceStatus.PRESENT) {
        return false;
      }
      // Attendance-only orphans (no enrollment, no open trial) cannot be marked.
      if (entry.isTrial && entry.trialBookingStatus == null) {
        return false;
      }
      return true;
    });

    if (targets.length === 0) {
      return { marked: 0, failed: 0 };
    }

    const results = await Promise.allSettled(
      targets.map((entry) =>
        this.markAttendance({
          sessionId,
          studentId: entry.studentId,
          status: AttendanceStatus.PRESENT,
          markedById,
          source: AttendanceSource.TRAINER,
        }),
      ),
    );

    return {
      marked: results.filter((result) => result.status === "fulfilled").length,
      failed: results.filter((result) => result.status === "rejected").length,
    };
  }

  async markAttendance(data: {
    sessionId: string;
    studentId: string;
    status: AttendanceStatus;
    markedById: string;
    source: AttendanceSource;
  }) {
    const session = await this.prisma.session.findUnique({
      where: { id: data.sessionId },
      include: { batch: true },
    });

    if (!session) {
      throw new BadRequestException("Session not found");
    }

    this.assertAttendanceWindowOpen(session.startsAt);

    const membership = await this.memberships.findActiveForBatch(
      data.studentId,
      session.batchId,
      session.startsAt,
    );

    if (!membership) {
      const enrollment = await this.prisma.batchEnrollment.findFirst({
        where: {
          batchId: session.batchId,
          studentId: data.studentId,
          ...enrollmentVisibleAtSession(session.startsAt),
        },
        select: { id: true },
      });

      if (!enrollment) {
        const trialBooking = await this.prisma.booking.findFirst({
          where: {
            sessionId: data.sessionId,
            studentId: data.studentId,
            type: BookingType.TRIAL,
            status: {
              in: [
                BookingStatus.PENDING,
                BookingStatus.CONFIRMED,
                BookingStatus.COMPLETED,
              ],
            },
          },
          select: { id: true },
        });
        if (!trialBooking) {
          throw new BadRequestException(
            "Student is not enrolled or booked for this session",
          );
        }
      }
    }

    const attendance = await this.prisma.attendance.upsert({
      where: {
        sessionId_studentId: {
          sessionId: data.sessionId,
          studentId: data.studentId,
        },
      },
      update: {
        status: data.status,
        markedById: data.markedById,
        source: data.source,
      },
      create: data,
      include: { student: true },
    });

    if (data.status === AttendanceStatus.ABSENT) {
      await this.notifications.create({
        userId: data.studentId,
        type: NotificationType.MISSED_SESSION,
        batchName: session.batch.name,
        sessionDate: session.startsAt.toISOString().slice(0, 10),
        dedupeKey: `MISSED_SESSION:${data.sessionId}:${data.studentId}`,
        meta: { sessionId: data.sessionId, batchId: session.batchId },
        entityType: "session",
        entityId: data.sessionId,
      });
    }

    return {
      ...attendance,
      student: this.crypto.decryptUser(attendance.student),
    };
  }

  async createSessionQrToken(
    sessionId: string,
  ): Promise<{ token: string; expiresAt: string }> {
    const secret = this.config.get<string>("SESSION_QR_SECRET");
    if (!secret) {
      throw new BadRequestException("SESSION_QR_SECRET is not configured");
    }

    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
    });
    if (!session) {
      throw new BadRequestException("Session not found");
    }

    const windowStartMs =
      session.startsAt.getTime() - ATTENDANCE_EARLY_WINDOW_MS;
    const expiresAtMs = session.endsAt.getTime();
    const payload = `${sessionId}|${windowStartMs}|${expiresAtMs}`;
    const signature = createHmac("sha256", secret)
      .update(payload)
      .digest("hex");

    return {
      token: Buffer.from(`${payload}|${signature}`).toString("base64url"),
      expiresAt: session.endsAt.toISOString(),
    };
  }

  private assertAttendanceWindowOpen(startsAt: Date) {
    const opensAt = startsAt.getTime() - ATTENDANCE_EARLY_WINDOW_MS;
    if (Date.now() < opensAt) {
      throw new BadRequestException(
        "Cannot mark attendance before the session starts",
      );
    }
  }

  async verifyQrAndMark(
    token: string,
    callerId: string,
    callerRole: UserRole,
    childStudentId?: string,
  ) {
    let studentId = callerId;

    if (callerRole === UserRole.PARENT) {
      if (!childStudentId) {
        throw new BadRequestException(
          "Parent must provide studentId for QR check-in",
        );
      }
      const link = await this.prisma.parentChild.findUnique({
        where: {
          parentUserId_childUserId: {
            parentUserId: callerId,
            childUserId: childStudentId,
          },
        },
      });
      if (!link) {
        throw new ForbiddenException(
          "Student is not linked to this parent account",
        );
      }
      studentId = childStudentId;
    }
    const secret = this.config.get<string>("SESSION_QR_SECRET");
    if (!secret) {
      throw new UnauthorizedException("SESSION_QR_SECRET is not configured");
    }

    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const [sessionId, windowStartRaw, expiresAtRaw, signature] =
      decoded.split("|");

    if (!sessionId || !windowStartRaw || !expiresAtRaw || !signature) {
      throw new UnauthorizedException("Invalid QR token");
    }

    const payload = `${sessionId}|${windowStartRaw}|${expiresAtRaw}`;
    const expected = createHmac("sha256", secret).update(payload).digest("hex");

    const valid =
      signature.length === expected.length &&
      timingSafeEqual(Buffer.from(signature), Buffer.from(expected));

    if (!valid) {
      throw new UnauthorizedException("Invalid QR signature");
    }

    const now = Date.now();
    const windowStartMs = Number(windowStartRaw);
    const expiresAtMs = Number(expiresAtRaw);
    if (
      Number.isNaN(windowStartMs) ||
      Number.isNaN(expiresAtMs) ||
      now < windowStartMs ||
      now > expiresAtMs
    ) {
      throw new BadRequestException("QR check-in window is closed");
    }

    return this.markAttendance({
      sessionId,
      studentId,
      status: AttendanceStatus.PRESENT,
      markedById: studentId,
      source: AttendanceSource.QR,
    });
  }
}
