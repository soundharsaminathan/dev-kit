import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
} from "@nestjs/common";
import {
  AttendanceStatus,
  BookingStatus,
  BookingType,
  MarketplaceCategory,
  MarketplaceRatingSource,
  MarketplaceRatingTarget,
  UserRole,
} from "../generated/prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import {
  UserCryptoService,
  userPiiSelect,
} from "../users/user-crypto.service";
import type { DecryptedUser } from "../users/user-crypto.service";
import {
  isPublicMarketplaceCategory,
  marketplacePrivateCompleted,
  marketplaceRatingSourceFromVisit,
  marketplaceRatingStars,
  marketplaceRatingUniqueKey,
  type PublicMarketplaceCategory,
} from "./marketplace.contract";

export type MarketplaceRatingPrompt = {
  studentId: string;
  studentName: string;
  target: "STUDIO" | "TRAINER";
  studioId: string | null;
  studioName: string | null;
  trainerId: string | null;
  trainerName: string | null;
  category: PublicMarketplaceCategory;
  source: "TRIAL" | "CLASS" | "PRIVATE";
  attendedAt: string;
  className: string | null;
};

export type CreateMarketplaceRatingInput = {
  studentId: string;
  target: "STUDIO" | "TRAINER";
  studioId?: string | null;
  trainerId?: string | null;
  category: string;
  rating: number;
};

@Injectable()
export class MarketplaceRatingsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(UserCryptoService) private readonly crypto: UserCryptoService,
  ) {}

  async listPending(actor: DecryptedUser): Promise<MarketplaceRatingPrompt[]> {
    const studentIds = await this.actorStudentIds(actor);
    const prompts: MarketplaceRatingPrompt[] = [];
    for (const studentId of studentIds) {
      prompts.push(...(await this.pendingForStudent(studentId)));
    }
    return prompts
      .sort((left, right) => right.attendedAt.localeCompare(left.attendedAt))
      .slice(0, 8);
  }

  async create(actor: DecryptedUser, input: CreateMarketplaceRatingInput) {
    const studentIds = await this.actorStudentIds(actor);
    if (!studentIds.includes(input.studentId)) {
      throw new ForbiddenException("You can only rate for your own visits");
    }
    if (!isPublicMarketplaceCategory(input.category)) {
      throw new BadRequestException("Unknown category");
    }
    const stars = marketplaceRatingStars(input.rating);
    if (stars == null) {
      throw new BadRequestException("Rating must be 1 to 5 stars");
    }
    if (input.target === "STUDIO" && !input.studioId) {
      throw new BadRequestException("Studio is required");
    }
    if (input.target === "TRAINER" && !input.trainerId) {
      throw new BadRequestException("Trainer is required");
    }

    const visit = await this.resolveVisit({
      studentId: input.studentId,
      target: input.target,
      studioId: input.studioId ?? null,
      trainerId: input.trainerId ?? null,
      category: input.category,
    });
    if (!visit) {
      throw new BadRequestException("You can only rate a studio you attended");
    }

    const uniqueKey = marketplaceRatingUniqueKey({
      studentId: input.studentId,
      target: input.target,
      studioId: input.studioId,
      trainerId: input.trainerId,
      category: input.category,
    });
    const existing = await this.prisma.marketplaceRating.findUnique({
      where: { uniqueKey },
    });
    if (existing) {
      throw new BadRequestException("You already rated this visit");
    }

    const created = await this.prisma.marketplaceRating.create({
      data: {
        studentId: input.studentId,
        target: input.target as MarketplaceRatingTarget,
        studioId: visit.studioId,
        trainerId: input.target === "TRAINER" ? visit.trainerId : null,
        category: input.category as MarketplaceCategory,
        rating: stars,
        source: visit.source as MarketplaceRatingSource,
        attendedAt: visit.attendedAt,
        uniqueKey,
      },
    });
    await this.recomputeAggregates(created);
    return {
      id: created.id,
      target: created.target,
      category: created.category,
      rating: created.rating,
      source: created.source,
    };
  }

  private async actorStudentIds(actor: DecryptedUser): Promise<string[]> {
    if (actor.role === UserRole.STUDENT) return [actor.id];
    if (actor.role === UserRole.PARENT) {
      const links = await this.prisma.parentChild.findMany({
        where: { parentUserId: actor.id },
        select: { childUserId: true },
      });
      return [...new Set(links.map((link) => link.childUserId))];
    }
    throw new ForbiddenException("Only students can submit ratings");
  }

  private async resolveVisit(input: {
    studentId: string;
    target: "STUDIO" | "TRAINER";
    studioId: string | null;
    trainerId: string | null;
    category: PublicMarketplaceCategory;
  }) {
    const attendance = await this.prisma.attendance.findMany({
      where: {
        studentId: input.studentId,
        status: AttendanceStatus.PRESENT,
        session: {
          batch: {
            marketplaceCategory: input.category as MarketplaceCategory,
            ...(input.target === "STUDIO" && input.studioId
              ? { studioId: input.studioId }
              : {}),
            ...(input.target === "TRAINER" && input.trainerId
              ? { trainers: { some: { trainerId: input.trainerId } } }
              : {}),
          },
        },
      },
      select: {
        sessionId: true,
        session: {
          select: {
            startsAt: true,
            batch: {
              select: {
                id: true,
                name: true,
                studioId: true,
                studio: { select: { name: true } },
                trainers: { select: { trainerId: true } },
                enrollments: {
                  where: { studentId: input.studentId },
                  select: { status: true, endedAt: true },
                },
              },
            },
          },
        },
      },
      orderBy: { session: { startsAt: "asc" } },
    });

    const sessionIds = attendance.map((row) => row.sessionId);
    const trialBookings =
      sessionIds.length === 0
        ? []
        : await this.prisma.booking.findMany({
            where: {
              studentId: input.studentId,
              type: BookingType.TRIAL,
              sessionId: { in: sessionIds },
              status: {
                in: [BookingStatus.CONFIRMED, BookingStatus.COMPLETED],
              },
            },
            select: { sessionId: true },
          });
    const trialSessions = new Set(
      trialBookings.map((row) => row.sessionId).filter(Boolean),
    );

    const enrolledRows = attendance.filter((row) =>
      row.session.batch.enrollments.some((enrollment) =>
        wasEnrolledAt(enrollment, row.session.startsAt),
      ),
    );
    const trialRows = attendance.filter((row) =>
      trialSessions.has(row.sessionId),
    );
    const classRow = enrolledRows[0];
    const trialRow = trialRows[0];

    const privates = await this.prisma.booking.findMany({
      where: {
        studentId: input.studentId,
        type: BookingType.PRIVATE,
        status: { in: [BookingStatus.CONFIRMED, BookingStatus.COMPLETED] },
        ...(input.target === "STUDIO" && input.studioId
          ? { studioId: input.studioId }
          : {}),
        ...(input.target === "TRAINER" && input.trainerId
          ? { trainerId: input.trainerId }
          : {}),
      },
      select: {
        studioId: true,
        trainerId: true,
        status: true,
        endsAt: true,
        studio: {
          select: {
            name: true,
            marketplaceCategories: { select: { category: true } },
          },
        },
        trainer: {
          select: { trainerCategories: { select: { category: true } } },
        },
      },
      orderBy: { endsAt: "asc" },
    });
    const privateRow = privates.find((row) => {
      if (!marketplacePrivateCompleted(row.status, row.endsAt)) return false;
      const studioHas = row.studio.marketplaceCategories.some(
        (item) => item.category === input.category,
      );
      const trainerHas = (row.trainer?.trainerCategories ?? []).some(
        (item) => item.category === input.category,
      );
      return studioHas || trainerHas;
    });

    const source = marketplaceRatingSourceFromVisit({
      enrolledPresent: Boolean(classRow),
      trialPresent: Boolean(trialRow),
      privateCompleted: Boolean(privateRow),
    });
    if (!source) return null;

    if (source === "CLASS" && classRow) {
      return {
        source,
        studioId: classRow.session.batch.studioId,
        trainerId:
          input.trainerId ??
          classRow.session.batch.trainers[0]?.trainerId ??
          null,
        attendedAt: classRow.session.startsAt,
        studioName: classRow.session.batch.studio.name,
        className: classRow.session.batch.name,
      };
    }
    if (source === "TRIAL" && trialRow) {
      return {
        source,
        studioId: trialRow.session.batch.studioId,
        trainerId:
          input.trainerId ??
          trialRow.session.batch.trainers[0]?.trainerId ??
          null,
        attendedAt: trialRow.session.startsAt,
        studioName: trialRow.session.batch.studio.name,
        className: trialRow.session.batch.name,
      };
    }
    if (source === "PRIVATE" && privateRow) {
      return {
        source,
        studioId: privateRow.studioId,
        trainerId: privateRow.trainerId,
        attendedAt: privateRow.endsAt ?? new Date(),
        studioName: privateRow.studio.name,
        className: null,
      };
    }
    return null;
  }

  private async pendingForStudent(
    studentId: string,
  ): Promise<MarketplaceRatingPrompt[]> {
    const existing = await this.prisma.marketplaceRating.findMany({
      where: { studentId },
      select: { uniqueKey: true },
    });
    const used = new Set(existing.map((row) => row.uniqueKey));
    const student = await this.prisma.user.findUnique({
      where: { id: studentId },
      select: { id: true, ...userPiiSelect },
    });
    const studentName = student
      ? this.safeName(student, "Student")
      : "Student";

    const attendance = await this.prisma.attendance.findMany({
      where: {
        studentId,
        status: AttendanceStatus.PRESENT,
      },
      select: {
        sessionId: true,
        session: {
          select: {
            startsAt: true,
            batch: {
              select: {
                name: true,
                studioId: true,
                marketplaceCategory: true,
                studio: { select: { name: true } },
                trainers: {
                  select: {
                    trainerId: true,
                    trainer: { select: { id: true, ...userPiiSelect } },
                  },
                },
                enrollments: {
                  where: { studentId },
                  select: { status: true, endedAt: true },
                },
              },
            },
          },
        },
      },
      orderBy: { session: { startsAt: "desc" } },
      take: 24,
    });
    const sessionIds = attendance.map((row) => row.sessionId);
    const trialSessions = new Set(
      (
        await this.prisma.booking.findMany({
          where: {
            studentId,
            type: BookingType.TRIAL,
            sessionId: { in: sessionIds },
            status: {
              in: [BookingStatus.CONFIRMED, BookingStatus.COMPLETED],
            },
          },
          select: { sessionId: true },
        })
      )
        .map((row) => row.sessionId)
        .filter((id): id is string => Boolean(id)),
    );

    const prompts: MarketplaceRatingPrompt[] = [];
    const seen = new Set<string>();

    for (const row of attendance) {
      const category = row.session.batch.marketplaceCategory;
      if (!isPublicMarketplaceCategory(category)) continue;
      const enrolled = row.session.batch.enrollments.some((enrollment) =>
        wasEnrolledAt(enrollment, row.session.startsAt),
      );
      const trial = trialSessions.has(row.sessionId);
      const source = marketplaceRatingSourceFromVisit({
        enrolledPresent: enrolled,
        trialPresent: trial,
        privateCompleted: false,
      });
      if (!source) continue;
      const studioId = row.session.batch.studioId;
      this.pushPrompt(prompts, seen, used, {
        studentId,
        studentName,
        target: "STUDIO",
        studioId,
        studioName: row.session.batch.studio.name,
        trainerId: null,
        trainerName: null,
        category,
        source,
        attendedAt: row.session.startsAt.toISOString(),
        className: row.session.batch.name,
      });
      for (const link of row.session.batch.trainers) {
        this.pushPrompt(prompts, seen, used, {
          studentId,
          studentName,
          target: "TRAINER",
          studioId,
          studioName: row.session.batch.studio.name,
          trainerId: link.trainerId,
          trainerName: this.safeName(link.trainer, "Trainer"),
          category,
          source,
          attendedAt: row.session.startsAt.toISOString(),
          className: row.session.batch.name,
        });
      }
    }

    const privates = await this.prisma.booking.findMany({
      where: {
        studentId,
        type: BookingType.PRIVATE,
        status: { in: [BookingStatus.CONFIRMED, BookingStatus.COMPLETED] },
      },
      select: {
        studioId: true,
        trainerId: true,
        status: true,
        endsAt: true,
        studio: {
          select: {
            name: true,
            marketplaceCategories: { select: { category: true } },
          },
        },
        trainer: {
          select: {
            id: true,
            ...userPiiSelect,
            trainerCategories: { select: { category: true } },
          },
        },
      },
      orderBy: { endsAt: "desc" },
      take: 12,
    });
    for (const row of privates) {
      if (!marketplacePrivateCompleted(row.status, row.endsAt)) continue;
      const categories = [
        ...row.studio.marketplaceCategories.map((item) => item.category),
        ...(row.trainer?.trainerCategories ?? []).map((item) => item.category),
      ].filter(isPublicMarketplaceCategory);
      const category = categories[0];
      if (!category || !row.endsAt) continue;
      this.pushPrompt(prompts, seen, used, {
        studentId,
        studentName,
        target: "STUDIO",
        studioId: row.studioId,
        studioName: row.studio.name,
        trainerId: null,
        trainerName: null,
        category,
        source: "PRIVATE",
        attendedAt: row.endsAt.toISOString(),
        className: null,
      });
      if (row.trainerId && row.trainer) {
        this.pushPrompt(prompts, seen, used, {
          studentId,
          studentName,
          target: "TRAINER",
          studioId: row.studioId,
          studioName: row.studio.name,
          trainerId: row.trainerId,
          trainerName: this.safeName(row.trainer, "Trainer"),
          category,
          source: "PRIVATE",
          attendedAt: row.endsAt.toISOString(),
          className: null,
        });
      }
    }

    return prompts;
  }

  private pushPrompt(
    prompts: MarketplaceRatingPrompt[],
    seen: Set<string>,
    used: Set<string>,
    prompt: MarketplaceRatingPrompt,
  ) {
    const key = marketplaceRatingUniqueKey(prompt);
    if (used.has(key) || seen.has(key)) return;
    seen.add(key);
    prompts.push(prompt);
  }

  private safeName(
    user: Parameters<UserCryptoService["decryptUser"]>[0],
    fallback: string,
  ) {
    try {
      return this.crypto.decryptUser(user).name.trim() || fallback;
    } catch {
      return fallback;
    }
  }

  private async recomputeAggregates(row: {
    target: MarketplaceRatingTarget;
    studioId: string | null;
    trainerId: string | null;
    category: MarketplaceCategory;
  }) {
    if (row.target === MarketplaceRatingTarget.STUDIO && row.studioId) {
      const stats = await this.prisma.marketplaceRating.aggregate({
        where: {
          target: MarketplaceRatingTarget.STUDIO,
          studioId: row.studioId,
          category: row.category,
        },
        _avg: { rating: true },
        _count: { rating: true },
      });
      await this.prisma.studio.update({
        where: { id: row.studioId },
        data: {
          ratingAvg: stats._avg.rating,
          ratingCount: stats._count.rating,
        },
      });
    }
    if (row.target === MarketplaceRatingTarget.TRAINER && row.trainerId) {
      const stats = await this.prisma.marketplaceRating.aggregate({
        where: {
          target: MarketplaceRatingTarget.TRAINER,
          trainerId: row.trainerId,
          category: row.category,
        },
        _avg: { rating: true },
        _count: { rating: true },
      });
      await this.prisma.user.update({
        where: { id: row.trainerId },
        data: {
          trainerRatingAvg: stats._avg.rating,
          trainerRatingCount: stats._count.rating,
        },
      });
    }
  }
}

function wasEnrolledAt(
  enrollment: { status: string; endedAt: Date | null },
  at: Date,
) {
  if (enrollment.status === "ACTIVE") return true;
  return Boolean(
    enrollment.endedAt && enrollment.endedAt.getTime() >= at.getTime(),
  );
}
