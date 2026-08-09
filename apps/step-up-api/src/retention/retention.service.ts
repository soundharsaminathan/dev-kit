import { Inject, Injectable } from "@nestjs/common";
import { AttendanceStatus, MembershipStatus } from "@prisma/client";
import {
  accumulatePaidMonths,
  paidMonthsInvoiceSelect,
  paidMonthsInvoiceWhere,
} from "../billing/family-combine";
import { PrismaService } from "../prisma/prisma.service";
import { UserCryptoService } from "../users/user-crypto.service";

@Injectable()
export class RetentionService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(UserCryptoService) private readonly crypto: UserCryptoService,
  ) {}

  private async paidMonthsByStudentIds(
    studioId: string,
    studentIds: string[],
  ): Promise<Map<string, number>> {
    if (studentIds.length === 0) return new Map();

    const paidInvoices = await this.prisma.invoice.findMany({
      where: paidMonthsInvoiceWhere(studioId, studentIds),
      select: paidMonthsInvoiceSelect,
    });

    return accumulatePaidMonths(paidInvoices, {
      onlyStudentIds: new Set(studentIds),
    });
  }

  async getBatchStats(batchId: string) {
    const batch = await this.prisma.batch.findUnique({
      where: { id: batchId },
      select: { studioId: true },
    });

    const enrollments = await this.prisma.batchEnrollment.findMany({
      where: { batchId, status: "ACTIVE" },
      include: {
        student: {
          include: {
            membershipSeats: {
              include: {
                membership: true,
              },
            },
            bookings: { where: { session: { batchId } } },
          },
        },
      },
    });

    const students = enrollments.map((enrollment) => {
      const memberships = enrollment.student.membershipSeats
        .map((seat) => seat.membership)
        .filter((membership) =>
          [
            MembershipStatus.ACTIVE,
            MembershipStatus.DUE,
            MembershipStatus.EXPIRED,
          ].includes(membership.status),
        )
        .sort(
          (a, b) =>
            new Date(b.periodEnd).getTime() - new Date(a.periodEnd).getTime(),
        );

      return {
        ...enrollment.student,
        memberships,
      };
    });

    const renewedCount = students.filter((student) =>
      student.memberships.some(
        (membership, index) =>
          index > 0 && membership.status === MembershipStatus.ACTIVE,
      ),
    ).length;

    const atRiskCount = students.filter((student) => {
      const latest = student.memberships[0];
      return (
        !latest ||
        latest.status === MembershipStatus.EXPIRED ||
        latest.status === MembershipStatus.DUE
      );
    }).length;

    const absentees = await this.prisma.attendance.findMany({
      where: {
        session: { batchId },
        status: AttendanceStatus.ABSENT,
      },
      include: { student: true, session: true },
      orderBy: { session: { startsAt: "desc" } },
      take: 50,
    });

    const absenteeStudentIds = [
      ...new Set(absentees.map((record) => record.studentId)),
    ];
    const paidMonthsByStudent = batch
      ? await this.paidMonthsByStudentIds(batch.studioId, absenteeStudentIds)
      : new Map<string, number>();

    return {
      batchId,
      enrolledCount: students.length,
      renewedCount,
      renewalRatePercent:
        students.length === 0
          ? 0
          : Math.round((renewedCount / students.length) * 100),
      atRiskCount,
      absenteeList: absentees.map((record) => {
        const student = this.crypto.decryptUser(record.student);
        return {
          studentId: record.studentId,
          studentName: student.name,
          paidMonths: paidMonthsByStudent.get(record.studentId) ?? 0,
          sessionId: record.sessionId,
          sessionStartsAt: record.session.startsAt,
        };
      }),
    };
  }

  async getTrainerStats(trainerId: string, studioId: string) {
    const bookings = await this.prisma.booking.findMany({
      where: { trainerId, studioId },
      include: { student: true },
    });

    const completed = bookings.filter(
      (booking) => booking.status === "COMPLETED",
    );
    const cancelled = bookings.filter(
      (booking) => booking.status === "CANCELLED",
    );

    const recent = bookings.slice(0, 10);
    const paidMonthsByStudent = await this.paidMonthsByStudentIds(
      studioId,
      [...new Set(recent.map((booking) => booking.studentId))],
    );

    return {
      trainerId,
      studioId,
      totalBookings: bookings.length,
      completedCount: completed.length,
      cancelledCount: cancelled.length,
      completionRate:
        bookings.length === 0
          ? 0
          : Math.round((completed.length / bookings.length) * 100),
      recentStudents: recent.map((booking) => {
        const student = this.crypto.decryptUser(booking.student);
        return {
          studentId: booking.studentId,
          studentName: student.name,
          paidMonths: paidMonthsByStudent.get(booking.studentId) ?? 0,
          status: booking.status,
        };
      }),
    };
  }
}
