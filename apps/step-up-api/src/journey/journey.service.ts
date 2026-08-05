import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { UserRole } from "@prisma/client";
import {
  computeAttendanceStreak,
  computeSessionsCompleted,
} from "../home/home-stats";
import { PrismaService } from "../prisma/prisma.service";
import {
  type DecryptedUser,
  UserCryptoService,
} from "../users/user-crypto.service";
import {
  buildJourneyEvents,
  buildJourneyStats,
  computeLongestStreak,
  markCurrentAndUpcoming,
} from "./journey-events";
import type { JourneyPayload, JourneyTrainer } from "./journey-types";

@Injectable()
export class JourneyService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(UserCryptoService) private readonly crypto: UserCryptoService,
  ) {}

  private async resolveStudentId(actor: DecryptedUser, studentId?: string) {
    const targetId = studentId?.trim() || actor.id;

    if (targetId === actor.id) {
      if (actor.role !== UserRole.STUDENT && actor.role !== UserRole.PARENT) {
        throw new ForbiddenException("Journey is only available to members");
      }
      return targetId;
    }

    if (actor.role !== UserRole.PARENT) {
      throw new ForbiddenException("You can only view your own journey");
    }

    const link = await this.prisma.parentChild.findUnique({
      where: {
        parentUserId_childUserId: {
          parentUserId: actor.id,
          childUserId: targetId,
        },
      },
    });
    if (!link) {
      throw new ForbiddenException("Child not linked to this parent");
    }
    return targetId;
  }

  async getJourney(
    actor: DecryptedUser,
    studentId?: string,
  ): Promise<JourneyPayload> {
    const resolvedStudentId = await this.resolveStudentId(actor, studentId);
    const student = await this.prisma.user.findUnique({
      where: { id: resolvedStudentId },
    });
    if (!student) {
      throw new NotFoundException("Student not found");
    }

    const decrypted = this.crypto.decryptUser(student);
    const studioId = student.studioId;
    const now = new Date();

    const [
      studio,
      enrollments,
      presentAttendance,
      allAttendance,
      memberships,
      contestMembers,
      achievements,
      ratings,
    ] = await Promise.all([
      studioId
        ? this.prisma.studio.findUnique({
            where: { id: studioId },
            select: { id: true, name: true },
          })
        : Promise.resolve(null),
      this.prisma.batchEnrollment.findMany({
        where: { studentId: resolvedStudentId },
        include: {
          batch: {
            include: {
              trainers: {
                include: {
                  trainer: true,
                },
              },
            },
          },
        },
        orderBy: { enrolledAt: "asc" },
      }),
      this.prisma.attendance.findMany({
        where: {
          studentId: resolvedStudentId,
          status: "PRESENT",
        },
        include: {
          session: {
            select: {
              id: true,
              startsAt: true,
              batchId: true,
              batch: { select: { name: true } },
            },
          },
        },
        orderBy: { session: { startsAt: "asc" } },
      }),
      this.prisma.attendance.findMany({
        where: { studentId: resolvedStudentId },
        select: { status: true },
      }),
      this.prisma.membership.findMany({
        where: {
          OR: [
            { purchaserUserId: resolvedStudentId },
            { coveredStudents: { some: { studentId: resolvedStudentId } } },
          ],
        },
        include: { subscription: { select: { name: true } } },
        orderBy: { periodStart: "asc" },
      }),
      this.prisma.contestEntryMember.findMany({
        where: { studentId: resolvedStudentId },
        include: {
          entry: {
            include: {
              certificate: true,
              category: {
                include: {
                  contest: {
                    select: {
                      id: true,
                      title: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
      this.prisma.studentAchievement.findMany({
        where: { userId: resolvedStudentId },
        include: { achievement: true },
        orderBy: { earnedAt: "asc" },
      }),
      this.prisma.batchRating.findMany({
        where: { studentId: resolvedStudentId },
        include: { batch: { select: { id: true, name: true } } },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    const enrollmentInputs = enrollments.map((enrollment) => {
      const trainers: JourneyTrainer[] = enrollment.batch.trainers.map(
        (link) => {
          const trainer = this.crypto.decryptUser(link.trainer);
          return {
            id: trainer.id,
            name: trainer.name,
            photoUrl: trainer.photoUrl,
          };
        },
      );
      return {
        id: enrollment.id,
        batchId: enrollment.batchId,
        enrolledAt: enrollment.enrolledAt,
        batchName: enrollment.batch.name,
        coverImageUrl: enrollment.batch.coverImageUrl,
        trainers,
      };
    });

    const attendanceInputs = presentAttendance.map((row) => ({
      id: row.id,
      sessionId: row.session.id,
      startsAt: row.session.startsAt,
      batchId: row.session.batchId,
      batchName: row.session.batch.name,
    }));

    const presentSessions = attendanceInputs.map((row) => ({
      sessionId: row.sessionId,
      startsAt: row.startsAt,
    }));

    const contests = contestMembers.map((member) => ({
      entryId: member.entry.id,
      contestTitle: member.entry.category.contest.title,
      registeredAt: member.entry.createdAt,
      placement: member.entry.placement,
      coverImageUrl: null,
    }));

    const certificates = contestMembers
      .filter((member) => member.entry.certificate)
      .map((member) => ({
        id: member.entry.certificate!.id,
        issuedAt: member.entry.certificate!.issuedAt,
        certificateNumber: member.entry.certificate!.certificateNumber,
        contestTitle: member.entry.category.contest.title,
      }));

    const newlyEarnedCutoff = now.getTime() - 7 * 86_400_000;
    const achievementInputs = achievements.map((row) => ({
      id: row.id,
      code: row.achievement.code,
      title: row.achievement.title,
      description: row.achievement.description,
      icon: row.achievement.icon,
      earnedAt: row.earnedAt,
      newlyEarned: row.earnedAt.getTime() >= newlyEarnedCutoff,
    }));

    const joinedCandidates = [
      student.createdAt,
      ...enrollmentInputs.map((e) => e.enrolledAt),
      ...attendanceInputs.map((a) => a.startsAt),
    ].filter(Boolean) as Date[];
    const joinedAt =
      joinedCandidates.length > 0
        ? new Date(Math.min(...joinedCandidates.map((d) => d.getTime())))
        : null;

    const rawEvents = buildJourneyEvents({
      joinedAt,
      studioName: studio?.name ?? null,
      enrollments: enrollmentInputs,
      attendance: attendanceInputs,
      memberships: memberships.map((m) => ({
        id: m.id,
        periodStart: m.periodStart,
        subscriptionName: m.subscription?.name ?? null,
      })),
      contests,
      certificates,
      achievements: achievementInputs,
      ratings: ratings.map((r) => ({
        id: r.id,
        batchId: r.batchId,
        batchName: r.batch.name,
        rating: r.rating,
        createdAt: r.createdAt,
      })),
      experienceLevel: student.experienceLevel,
      now,
    });

    const { events, currentEventId } = markCurrentAndUpcoming(rawEvents, now);

    const presentCount = allAttendance.filter(
      (row) => row.status === "PRESENT",
    ).length;
    const markedCount = allAttendance.length;

    const stats = buildJourneyStats({
      joinedAt,
      attendanceCount: computeSessionsCompleted(presentSessions),
      presentCount,
      markedCount,
      certificates: certificates.length,
      competitions: contests.length,
      currentStreak: computeAttendanceStreak(presentSessions, now),
      longestStreak: computeLongestStreak(presentSessions),
      experienceLevel: student.experienceLevel,
      now,
    });

    return {
      student: {
        id: decrypted.id,
        name: decrypted.name,
        photoUrl: decrypted.photoUrl,
        level: stats.currentLevel,
      },
      currentEventId,
      stats,
      events,
      generatedAt: now.toISOString(),
    };
  }
}
