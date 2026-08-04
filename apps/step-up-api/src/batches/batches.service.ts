import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  BatchCategory,
  BillingCadence,
  BookingStatus,
  EnrollmentMode,
  IndividualAudience,
  type Prisma,
  SessionStatus,
  SessionType,
  SubscriptionKind,
  UserRole,
} from "@prisma/client";
import { ScheduleConflictService } from "../calendar/schedule-conflict.service";
import { MediaService } from "../media/media.service";
import { membershipCoversBatch } from "../memberships/membership-helpers";
import {
  type CoveredStudentInput,
  MembershipsService,
} from "../memberships/memberships.service";
import { PrismaService } from "../prisma/prisma.service";
import { TrialSlotsCacheService } from "../sessions/trial-slots-cache.service";
import type { DecryptedUser } from "../users/user-crypto.service";
import { UserCryptoService } from "../users/user-crypto.service";
import {
  assertBatchHasSeat,
  countOccupiedSeats,
  countReservedSeatsByBatch,
  lockBatchRow,
} from "./batch-capacity";
import {
  assertStudentCanEnrollTrial,
  parseTrialSessionIds,
  resolveNextTrialSessionIds,
} from "./trial-enrollment";

type BatchSchedule = {
  frequency: "DAILY" | "WEEKLY";
  weekdays: number[];
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  utcOffsetMinutes: number;
};

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export type DiscoverBatchFilters = {
  style?: string;
  category?: string;
  trainerId?: string;
  branchId?: string;
  search?: string;
  activeOnly?: boolean;
  studentId?: string;
};

function durationMinutesFromSchedule(schedule: unknown): number | null {
  if (!schedule || typeof schedule !== "object") return null;
  const s = schedule as Partial<BatchSchedule>;
  if (!s.startTime || !s.endTime) return null;
  const start =
    Number(s.startTime.slice(0, 2)) * 60 + Number(s.startTime.slice(3));
  const end = Number(s.endTime.slice(0, 2)) * 60 + Number(s.endTime.slice(3));
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return null;
  }
  return end - start;
}

function scheduleLabelFrom(schedule: unknown): string | null {
  if (!schedule || typeof schedule !== "object") return null;
  const s = schedule as Partial<BatchSchedule>;
  if (!s.startTime || !s.endTime) return null;
  if (s.frequency === "DAILY") {
    return `Daily · ${s.startTime}–${s.endTime}`;
  }
  const days = (s.weekdays ?? [])
    .map((d) => WEEKDAY_LABELS[d] ?? "")
    .filter(Boolean)
    .join(", ");
  return days
    ? `${days} · ${s.startTime}–${s.endTime}`
    : `${s.startTime}–${s.endTime}`;
}

function primaryStyleFrom(danceCategories: unknown): string | null {
  if (!Array.isArray(danceCategories) || danceCategories.length === 0) {
    return null;
  }
  const first = danceCategories[0] as { name?: string };
  return first?.name?.trim() || null;
}

const branchCoverInclude = {
  coverMedia: true,
  media: {
    where: { archivedAt: null },
    orderBy: { sortOrder: "asc" as const },
    take: 1,
  },
} as const;

function shapeDiscoverBatch<
  T extends {
    capacity: number;
    enrollments?: unknown[];
    _count?: { enrollments: number };
    scheduleJson: unknown;
    danceCategories: unknown;
    branch?: {
      photos?: string[] | null;
      coverMedia?: { objectKey?: string | null } | null;
      media?: Array<{ objectKey?: string | null }> | null;
    } | null;
    coverImageUrl?: string | null;
    trainers: { trainer: Record<string, unknown> }[];
  },
>(batch: T, reservedSeats?: number, price: number | null = null) {
  const enrollmentCount =
    batch._count?.enrollments ?? batch.enrollments?.length ?? 0;
  const occupied = reservedSeats ?? enrollmentCount;
  const remainingSeats = Math.max(0, batch.capacity - occupied);
  const coverImageUrl =
    batch.coverImageUrl ||
    batch.branch?.coverMedia?.objectKey ||
    batch.branch?.media?.[0]?.objectKey ||
    batch.branch?.photos?.[0] ||
    null;

  return {
    ...batch,
    remainingSeats,
    enrollmentCount,
    occupiedSeats: occupied,
    durationMinutes: durationMinutesFromSchedule(batch.scheduleJson),
    scheduleLabel: scheduleLabelFrom(batch.scheduleJson),
    styleBadge: primaryStyleFrom(batch.danceCategories),
    coverImageUrl,
    price,
  };
}

function extractPlans(
  plans?: Array<{
    subscription: {
      id: string;
      name: string;
      kind: SubscriptionKind;
      individualAudience: IndividualAudience | null;
      familyPack: string | null;
      billingCadence: BillingCadence;
      adultSeats: number;
      kidSeats: number;
      price: { toString(): string } | number;
      active: boolean;
    };
  }>,
) {
  const active = (plans ?? [])
    .map((row) => row.subscription)
    .filter((subscription) => subscription.active)
    .map((subscription) => ({
      ...subscription,
      price: Number(subscription.price),
    }));
  const prices = active
    .map((subscription) => subscription.price)
    .filter((value) => Number.isFinite(value));
  return {
    plans: active,
    price: prices.length > 0 ? Math.min(...prices) : null,
  };
}

function audienceForBatchCategory(category: BatchCategory): IndividualAudience {
  return category === BatchCategory.KIDS
    ? IndividualAudience.KID
    : IndividualAudience.ADULT;
}

function dateTimeFor(date: Date, time: string, utcOffsetMinutes: number): Date {
  const [hours, minutes] = time.split(":").map(Number);
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      hours,
      minutes,
    ) +
      utcOffsetMinutes * 60_000,
  );
}

function buildSessions(
  schedule: BatchSchedule,
  sessionType: SessionType = SessionType.REGULAR,
) {
  const startDate = new Date(`${schedule.startDate}T00:00:00.000Z`);
  const endDate = new Date(`${schedule.endDate}T00:00:00.000Z`);
  const startMinutes =
    Number(schedule.startTime.slice(0, 2)) * 60 +
    Number(schedule.startTime.slice(3));
  const endMinutes =
    Number(schedule.endTime.slice(0, 2)) * 60 +
    Number(schedule.endTime.slice(3));

  if (endDate < startDate) {
    throw new BadRequestException(
      "Schedule end date must be after its start date",
    );
  }
  if (endMinutes <= startMinutes) {
    throw new BadRequestException(
      "Class end time must be after its start time",
    );
  }

  const totalDays = Math.floor(
    (endDate.getTime() - startDate.getTime()) / 86_400_000,
  );
  if (totalDays > 366) {
    throw new BadRequestException("A batch schedule cannot exceed one year");
  }

  const weekdays = new Set(schedule.weekdays);
  if (schedule.frequency === "WEEKLY" && weekdays.size === 0) {
    throw new BadRequestException("Select at least one weekday");
  }

  const sessions: { startsAt: Date; endsAt: Date; type: SessionType }[] = [];
  for (let day = 0; day <= totalDays; day += 1) {
    const date = new Date(startDate.getTime() + day * 86_400_000);
    if (schedule.frequency === "DAILY" || weekdays.has(date.getUTCDay())) {
      sessions.push({
        startsAt: dateTimeFor(
          date,
          schedule.startTime,
          schedule.utcOffsetMinutes,
        ),
        endsAt: dateTimeFor(date, schedule.endTime, schedule.utcOffsetMinutes),
        type: sessionType,
      });
    }
  }

  if (sessions.length === 0) {
    throw new BadRequestException("The schedule does not produce any sessions");
  }

  return sessions;
}

async function syncBatchSessions(
  tx: Prisma.TransactionClient,
  batchId: string,
  desiredSessions: { startsAt: Date; endsAt: Date; type: SessionType }[],
) {
  const existing = await tx.session.findMany({
    where: { batchId },
    include: { _count: { select: { attendance: true, bookings: true } } },
  });

  const desiredKeys = new Set(
    desiredSessions.map((session) => session.startsAt.toISOString()),
  );

  const removable = existing.filter(
    (session) =>
      session._count.attendance === 0 &&
      session._count.bookings === 0 &&
      !desiredKeys.has(session.startsAt.toISOString()),
  );

  if (removable.length > 0) {
    await tx.session.deleteMany({
      where: { id: { in: removable.map((session) => session.id) } },
    });
  }

  const keptStarts = new Set(
    existing
      .filter(
        (session) => !removable.some((removed) => removed.id === session.id),
      )
      .map((session) => session.startsAt.toISOString()),
  );

  const toCreate = desiredSessions.filter(
    (session) => !keptStarts.has(session.startsAt.toISOString()),
  );

  if (toCreate.length > 0) {
    await tx.session.createMany({
      data: toCreate.map((session) => ({
        batchId,
        startsAt: session.startsAt,
        endsAt: session.endsAt,
        status: SessionStatus.SCHEDULED,
        type: session.type,
      })),
    });
  }

  for (const desired of desiredSessions) {
    const match = existing.find(
      (session) =>
        session.startsAt.toISOString() === desired.startsAt.toISOString(),
    );
    if (!match) continue;
    const patch: { endsAt?: Date; type?: SessionType } = {};
    if (match.endsAt.getTime() !== desired.endsAt.getTime()) {
      patch.endsAt = desired.endsAt;
    }
    if (match.type !== desired.type) {
      patch.type = desired.type;
    }
    if (Object.keys(patch).length > 0) {
      await tx.session.update({
        where: { id: match.id },
        data: patch,
      });
    }
  }
}

@Injectable()
export class BatchesService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(UserCryptoService) private readonly crypto: UserCryptoService,
    @Inject(ScheduleConflictService)
    private readonly scheduleConflicts: ScheduleConflictService,
    @Inject(TrialSlotsCacheService)
    private readonly trialSlotsCache: TrialSlotsCacheService,
    @Inject(MediaService) private readonly media: MediaService,
    @Inject(MembershipsService)
    private readonly memberships: MembershipsService,
  ) {}

  private async withSignedCover<T extends { coverImageUrl?: string | null }>(
    batch: T,
  ): Promise<T> {
    return {
      ...batch,
      coverImageUrl: await this.media.signReadUrl(batch.coverImageUrl ?? null),
    };
  }

  async listByStudio(studioId: string, filters: DiscoverBatchFilters = {}) {
    const activeOnly = filters.activeOnly ?? false;
    const batches = await this.prisma.batch.findMany({
      where: {
        studioId,
        ...(activeOnly ? { active: true } : {}),
        ...(filters.category
          ? { category: filters.category as "KIDS" | "ADULTS" }
          : {}),
        ...(filters.branchId ? { branchId: filters.branchId } : {}),
        ...(filters.trainerId
          ? { trainers: { some: { trainerId: filters.trainerId } } }
          : {}),
        ...(filters.search
          ? {
              name: {
                contains: filters.search,
                mode: "insensitive",
              },
            }
          : {}),
      },
      include: {
        enrollments: true,
        branch: { include: branchCoverInclude },
        certificateTemplate: true,
        trainers: { include: { trainer: true } },
        plans: { include: { subscription: true } },
        _count: { select: { enrollments: true } },
      },
      orderBy: { name: "asc" },
    });

    const batchIds = batches.map((batch) => batch.id);
    const reservedByBatch = await countReservedSeatsByBatch(
      this.prisma,
      batchIds,
    );

    const viewerBookingsByBatchId = new Map<
      string,
      {
        id: string;
        type: string;
        status: BookingStatus;
        notes: string | null;
        startsAt: Date | null;
        endsAt: Date | null;
        paymentHoldExpiresAt: Date | null;
      }
    >();
    let viewerActiveTrialBatchId: string | null = null;

    if (filters.studentId && batchIds.length > 0) {
      const [openBookings, activeTrial] = await Promise.all([
        this.prisma.booking.findMany({
          where: {
            batchId: { in: batchIds },
            studentId: filters.studentId,
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
          orderBy: [{ status: "asc" }, { id: "desc" }],
          select: {
            id: true,
            batchId: true,
            type: true,
            status: true,
            notes: true,
            startsAt: true,
            endsAt: true,
            paymentHoldExpiresAt: true,
          },
        }),
        this.prisma.batchEnrollment.findFirst({
          where: {
            studentId: filters.studentId,
            isTrial: true,
          },
          select: { batchId: true },
        }),
      ]);

      for (const booking of openBookings) {
        if (!booking.batchId || viewerBookingsByBatchId.has(booking.batchId)) {
          continue;
        }
        viewerBookingsByBatchId.set(booking.batchId, {
          id: booking.id,
          type: booking.type,
          status: booking.status,
          notes: booking.notes,
          startsAt: booking.startsAt,
          endsAt: booking.endsAt,
          paymentHoldExpiresAt: booking.paymentHoldExpiresAt,
        });
      }
      viewerActiveTrialBatchId = activeTrial?.batchId ?? null;
    }

    const mapped = await Promise.all(
      batches.map(async (batch) => {
        const trainers = batch.trainers.map((row) => ({
          ...row,
          trainer: this.crypto.decryptUser(row.trainer),
        }));
        const { plans, price } = extractPlans(batch.plans);
        const shaped = await this.withSignedCover(
          shapeDiscoverBatch(
            { ...batch, trainers, plans },
            reservedByBatch.get(batch.id),
            price,
          ),
        );
        if (!filters.studentId) return shaped;
        const enrollment = batch.enrollments.find(
          (row) => row.studentId === filters.studentId,
        );
        return {
          ...shaped,
          viewerEnrolled: Boolean(enrollment),
          viewerEnrollment: enrollment
            ? {
                isTrial: enrollment.isTrial,
                trialSessionIds: parseTrialSessionIds(
                  enrollment.trialSessionIds,
                ),
              }
            : null,
          viewerActiveTrialBatchId,
          viewerBooking: viewerBookingsByBatchId.get(batch.id) ?? null,
        };
      }),
    );

    if (filters.style) {
      const style = filters.style.toLowerCase();
      return mapped.filter(
        (batch) => batch.styleBadge?.toLowerCase() === style,
      );
    }

    return mapped;
  }

  async getById(id: string, options?: { studentId?: string }) {
    const batch = await this.prisma.batch.findUniqueOrThrow({
      where: { id },
      include: {
        enrollments: { include: { student: true } },
        branch: { include: branchCoverInclude },
        certificateTemplate: true,
        sessions: { orderBy: { startsAt: "asc" } },
        trainers: { include: { trainer: true } },
        plans: { include: { subscription: true } },
        _count: { select: { enrollments: true } },
      },
    });

    const trainers = batch.trainers.map((row) => ({
      ...row,
      trainer: this.crypto.decryptUser(row.trainer),
    }));
    const monthlyUnpaidIds = await this.memberships.findMonthlyUnpaidStudentIds(
      batch.enrollments.map((enrollment) => enrollment.studentId),
    );
    const enrollments = batch.enrollments.map((enrollment) => ({
      ...enrollment,
      monthlyUnpaid: monthlyUnpaidIds.has(enrollment.studentId),
      student: this.crypto.decryptUser(enrollment.student),
    }));

    let viewerRating: number | null = null;
    let viewerEnrolled = false;
    let viewerEnrollment: {
      isTrial: boolean;
      trialSessionIds: string[];
    } | null = null;
    let viewerActiveTrialBatchId: string | null = null;
    let viewerBooking: {
      id: string;
      type: string;
      status: BookingStatus;
      notes: string | null;
      startsAt: Date | null;
      endsAt: Date | null;
      paymentHoldExpiresAt: Date | null;
    } | null = null;

    if (options?.studentId) {
      const enrollment = batch.enrollments.find(
        (row) => row.studentId === options.studentId,
      );
      viewerEnrolled = Boolean(enrollment);
      if (enrollment) {
        viewerEnrollment = {
          isTrial: enrollment.isTrial,
          trialSessionIds: parseTrialSessionIds(enrollment.trialSessionIds),
        };
      }
      const [existingRating, openBooking, activeTrial] = await Promise.all([
        this.prisma.batchRating.findUnique({
          where: {
            batchId_studentId: {
              batchId: id,
              studentId: options.studentId,
            },
          },
        }),
        this.prisma.booking.findFirst({
          where: {
            batchId: id,
            studentId: options.studentId,
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
          orderBy: [{ status: "asc" }, { id: "desc" }],
          select: {
            id: true,
            type: true,
            status: true,
            notes: true,
            startsAt: true,
            endsAt: true,
            paymentHoldExpiresAt: true,
          },
        }),
        this.prisma.batchEnrollment.findFirst({
          where: {
            studentId: options.studentId,
            isTrial: true,
          },
          select: { batchId: true },
        }),
      ]);
      viewerRating = existingRating?.rating ?? null;
      viewerBooking = openBooking;
      viewerActiveTrialBatchId = activeTrial?.batchId ?? null;
    }

    const reservedByBatch = await countReservedSeatsByBatch(this.prisma, [id]);
    const { plans, price } = extractPlans(batch.plans);

    return {
      ...(await this.withSignedCover(
        shapeDiscoverBatch(
          {
            ...batch,
            trainers,
            enrollments,
            plans,
          },
          reservedByBatch.get(id),
          price,
        ),
      )),
      viewerRating,
      viewerEnrolled,
      viewerEnrollment,
      viewerActiveTrialBatchId,
      viewerBooking,
    };
  }

  async create(
    creatorId: string,
    data: {
      studioId: string;
      name: string;
      category: Prisma.BatchCreateInput["category"];
      branchId: string;
      trainerIds: string[];
      danceCategories: { name: string; description: string }[];
      scheduleJson: Prisma.InputJsonValue;
      capacity: number;
      enrollmentMode: EnrollmentMode;
      subscriptionIds: string[];
      active?: boolean;
      certificationEnabled?: boolean;
      certificateTemplateId?: string | null;
      coverImageUrl?: string | null;
      ratingAvg?: number | null;
      ratingCount?: number;
    },
  ) {
    const schedule = data.scheduleJson as unknown as BatchSchedule;
    const sessions = buildSessions(schedule, SessionType.REGULAR);
    const trainerIds = [...new Set(data.trainerIds)];
    const subscriptionIds = [...new Set(data.subscriptionIds)];
    const certificationEnabled = data.certificationEnabled ?? false;

    if (subscriptionIds.length === 0) {
      throw new BadRequestException(
        "Attach at least one Individual 1-month and 3-month plan",
      );
    }

    const [trainers, branch, certificateTemplate, subscriptions] =
      await Promise.all([
        this.prisma.user.findMany({ where: { id: { in: trainerIds } } }),
        this.prisma.studioBranch.findUnique({ where: { id: data.branchId } }),
        certificationEnabled && data.certificateTemplateId
          ? this.prisma.certificateTemplate.findUnique({
              where: { id: data.certificateTemplateId },
            })
          : Promise.resolve(null),
        this.prisma.subscription.findMany({
          where: { id: { in: subscriptionIds } },
        }),
      ]);

    if (
      trainers.length !== trainerIds.length ||
      trainers.some(
        (trainer) =>
          trainer.studioId !== data.studioId ||
          trainer.role !== UserRole.TRAINER,
      )
    ) {
      throw new BadRequestException("Select trainers from this studio");
    }
    if (!branch || branch.studioId !== data.studioId) {
      throw new BadRequestException("Select a branch from this studio");
    }
    if (
      data.danceCategories.some(
        (category) => !category.name.trim() || !category.description.trim(),
      )
    ) {
      throw new BadRequestException(
        "Dance category names and descriptions are required",
      );
    }
    if (certificationEnabled) {
      if (
        !certificateTemplate ||
        certificateTemplate.studioId !== data.studioId
      ) {
        throw new BadRequestException(
          "Select a certificate template from this studio",
        );
      }
    }

    this.assertBatchPlanSelection(
      data.category as BatchCategory,
      data.studioId,
      subscriptions,
      subscriptionIds,
    );

    await this.scheduleConflicts.assertNoConflicts({
      intervals: sessions,
      trainerIds,
      branchId: data.branchId,
    });

    const created = await this.prisma.batch.create({
      data: {
        studioId: data.studioId,
        branchId: data.branchId,
        name: data.name.trim(),
        category: data.category,
        danceCategories: data.danceCategories,
        scheduleJson: data.scheduleJson,
        capacity: data.capacity,
        enrollmentMode: data.enrollmentMode,
        creatorId,
        active: data.active ?? true,
        certificationEnabled,
        certificateTemplateId: certificationEnabled
          ? data.certificateTemplateId
          : null,
        coverImageUrl: data.coverImageUrl ?? null,
        ratingAvg: data.ratingAvg ?? null,
        ratingCount: data.ratingCount ?? 0,
        trainers: {
          create: trainerIds.map((trainerId) => ({ trainerId })),
        },
        sessions: {
          create: sessions,
        },
        plans: {
          create: subscriptionIds.map((subscriptionId) => ({
            subscriptionId,
          })),
        },
      },
      include: {
        branch: { include: branchCoverInclude },
        certificateTemplate: true,
        sessions: { orderBy: { startsAt: "asc" } },
        trainers: { include: { trainer: true } },
        plans: { include: { subscription: true } },
      },
    });
    await this.trialSlotsCache.invalidate(data.studioId);
    const { plans, price } = extractPlans(created.plans);
    return {
      ...created,
      plans,
      price,
    };
  }

  purchase(
    batchId: string,
    args: {
      subscriptionId: string;
      purchaserUserId: string;
      coveredStudents: CoveredStudentInput[];
    },
  ) {
    return this.memberships.purchaseForBatch({
      batchId,
      subscriptionId: args.subscriptionId,
      purchaserUserId: args.purchaserUserId,
      coveredStudents: args.coveredStudents,
    });
  }

  private assertBatchPlanSelection(
    category: BatchCategory,
    studioId: string,
    subscriptions: Array<{
      id: string;
      studioId: string;
      active: boolean;
      kind: SubscriptionKind;
      individualAudience: IndividualAudience | null;
      billingCadence: BillingCadence;
    }>,
    subscriptionIds: string[],
  ) {
    if (subscriptions.length !== subscriptionIds.length) {
      throw new BadRequestException("One or more plans were not found");
    }
    if (
      subscriptions.some(
        (subscription) =>
          subscription.studioId !== studioId || !subscription.active,
      )
    ) {
      throw new BadRequestException(
        "Select active plans from this studio catalog",
      );
    }

    const expectedAudience = audienceForBatchCategory(category);
    const individuals = subscriptions.filter(
      (subscription) => subscription.kind === SubscriptionKind.INDIVIDUAL,
    );
    for (const subscription of individuals) {
      if (subscription.individualAudience !== expectedAudience) {
        throw new BadRequestException(
          `Individual plans for this batch must target ${expectedAudience}`,
        );
      }
    }

    const hasMonthly = individuals.some(
      (subscription) => subscription.billingCadence === BillingCadence.MONTHLY,
    );
    const hasQuarterly = individuals.some(
      (subscription) =>
        subscription.billingCadence === BillingCadence.QUARTERLY,
    );
    if (!hasMonthly || !hasQuarterly) {
      throw new BadRequestException(
        "Attach Individual 1-month and 3-month plans for this batch",
      );
    }
  }

  async update(
    id: string,
    data: {
      name?: string;
      branchId?: string;
      trainerIds?: string[];
      danceCategories?: { name: string; description: string }[];
      scheduleJson?: Prisma.InputJsonValue;
      capacity?: number;
      enrollmentMode?: EnrollmentMode;
      active?: boolean;
      subscriptionIds?: string[];
      certificationEnabled?: boolean;
      certificateTemplateId?: string | null;
      coverImageUrl?: string | null;
      ratingAvg?: number | null;
      ratingCount?: number;
    },
  ) {
    const batch = await this.prisma.batch.findUnique({ where: { id } });
    if (!batch) {
      throw new NotFoundException("Batch not found");
    }

    if (data.branchId) {
      const branch = await this.prisma.studioBranch.findUnique({
        where: { id: data.branchId },
      });
      if (!branch || branch.studioId !== batch.studioId) {
        throw new BadRequestException("Select a branch from this studio");
      }
    }

    const trainerIds =
      data.trainerIds === undefined ? undefined : [...new Set(data.trainerIds)];

    if (trainerIds) {
      const trainers = await this.prisma.user.findMany({
        where: { id: { in: trainerIds } },
      });
      if (
        trainers.length !== trainerIds.length ||
        trainers.some(
          (trainer) =>
            trainer.studioId !== batch.studioId ||
            trainer.role !== UserRole.TRAINER,
        )
      ) {
        throw new BadRequestException("Select trainers from this studio");
      }
    }

    if (data.danceCategories) {
      if (
        data.danceCategories.some(
          (category) => !category.name.trim() || !category.description.trim(),
        )
      ) {
        throw new BadRequestException(
          "Dance category names and descriptions are required",
        );
      }
    }

    const subscriptionIds =
      data.subscriptionIds === undefined
        ? undefined
        : [...new Set(data.subscriptionIds)];

    if (subscriptionIds) {
      if (subscriptionIds.length === 0) {
        throw new BadRequestException(
          "Attach at least one Individual 1-month and 3-month plan",
        );
      }
      const subscriptions = await this.prisma.subscription.findMany({
        where: { id: { in: subscriptionIds } },
      });
      this.assertBatchPlanSelection(
        batch.category,
        batch.studioId,
        subscriptions,
        subscriptionIds,
      );
    }

    const certificationEnabled =
      data.certificationEnabled ?? batch.certificationEnabled;
    const certificateTemplateId =
      data.certificateTemplateId === undefined
        ? batch.certificateTemplateId
        : data.certificateTemplateId;

    if (certificationEnabled) {
      if (!certificateTemplateId) {
        throw new BadRequestException(
          "Select a certificate template from this studio",
        );
      }
      const certificateTemplate =
        await this.prisma.certificateTemplate.findUnique({
          where: { id: certificateTemplateId },
        });
      if (
        !certificateTemplate ||
        certificateTemplate.studioId !== batch.studioId
      ) {
        throw new BadRequestException(
          "Select a certificate template from this studio",
        );
      }
    }

    const desiredSessions = data.scheduleJson
      ? buildSessions(
          data.scheduleJson as unknown as BatchSchedule,
          SessionType.REGULAR,
        )
      : undefined;

    const scheduleOrTrainersOrBranchChanged =
      desiredSessions !== undefined ||
      trainerIds !== undefined ||
      data.branchId !== undefined;

    if (scheduleOrTrainersOrBranchChanged) {
      const intervals =
        desiredSessions ??
        (await this.prisma.session.findMany({
          where: {
            batchId: id,
            status: { not: SessionStatus.CANCELLED },
          },
          select: { startsAt: true, endsAt: true },
        }));

      const resolvedTrainerIds =
        trainerIds ??
        (
          await this.prisma.batchTrainer.findMany({
            where: { batchId: id },
            select: { trainerId: true },
          })
        ).map((row) => row.trainerId);

      await this.scheduleConflicts.assertNoConflicts({
        intervals,
        trainerIds: resolvedTrainerIds,
        branchId: data.branchId ?? batch.branchId,
        excludeBatchId: id,
      });
    }

    const {
      trainerIds: _incomingTrainerIds,
      subscriptionIds: _incomingSubscriptionIds,
      scheduleJson,
      danceCategories,
      ...batchData
    } = data;

    const updated = await this.prisma.$transaction(async (tx) => {
      if (data.capacity !== undefined) {
        await lockBatchRow(tx, id);
        const occupied = await countOccupiedSeats(tx, id);
        if (data.capacity < occupied) {
          throw new ConflictException(
            `Capacity cannot be less than occupied seats (${occupied})`,
          );
        }
      }

      if (trainerIds) {
        await tx.batchTrainer.deleteMany({ where: { batchId: id } });
        await tx.batchTrainer.createMany({
          data: trainerIds.map((trainerId) => ({ batchId: id, trainerId })),
        });
      }

      if (subscriptionIds) {
        await tx.batchPlan.deleteMany({ where: { batchId: id } });
        await tx.batchPlan.createMany({
          data: subscriptionIds.map((subscriptionId) => ({
            batchId: id,
            subscriptionId,
          })),
        });
      }

      if (desiredSessions) {
        await syncBatchSessions(tx, id, desiredSessions);
      }

      return tx.batch.update({
        where: { id },
        data: {
          ...batchData,
          ...(danceCategories ? { danceCategories } : {}),
          ...(scheduleJson ? { scheduleJson } : {}),
          certificateTemplateId: certificationEnabled
            ? certificateTemplateId
            : null,
          certificationEnabled,
        },
        include: {
          branch: { include: branchCoverInclude },
          certificateTemplate: true,
          sessions: { orderBy: { startsAt: "asc" } },
          trainers: { include: { trainer: true } },
          plans: { include: { subscription: true } },
        },
      });
    });
    if (desiredSessions) {
      await this.trialSlotsCache.invalidate(batch.studioId);
    }
    if (updated.plans) {
      const { plans, price } = extractPlans(updated.plans);
      return { ...updated, plans, price };
    }
    return updated;
  }

  async remove(id: string) {
    const batch = await this.prisma.batch.findUnique({
      where: { id },
      include: { _count: { select: { enrollments: true } } },
    });
    if (!batch) {
      throw new NotFoundException("Batch not found");
    }
    if (batch._count.enrollments > 0) {
      throw new ConflictException(
        "Cannot delete a batch that has enrolled students",
      );
    }

    const deleted = await this.prisma.batch.delete({ where: { id } });
    await this.trialSlotsCache.invalidate(batch.studioId);
    return deleted;
  }

  async enroll(
    batchId: string,
    studentId: string,
    actor: DecryptedUser,
    options: { isTrial?: boolean } = {},
  ) {
    const staffRoles: UserRole[] = [
      UserRole.OWNER,
      UserRole.STAFF,
      UserRole.TRAINER,
    ];
    const isStaff = staffRoles.includes(actor.role);
    const isTrial = options.isTrial === true;

    if (!isStaff && actor.id !== studentId) {
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
        throw new ForbiddenException(
          "Student is not linked to this account as a family member",
        );
      }
    }

    const batch = await this.prisma.batch.findUnique({
      where: { id: batchId },
      include: { enrollments: true },
    });

    if (!batch) {
      throw new NotFoundException("Batch not found");
    }

    if (!batch.active) {
      throw new BadRequestException("Batch is not active");
    }

    if (!isStaff && batch.enrollmentMode !== EnrollmentMode.SELF_JOIN) {
      throw new BadRequestException(
        "This batch does not allow self-enrollment",
      );
    }

    await this.scheduleConflicts.assertStudentAvailableForBatch(
      studentId,
      batchId,
    );

    return this.prisma.$transaction(async (tx) => {
      await lockBatchRow(tx, batchId);
      await assertBatchHasSeat(tx, batchId, batch.capacity, studentId);

      if (isTrial) {
        await assertStudentCanEnrollTrial(tx, studentId, batchId);
      }

      const trialSessionIds = isTrial
        ? await resolveNextTrialSessionIds(tx, batchId)
        : undefined;

      return tx.batchEnrollment.upsert({
        where: {
          batchId_studentId: { batchId, studentId },
        },
        update: isTrial
          ? {
              isTrial: true,
              trialSessionIds,
              enrolledAt: new Date(),
            }
          : {},
        create: {
          batchId,
          studentId,
          isTrial,
          ...(trialSessionIds ? { trialSessionIds } : {}),
        },
      });
    });
  }

  async listSwitchTargets(fromBatchId: string, studentId: string) {
    const source = await this.prisma.batch.findUnique({
      where: { id: fromBatchId },
      include: {
        enrollments: {
          where: { studentId },
          take: 1,
        },
      },
    });

    if (!source) {
      throw new NotFoundException("Batch not found");
    }

    const enrollment = source.enrollments[0];
    if (!enrollment) {
      throw new BadRequestException("Student is not enrolled in this batch");
    }

    const isTrial = enrollment.isTrial === true;
    const alreadyEnrolled = await this.prisma.batchEnrollment.findMany({
      where: { studentId },
      select: { batchId: true },
    });
    const excludeIds = new Set([
      fromBatchId,
      ...alreadyEnrolled.map((row) => row.batchId),
    ]);

    if (isTrial) {
      const candidates = await this.prisma.batch.findMany({
        where: {
          studioId: source.studioId,
          active: true,
          category: source.category,
          id: { notIn: [...excludeIds] },
        },
        include: {
          branch: { select: { name: true } },
        },
        orderBy: { name: "asc" },
      });

      const reservedByBatch = await countReservedSeatsByBatch(
        this.prisma,
        candidates.map((batch) => batch.id),
      );

      return {
        studentId,
        isTrial: true,
        subscription: null,
        targets: candidates
          .map((batch) => {
            const occupied = reservedByBatch.get(batch.id) ?? 0;
            const remainingSeats = Math.max(0, batch.capacity - occupied);
            return {
              id: batch.id,
              name: batch.name,
              category: batch.category,
              remainingSeats,
              branchName: batch.branch.name,
            };
          })
          .filter((batch) => batch.remainingSeats > 0),
      };
    }

    const membership = await this.memberships.findActiveForBatch(
      studentId,
      fromBatchId,
    );

    if (!membership) {
      return {
        studentId,
        isTrial: false,
        subscription: null,
        reason: "No active subscription covering this batch",
        targets: [],
      };
    }

    const subscriptionId = membership.subscriptionId;
    const seat = membership.coveredStudents[0];
    const candidates = await this.prisma.batch.findMany({
      where: {
        studioId: source.studioId,
        active: true,
        id: { notIn: [...excludeIds] },
        plans: { some: { subscriptionId } },
      },
      include: {
        branch: { select: { name: true } },
      },
      orderBy: { name: "asc" },
    });

    const reservedByBatch = await countReservedSeatsByBatch(
      this.prisma,
      candidates.map((batch) => batch.id),
    );

    const targets = candidates
      .filter((batch) =>
        seat
          ? membershipCoversBatch({
              status: membership.status,
              periodStart: membership.periodStart,
              periodEnd: membership.periodEnd,
              seatRole: seat.seatRole,
              batchCategory: batch.category,
            })
          : false,
      )
      .map((batch) => {
        const occupied = reservedByBatch.get(batch.id) ?? 0;
        const remainingSeats = Math.max(0, batch.capacity - occupied);
        return {
          id: batch.id,
          name: batch.name,
          category: batch.category,
          remainingSeats,
          branchName: batch.branch.name,
        };
      })
      .filter((batch) => batch.remainingSeats > 0);

    return {
      studentId,
      isTrial: false,
      subscription: {
        id: membership.subscription.id,
        name: membership.subscription.name,
      },
      targets,
    };
  }

  async switchBatch(fromBatchId: string, studentId: string, toBatchId: string) {
    if (fromBatchId === toBatchId) {
      throw new BadRequestException("Student is already in this batch");
    }

    const [source, target] = await Promise.all([
      this.prisma.batch.findUnique({
        where: { id: fromBatchId },
        include: {
          enrollments: {
            where: { studentId },
            take: 1,
          },
        },
      }),
      this.prisma.batch.findUnique({
        where: { id: toBatchId },
        include: {
          plans: { select: { subscriptionId: true } },
        },
      }),
    ]);

    if (!source) {
      throw new NotFoundException("Batch not found");
    }
    if (!target) {
      throw new NotFoundException("Target batch not found");
    }

    const enrollment = source.enrollments[0];
    if (!enrollment) {
      throw new BadRequestException("Student is not enrolled in this batch");
    }

    if (!target.active) {
      throw new BadRequestException("Target batch is not active");
    }

    if (target.studioId !== source.studioId) {
      throw new BadRequestException(
        "Target batch must belong to the same studio",
      );
    }

    const existingTarget = await this.prisma.batchEnrollment.findUnique({
      where: {
        batchId_studentId: { batchId: toBatchId, studentId },
      },
    });
    if (existingTarget) {
      throw new BadRequestException(
        "Student is already enrolled in the target batch",
      );
    }

    const isTrial = enrollment.isTrial === true;

    if (isTrial) {
      if (target.category !== source.category) {
        throw new BadRequestException(
          "Trial students can only switch to a batch in the same category",
        );
      }
    } else {
      const membership = await this.memberships.findActiveForBatch(
        studentId,
        fromBatchId,
      );
      if (!membership) {
        throw new BadRequestException(
          "Student has no active subscription covering this batch",
        );
      }

      const seat = membership.coveredStudents[0];
      if (
        !seat ||
        !membershipCoversBatch({
          status: membership.status,
          periodStart: membership.periodStart,
          periodEnd: membership.periodEnd,
          seatRole: seat.seatRole,
          batchCategory: target.category,
        })
      ) {
        throw new BadRequestException(
          "Student subscription does not cover the target batch category",
        );
      }

      const hasPlan = target.plans.some(
        (plan) => plan.subscriptionId === membership.subscriptionId,
      );
      if (!hasPlan) {
        throw new BadRequestException(
          "Target batch does not offer the student's current subscription plan",
        );
      }
    }

    await this.scheduleConflicts.assertStudentAvailableForBatch(
      studentId,
      toBatchId,
      { excludeBatchIds: [fromBatchId] },
    );

    return this.prisma.$transaction(async (tx) => {
      await lockBatchRow(tx, toBatchId);
      await assertBatchHasSeat(tx, toBatchId, target.capacity, studentId);

      const trialSessionIds = isTrial
        ? await resolveNextTrialSessionIds(tx, toBatchId)
        : undefined;

      await tx.batchEnrollment.delete({
        where: {
          batchId_studentId: { batchId: fromBatchId, studentId },
        },
      });

      return tx.batchEnrollment.create({
        data: {
          batchId: toBatchId,
          studentId,
          isTrial,
          ...(trialSessionIds ? { trialSessionIds } : {}),
        },
      });
    });
  }

  async rate(
    batchId: string,
    studentId: string,
    rating: number,
    actor: DecryptedUser,
  ) {
    const staffRoles: UserRole[] = [
      UserRole.OWNER,
      UserRole.STAFF,
      UserRole.TRAINER,
    ];
    const isStaff = staffRoles.includes(actor.role);

    if (!isStaff) {
      if (actor.role === UserRole.STUDENT && actor.id !== studentId) {
        throw new ForbiddenException("Students can only rate for themselves");
      }
      if (actor.role === UserRole.PARENT) {
        const link = await this.prisma.parentChild.findUnique({
          where: {
            parentUserId_childUserId: {
              parentUserId: actor.id,
              childUserId: studentId,
            },
          },
        });
        if (!link) {
          throw new ForbiddenException(
            "Student is not linked to this parent account",
          );
        }
      }
      if (actor.role !== UserRole.STUDENT && actor.role !== UserRole.PARENT) {
        throw new ForbiddenException("Only students can submit ratings");
      }
    }

    const batch = await this.prisma.batch.findUnique({
      where: { id: batchId },
      include: {
        enrollments: {
          where: { studentId },
          take: 1,
        },
      },
    });

    if (!batch) {
      throw new NotFoundException("Batch not found");
    }

    if (batch.enrollments.length === 0) {
      throw new BadRequestException(
        "Only enrolled students can rate this batch",
      );
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.batchRating.upsert({
        where: {
          batchId_studentId: { batchId, studentId },
        },
        update: { rating },
        create: { batchId, studentId, rating },
      });

      const aggregate = await tx.batchRating.aggregate({
        where: { batchId },
        _avg: { rating: true },
        _count: { rating: true },
      });

      return tx.batch.update({
        where: { id: batchId },
        data: {
          ratingAvg: aggregate._avg.rating,
          ratingCount: aggregate._count.rating,
        },
        include: {
          branch: { include: branchCoverInclude },
          certificateTemplate: true,
          sessions: { orderBy: { startsAt: "asc" } },
          trainers: { include: { trainer: true } },
          _count: { select: { enrollments: true } },
        },
      });
    });
  }

  async getRevenue(id: string) {
    const batch = await this.prisma.batch.findUnique({
      where: { id },
      include: {
        enrollments: true,
      },
    });

    if (!batch) {
      throw new NotFoundException("Batch not found");
    }

    const studentIds = batch.enrollments.map(
      (enrollment) => enrollment.studentId,
    );

    const emptyBucket = () => ({
      collected: 0,
      pending: 0,
      overdue: 0,
      invoiceCount: 0,
    });

    const totals = emptyBucket();
    const bySubscriptionMap = new Map<
      string,
      {
        subscriptionId: string;
        name: string;
        billingCadence: string;
        collected: number;
        pending: number;
        overdue: number;
        invoiceCount: number;
      }
    >();

    if (studentIds.length > 0) {
      const invoices = await this.prisma.invoice.findMany({
        where: {
          studioId: batch.studioId,
          studentId: { in: studentIds },
          membershipId: { not: null },
        },
        include: {
          membership: {
            include: {
              subscription: {
                select: {
                  id: true,
                  name: true,
                  billingCadence: true,
                },
              },
            },
          },
        },
      });

      for (const invoice of invoices) {
        const amount = Number(invoice.amount);
        const subscription = invoice.membership?.subscription;
        const subscriptionId = subscription?.id;

        if (subscriptionId && !bySubscriptionMap.has(subscriptionId)) {
          bySubscriptionMap.set(subscriptionId, {
            subscriptionId,
            name: subscription.name,
            billingCadence: subscription.billingCadence,
            ...emptyBucket(),
          });
        }
        const bucket = subscriptionId
          ? bySubscriptionMap.get(subscriptionId)
          : undefined;

        totals.invoiceCount += 1;
        if (bucket) {
          bucket.invoiceCount += 1;
        }

        if (invoice.status === "PAID") {
          totals.collected += amount;
          if (bucket) {
            bucket.collected += amount;
          }
        } else if (invoice.status === "PENDING") {
          totals.pending += amount;
          if (bucket) {
            bucket.pending += amount;
          }
        } else if (invoice.status === "OVERDUE") {
          totals.overdue += amount;
          if (bucket) {
            bucket.overdue += amount;
          }
        }
      }
    }

    return {
      enrolledCount: batch.enrollments.length,
      totals,
      bySubscription: [...bySubscriptionMap.values()],
    };
  }
}
