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
  NotificationType,
  UserRole,
} from "@prisma/client";
import { MembershipsService } from "../memberships/memberships.service";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import { UserCryptoService } from "../users/user-crypto.service";

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
        batch: {
          include: {
            enrollments: {
              include: { student: true },
              orderBy: { studentId: "asc" },
            },
          },
        },
        attendance: true,
      },
    });

    if (!session) {
      throw new BadRequestException("Session not found");
    }

    const attendanceByStudent = new Map(
      session.attendance.map((record) => [record.studentId, record]),
    );

    const roster = session.batch.enrollments.map((enrollment) => {
      const record = attendanceByStudent.get(enrollment.studentId);
      return {
        studentId: enrollment.studentId,
        student: this.crypto.decryptUser(enrollment.student),
        attendance: record
          ? {
              id: record.id,
              status: record.status,
              source: record.source,
            }
          : null,
      };
    });

    roster.sort((left, right) =>
      left.student.name.localeCompare(right.student.name),
    );

    return roster;
  }

  async markAllPresent(sessionId: string, markedById: string) {
    const roster = await this.getSessionRoster(sessionId);
    const unmarked = roster.filter((entry) => !entry.attendance);

    if (unmarked.length === 0) {
      return { marked: 0, failed: 0 };
    }

    const results = await Promise.allSettled(
      unmarked.map((entry) =>
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

    const membership = await this.memberships.findActiveForBatch(
      data.studentId,
      session.batchId,
      session.startsAt,
    );

    if (!membership) {
      throw new BadRequestException("No active membership covering this batch");
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

    const windowStartMs = session.startsAt.getTime() - 15 * 60 * 1000;
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
