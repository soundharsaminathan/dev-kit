import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  AgeRange,
  BatchCategory,
  BatchEnrollmentStatus,
  BillingCadence,
  BookingStatus,
  EnrollmentMode,
  IndividualAudience,
  InvoiceStatus,
  Prisma,
  SessionStatus,
  SessionType,
  SubscriptionKind,
  UserRole,
} from "@prisma/client";
import { BillingService } from "../billing/billing.service";
import {
  accumulatePaidMonths,
  paidMonthsInvoiceSelect,
  paidMonthsInvoiceWhere,
  parseCombineMeta,
  parsePurchaseMeta,
} from "../billing/family-combine";
import { ScheduleConflictService } from "../calendar/schedule-conflict.service";
import { MediaService } from "../media/media.service";
import {
  batchCategoryForAgeRange,
  membershipCoversBatch,
  seatRoleForBatchCategory,
} from "../memberships/membership-helpers";
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
  assertBatchHasSeats,
  countOccupiedSeats,
  countReservedSeatsByBatch,
  lockBatchRow,
} from "./batch-capacity";
import {
  ACTIVE_ENROLLMENT_WHERE,
  endEnrollmentData,
  inactiveReasonFromEndReason,
  REACTIVATE_ENROLLMENT_DATA,
} from "./enrollment-status";

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
    @Inject(BillingService) private readonly billing: BillingService,
  ) {}

  private async withSignedStudentPhoto<
    T extends { photoUrl?: string | null } & Record<string, unknown>,
  >(student: T): Promise<T> {
    return {
      ...student,
      photoUrl: await this.media.signReadUrl(student.photoUrl ?? null),
    };
  }

  private async withSignedEnrollments<
    T extends {
      student?: ({ photoUrl?: string | null } & Record<string, unknown>) | null;
    },
  >(rows: T[]): Promise<T[]> {
    return Promise.all(
      rows.map(async (row) => {
        if (!row.student) return row;
        return {
          ...row,
          student: await this.withSignedStudentPhoto(row.student),
        };
      }),
    );
  }

  private async withSignedCover<
    T extends {
      coverImageUrl?: string | null;
      trainers?: Array<{
        trainer: { photoUrl?: string | null } & Record<string, unknown>;
      }>;
      enrollments?: Array<{
        studentId?: string;
        student?: ({ photoUrl?: string | null } & Record<string, unknown>) | null;
      }>;
      branch?: {
        photos?: string[] | null;
        coverMedia?: { objectKey?: string | null } | null;
        media?: Array<{ objectKey?: string | null }> | null;
      } | null;
    },
  >(batch: T): Promise<T> {
    const coverImageUrl = await this.media.signReadUrl(
      batch.coverImageUrl ?? null,
    );

    const trainers = batch.trainers
      ? await Promise.all(
          batch.trainers.map(async (row) => ({
            ...row,
            trainer: {
              ...row.trainer,
              photoUrl: await this.media.signReadUrl(
                row.trainer.photoUrl ?? null,
              ),
            },
          })),
        )
      : undefined;

    const enrollments = batch.enrollments
      ? await this.withSignedEnrollments(batch.enrollments)
      : undefined;

    const sourceBranch = batch.branch;
    let branch: (NonNullable<T["branch"]> & {
      coverImageUrl?: string | null;
    }) | null | undefined = sourceBranch;
    if (sourceBranch) {
      const branchCoverKey =
        sourceBranch.coverMedia?.objectKey ||
        sourceBranch.media?.[0]?.objectKey ||
        sourceBranch.photos?.[0] ||
        null;
      const [branchCoverImageUrl, photos] = await Promise.all([
        this.media.signReadUrl(branchCoverKey),
        sourceBranch.photos?.length
          ? this.media.signReadUrls(sourceBranch.photos)
          : Promise.resolve(sourceBranch.photos ?? null),
      ]);
      branch = {
        ...sourceBranch,
        photos,
        coverImageUrl: branchCoverImageUrl,
      };
    }

    return {
      ...batch,
      coverImageUrl,
      ...(trainers ? { trainers } : {}),
      ...(enrollments ? { enrollments } : {}),
      ...(sourceBranch !== undefined ? { branch } : {}),
    } as T;
  }

  /**
   * Members always view Discover as themselves (or a linked child).
   * Staff keep an optional studentId for enrollment/booking badges only.
   */
  private async resolveDiscoverViewer(
    actor: DecryptedUser | undefined,
    studentId?: string,
  ): Promise<{ studentId: string | null; ageRange: AgeRange | null }> {
    const loadAgeRange = async (id: string) => {
      const row = await this.prisma.user.findUnique({
        where: { id },
        select: { ageRange: true },
      });
      return row?.ageRange ?? null;
    };

    if (!actor) {
      if (!studentId) {
        return { studentId: null, ageRange: null };
      }
      return {
        studentId,
        ageRange: await loadAgeRange(studentId),
      };
    }

    const isMember =
      actor.role === UserRole.STUDENT || actor.role === UserRole.PARENT;

    if (!isMember) {
      if (!studentId) {
        return { studentId: null, ageRange: null };
      }
      return {
        studentId,
        ageRange: await loadAgeRange(studentId),
      };
    }

    const targetId = studentId?.trim() || actor.id;
    if (targetId === actor.id) {
      return { studentId: actor.id, ageRange: actor.ageRange };
    }

    if (actor.role !== UserRole.PARENT) {
      throw new ForbiddenException("You can only view your own classes");
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

    return {
      studentId: targetId,
      ageRange: await loadAgeRange(targetId),
    };
  }

  async listByStudio(
    studioId: string,
    filters: DiscoverBatchFilters = {},
    actor?: DecryptedUser,
  ) {
    const activeOnly = filters.activeOnly ?? false;
    const viewer = await this.resolveDiscoverViewer(actor, filters.studentId);
    const viewerStudentId = viewer.studentId;
    const preferredCategory = batchCategoryForAgeRange(viewer.ageRange);

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
        enrollments: { where: ACTIVE_ENROLLMENT_WHERE },
        branch: { include: branchCoverInclude },
        certificateTemplate: true,
        trainers: { include: { trainer: true } },
        plans: { include: { subscription: true } },
        _count: {
          select: { enrollments: { where: ACTIVE_ENROLLMENT_WHERE } },
        },
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

    if (viewerStudentId && batchIds.length > 0) {
      const openBookings = await this.prisma.booking.findMany({
        where: {
          batchId: { in: batchIds },
          studentId: viewerStudentId,
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
      });

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
        if (!viewerStudentId) return shaped;
        const enrollment = batch.enrollments.find(
          (row) => row.studentId === viewerStudentId,
        );
        return {
          ...shaped,
          viewerEnrolled: Boolean(enrollment),
          viewerEnrollment: enrollment
            ? { enrolledAt: enrollment.enrolledAt }
            : null,
          viewerBooking: viewerBookingsByBatchId.get(batch.id) ?? null,
        };
      }),
    );

    const styleFilter = filters.style?.toLowerCase();
    const filtered = styleFilter
      ? mapped.filter(
          (batch) => batch.styleBadge?.toLowerCase() === styleFilter,
        )
      : mapped;

    if (!preferredCategory || filters.category) {
      return filtered;
    }

    return filtered.slice().sort((a, b) => {
      const aMatch = a.category === preferredCategory ? 0 : 1;
      const bMatch = b.category === preferredCategory ? 0 : 1;
      if (aMatch !== bMatch) return aMatch - bMatch;
      return a.name.localeCompare(b.name);
    });
  }

  async getById(id: string, options?: { studentId?: string }) {
    const batch = await this.prisma.batch.findUniqueOrThrow({
      where: { id },
      include: {
        enrollments: {
          include: { student: true },
        },
        branch: { include: branchCoverInclude },
        certificateTemplate: true,
        sessions: { orderBy: { startsAt: "asc" } },
        trainers: { include: { trainer: true } },
        plans: { include: { subscription: true } },
        _count: {
          select: { enrollments: { where: ACTIVE_ENROLLMENT_WHERE } },
        },
      },
    });

    const trainers = batch.trainers.map((row) => ({
      ...row,
      trainer: this.crypto.decryptUser(row.trainer),
    }));
    const allStudentIds = batch.enrollments.map(
      (enrollment) => enrollment.studentId,
    );
    const activeMonthIds =
      await this.memberships.findStudentIdsWithActiveMonthForBatch(
        allStudentIds,
        batch.category,
      );
    const activeEnrollmentsRaw = batch.enrollments.filter(
      (enrollment) => enrollment.status === BatchEnrollmentStatus.ACTIVE,
    );
    const inactiveEnrollmentsRaw = batch.enrollments.filter(
      (enrollment) =>
        enrollment.status === BatchEnrollmentStatus.ENDED &&
        activeMonthIds.has(enrollment.studentId),
    );
    const activeStudentIds = activeEnrollmentsRaw.map(
      (enrollment) => enrollment.studentId,
    );
    const monthlyUnpaidIds =
      await this.memberships.findMonthlyUnpaidStudentIds(activeStudentIds);
    const paidInvoices =
      activeStudentIds.length === 0
        ? []
        : await this.prisma.invoice.findMany({
            where: paidMonthsInvoiceWhere(batch.studioId, activeStudentIds),
            select: paidMonthsInvoiceSelect,
          });
    const paidMonthsByStudent = accumulatePaidMonths(paidInvoices, {
      onlyStudentIds: new Set(activeStudentIds),
    });
    const enrollments = activeEnrollmentsRaw.map((enrollment) => ({
      ...enrollment,
      monthlyUnpaid: monthlyUnpaidIds.has(enrollment.studentId),
      paidMonths: paidMonthsByStudent.get(enrollment.studentId) ?? 0,
      student: this.crypto.decryptUser(enrollment.student),
    }));
    const inactiveEnrollments = inactiveEnrollmentsRaw.map((enrollment) => ({
      ...enrollment,
      inactiveReason: inactiveReasonFromEndReason(enrollment.endReason),
      student: this.crypto.decryptUser(enrollment.student),
    }));

    let viewerRating: number | null = null;
    let viewerEnrolled = false;
    let viewerEnrollment: { enrolledAt: Date } | null = null;
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
        (row) =>
          row.studentId === options.studentId &&
          row.status === BatchEnrollmentStatus.ACTIVE,
      );
      viewerEnrolled = Boolean(enrollment);
      if (enrollment) {
        viewerEnrollment = { enrolledAt: enrollment.enrolledAt };
      }
      const [existingRating, openBooking] = await Promise.all([
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
      ]);
      viewerRating = existingRating?.rating ?? null;
      viewerBooking = openBooking;
    }

    const reservedByBatch = await countReservedSeatsByBatch(this.prisma, [id]);
    const { plans, price } = extractPlans(batch.plans);
    const signedInactiveEnrollments =
      await this.withSignedEnrollments(inactiveEnrollments);

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
      inactiveEnrollments: signedInactiveEnrollments,
      viewerRating,
      viewerEnrolled,
      viewerEnrollment,
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
    const familyPlans = subscriptions.filter(
      (subscription) => subscription.kind === SubscriptionKind.FAMILY,
    );
    if (familyPlans.length > 0) {
      throw new BadRequestException(
        "Family packs are studio-wide; do not attach them to a batch",
      );
    }

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
      include: {
        _count: {
          select: { enrollments: { where: ACTIVE_ENROLLMENT_WHERE } },
        },
      },
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
    subscriptionId: string,
  ) {
    const staffRoles: UserRole[] = [
      UserRole.OWNER,
      UserRole.STAFF,
      UserRole.TRAINER,
    ];
    const isStaff = staffRoles.includes(actor.role);

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
      include: {
        enrollments: { where: ACTIVE_ENROLLMENT_WHERE },
      },
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

    if (
      batch.enrollments.some((enrollment) => enrollment.studentId === studentId)
    ) {
      throw new BadRequestException(
        "Student is already enrolled in this batch",
      );
    }

    const seatRole = seatRoleForBatchCategory(batch.category);
    const invoice = await this.memberships.purchaseForBatch({
      batchId,
      subscriptionId,
      purchaserUserId: studentId,
      coveredStudents: [{ studentId, seatRole }],
      paymentHold: false,
    });

    const enrollment = await this.prisma.$transaction(async (tx) => {
      await lockBatchRow(tx, batchId);
      await assertBatchHasSeat(tx, batchId, batch.capacity, studentId);

      return tx.batchEnrollment.upsert({
        where: {
          batchId_studentId: { batchId, studentId },
        },
        update: REACTIVATE_ENROLLMENT_DATA,
        create: {
          batchId,
          studentId,
          status: BatchEnrollmentStatus.ACTIVE,
        },
      });
    });

    return {
      ...enrollment,
      invoice: {
        ...invoice,
        amount: Number(invoice.amount),
      },
    };
  }

  async enrollBulk(
    batchId: string,
    studentIds: string[],
    actor: DecryptedUser,
    subscriptionId: string,
  ) {
    const staffRoles: UserRole[] = [
      UserRole.OWNER,
      UserRole.STAFF,
      UserRole.TRAINER,
    ];
    if (!staffRoles.includes(actor.role)) {
      throw new ForbiddenException(
        "Only staff can bulk enroll students into a batch",
      );
    }

    const uniqueIds = [...new Set(studentIds)];
    if (uniqueIds.length === 0) {
      throw new BadRequestException("At least one student is required");
    }
    if (uniqueIds.length !== studentIds.length) {
      throw new BadRequestException("Duplicate students are not allowed");
    }

    const batch = await this.prisma.batch.findUnique({
      where: { id: batchId },
      include: {
        enrollments: { where: ACTIVE_ENROLLMENT_WHERE },
      },
    });

    if (!batch) {
      throw new NotFoundException("Batch not found");
    }

    if (!batch.active) {
      throw new BadRequestException("Batch is not active");
    }

    const alreadyEnrolled = uniqueIds.filter((studentId) =>
      batch.enrollments.some(
        (enrollment) => enrollment.studentId === studentId,
      ),
    );
    if (alreadyEnrolled.length > 0) {
      throw new BadRequestException(
        alreadyEnrolled.length === 1
          ? "Student is already enrolled in this batch"
          : "One or more students are already enrolled in this batch",
      );
    }

    const results = await this.prisma.$transaction(
      async (tx) => {
        await lockBatchRow(tx, batchId);
        await assertBatchHasSeats(tx, batchId, batch.capacity, uniqueIds);

        const invoices = await this.memberships.purchaseForBatchBulk({
          batchId,
          subscriptionId,
          studentIds: uniqueIds,
          paymentHold: false,
          tx,
        });

        const enrollments = [];
        for (let i = 0; i < uniqueIds.length; i++) {
          const studentId = uniqueIds[i]!;
          const invoice = invoices[i]!;
          const enrollment = await tx.batchEnrollment.upsert({
            where: {
              batchId_studentId: { batchId, studentId },
            },
            update: REACTIVATE_ENROLLMENT_DATA,
            create: {
              batchId,
              studentId,
              status: BatchEnrollmentStatus.ACTIVE,
            },
          });
          enrollments.push({
            ...enrollment,
            invoice: {
              ...invoice,
              amount: Number(invoice.amount),
            },
          });
        }
        return enrollments;
      },
      { timeout: 30_000 },
    );

    return { enrollments: results };
  }

  async listSwitchTargets(
    fromBatchId: string,
    studentId: string,
    options: { includeAllPrices?: boolean } = {},
  ) {
    const includeAllPrices = options.includeAllPrices === true;
    const source = await this.prisma.batch.findUnique({
      where: { id: fromBatchId },
      include: {
        enrollments: {
          where: { studentId, ...ACTIVE_ENROLLMENT_WHERE },
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

    const alreadyEnrolled = await this.prisma.batchEnrollment.findMany({
      where: { studentId, ...ACTIVE_ENROLLMENT_WHERE },
      select: { batchId: true },
    });
    const excludeIds = new Set([
      fromBatchId,
      ...alreadyEnrolled.map((row) => row.batchId),
    ]);

    const membership = await this.memberships.findActiveForBatch(
      studentId,
      fromBatchId,
    );

    if (!membership) {
      return {
        studentId,
        subscription: null,
        includeAllPrices,
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
        ...(includeAllPrices
          ? {}
          : { plans: { some: { subscriptionId } } }),
      },
      include: {
        branch: { select: { name: true } },
        plans: {
          include: {
            subscription: {
              select: { price: true, active: true },
            },
          },
        },
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
        const prices = batch.plans
          .filter((plan) => plan.subscription.active)
          .map((plan) => Number(plan.subscription.price))
          .filter((value) => Number.isFinite(value));
        return {
          id: batch.id,
          name: batch.name,
          category: batch.category,
          remainingSeats,
          branchName: batch.branch.name,
          price: prices.length > 0 ? Math.min(...prices) : null,
        };
      })
      .filter((batch) => batch.remainingSeats > 0);

    return {
      studentId,
      includeAllPrices,
      subscription: {
        id: membership.subscription.id,
        name: membership.subscription.name,
      },
      targets,
    };
  }

  async switchBatch(
    fromBatchId: string,
    studentId: string,
    toBatchId: string,
    options: { includeAllPrices?: boolean } = {},
  ) {
    if (fromBatchId === toBatchId) {
      throw new BadRequestException("Student is already in this batch");
    }

    const [source, target] = await Promise.all([
      this.prisma.batch.findUnique({
        where: { id: fromBatchId },
        include: {
          enrollments: {
            where: { studentId, ...ACTIVE_ENROLLMENT_WHERE },
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
    if (
      existingTarget &&
      existingTarget.status === BatchEnrollmentStatus.ACTIVE
    ) {
      throw new BadRequestException(
        "Student is already enrolled in the target batch",
      );
    }

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

    const includeAllPrices = options.includeAllPrices === true;
    const hasPlan = target.plans.some(
      (plan) => plan.subscriptionId === membership.subscriptionId,
    );
    if (!hasPlan && !includeAllPrices) {
      throw new BadRequestException(
        "Target batch does not offer the student's current subscription plan",
      );
    }

    await this.scheduleConflicts.assertStudentAvailableForBatch(
      studentId,
      toBatchId,
      { excludeBatchIds: [fromBatchId] },
    );

    return this.prisma.$transaction(async (tx) => {
      await lockBatchRow(tx, toBatchId);
      await assertBatchHasSeat(tx, toBatchId, target.capacity, studentId);

      await tx.batchEnrollment.update({
        where: {
          batchId_studentId: { batchId: fromBatchId, studentId },
        },
        data: endEnrollmentData("SWITCH"),
      });

      return tx.batchEnrollment.upsert({
        where: {
          batchId_studentId: { batchId: toBatchId, studentId },
        },
        update: REACTIVATE_ENROLLMENT_DATA,
        create: {
          batchId: toBatchId,
          studentId,
          status: BatchEnrollmentStatus.ACTIVE,
        },
      });
    });
  }

  async getUnenrollPreview(batchId: string, studentId: string) {
    const enrollment = await this.prisma.batchEnrollment.findFirst({
      where: { batchId, studentId, ...ACTIVE_ENROLLMENT_WHERE },
      include: {
        student: true,
        batch: { select: { id: true, name: true, studioId: true } },
      },
    });

    if (!enrollment) {
      throw new BadRequestException("Student is not enrolled in this batch");
    }

    const refundable = await this.findRefundableInvoice(batchId, studentId);
    const pendingInvoice = await this.findPendingBatchInvoice(
      batchId,
      studentId,
    );
    const futureBookings = await this.prisma.booking.count({
      where: {
        batchId,
        studentId,
        status: {
          in: [
            BookingStatus.PENDING,
            BookingStatus.CONFIRMED,
            BookingStatus.AWAITING_PAYMENT,
          ],
        },
        OR: [
          { startsAt: { gt: new Date() } },
          { session: { startsAt: { gt: new Date() } } },
        ],
      },
    });

    return {
      studentId,
      studentName: this.crypto.decryptUser(enrollment.student).name,
      batchId: enrollment.batch.id,
      batchName: enrollment.batch.name,
      enrolledAt: enrollment.enrolledAt,
      futureBookings,
      pendingInvoice: pendingInvoice
        ? {
            id: pendingInvoice.id,
            amount: Number(pendingInvoice.amount),
            status: pendingInvoice.status,
          }
        : null,
      refundableInvoice: refundable
        ? {
            id: refundable.id,
            amount: Number(refundable.amount),
            refundedAmount: Number(refundable.refundedAmount ?? 0),
            refundableAmount: roundMoney(
              Number(refundable.amount) -
                Number(refundable.refundedAmount ?? 0),
            ),
            paymentMethod: refundable.paymentMethod,
            paidAt: refundable.paidAt,
          }
        : null,
    };
  }

  async unenroll(
    batchId: string,
    studentId: string,
    options: { refund?: boolean; refundAmount?: number } = {},
  ) {
    const enrollment = await this.prisma.batchEnrollment.findFirst({
      where: { batchId, studentId, ...ACTIVE_ENROLLMENT_WHERE },
      include: {
        batch: { select: { id: true, studioId: true, name: true } },
      },
    });

    if (!enrollment) {
      throw new BadRequestException("Student is not enrolled in this batch");
    }

    const refund = options.refund === true;
    let refundedInvoice: {
      id: string;
      amount: number;
      refundedAmount: number;
      thisRefundAmount: number;
      status: InvoiceStatus;
    } | null = null;

    if (refund) {
      const invoice = await this.findRefundableInvoice(batchId, studentId);
      if (!invoice) {
        throw new BadRequestException(
          "No paid invoice available to refund for this enrollment",
        );
      }
      const result = await this.billing.refundInvoice(invoice.id, {
        reason: `Unenrolled from batch ${enrollment.batch.name}`,
        ...(options.refundAmount !== undefined
          ? { amount: options.refundAmount }
          : {}),
      });
      refundedInvoice = {
        id: result.id,
        amount: Number(result.amount),
        refundedAmount: Number(result.refundedAmount),
        thisRefundAmount: Number(result.thisRefundAmount),
        status: result.status,
      };
    }

    const now = new Date();
    const [ended, cancelledBookings, voidedPending] =
      await this.prisma.$transaction(async (tx) => {
        const endedEnrollment = await tx.batchEnrollment.update({
          where: { id: enrollment.id },
          data: endEnrollmentData("UNENROLL", now),
        });

        const cancelled = await tx.booking.updateMany({
          where: {
            batchId,
            studentId,
            status: {
              in: [
                BookingStatus.PENDING,
                BookingStatus.CONFIRMED,
                BookingStatus.AWAITING_PAYMENT,
              ],
            },
            OR: [
              { startsAt: { gt: now } },
              { session: { startsAt: { gt: now } } },
            ],
          },
          data: {
            status: BookingStatus.CANCELLED,
            paymentHoldExpiresAt: null,
          },
        });

        const pendingIds = await tx.invoice.findMany({
          where: {
            status: {
              in: [InvoiceStatus.PENDING, InvoiceStatus.OVERDUE],
            },
            OR: [
              {
                studentId,
                purchaseMeta: {
                  path: ["batchId"],
                  equals: batchId,
                },
              },
            ],
          },
          select: { id: true },
        });

        if (pendingIds.length > 0) {
          await tx.invoice.deleteMany({
            where: { id: { in: pendingIds.map((row) => row.id) } },
          });
        }

        return [endedEnrollment, cancelled.count, pendingIds.length] as const;
      });

    return {
      enrollment: ended,
      cancelledFutureBookings: cancelledBookings,
      voidedPendingInvoices: voidedPending,
      refundedInvoice,
    };
  }

  private async findPendingBatchInvoice(batchId: string, studentId: string) {
    return this.prisma.invoice.findFirst({
      where: {
        studentId,
        status: { in: [InvoiceStatus.PENDING, InvoiceStatus.OVERDUE] },
        purchaseMeta: {
          path: ["batchId"],
          equals: batchId,
        },
      },
      orderBy: { id: "desc" },
    });
  }

  private async findRefundableInvoice(batchId: string, studentId: string) {
    const batch = await this.prisma.batch.findUnique({
      where: { id: batchId },
      select: {
        studioId: true,
        plans: { select: { subscriptionId: true } },
      },
    });
    if (!batch) {
      return null;
    }

    const planSubscriptionIds = batch.plans.map((plan) => plan.subscriptionId);
    if (planSubscriptionIds.length === 0) {
      return null;
    }

    const membership = await this.memberships.findActiveForBatch(
      studentId,
      batchId,
    );

    const byMembership = membership
      ? await this.prisma.invoice.findFirst({
          where: {
            status: InvoiceStatus.PAID,
            membershipId: membership.id,
            membership: {
              subscription: {
                kind: SubscriptionKind.INDIVIDUAL,
                id: { in: planSubscriptionIds },
              },
            },
          },
          orderBy: { paidAt: "desc" },
        })
      : null;

    if (byMembership) {
      return byMembership;
    }

    return this.prisma.invoice.findFirst({
      where: {
        status: InvoiceStatus.PAID,
        studioId: batch.studioId,
        membership: {
          subscription: {
            kind: SubscriptionKind.INDIVIDUAL,
            id: { in: planSubscriptionIds },
          },
          coveredStudents: { some: { studentId } },
        },
      },
      orderBy: { paidAt: "desc" },
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
          _count: {
            select: { enrollments: { where: ACTIVE_ENROLLMENT_WHERE } },
          },
        },
      });
    });
  }

  async getRevenue(
    id: string,
    options: { period?: "all" | "month" } = {},
  ) {
    const period = options.period ?? "all";
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
    const enrolledCount = batch.enrollments.filter(
      (enrollment) => enrollment.status === BatchEnrollmentStatus.ACTIVE,
    ).length;

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

    const monthRange =
      period === "month" ? currentCalendarMonthRange(new Date()) : null;

    if (studentIds.length > 0) {
      const studentIdSet = new Set(studentIds);
      const [invoices, studioEnrollments] = await Promise.all([
        this.prisma.invoice.findMany({
          where: {
            studioId: batch.studioId,
            OR: [
              {
                studentId: { in: studentIds },
                membershipId: { not: null },
              },
              { combineMeta: { not: Prisma.DbNull } },
            ],
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
        }),
        this.prisma.batchEnrollment.findMany({
          where: {
            studentId: { in: studentIds },
            status: BatchEnrollmentStatus.ACTIVE,
            batch: { studioId: batch.studioId },
          },
          select: { studentId: true, batchId: true },
        }),
      ]);

      const studentBatchMap = new Map<string, Set<string>>();
      for (const enrollment of studioEnrollments) {
        const set = studentBatchMap.get(enrollment.studentId) ?? new Set();
        set.add(enrollment.batchId);
        studentBatchMap.set(enrollment.studentId, set);
      }

      for (const invoice of invoices) {
        if (
          monthRange &&
          !invoiceMatchesRevenuePeriod(invoice, monthRange)
        ) {
          continue;
        }

        const combineMeta = parseCombineMeta(invoice.combineMeta);
        if (combineMeta) {
          for (const source of combineMeta.sources) {
            const sourceBatchId =
              source.batchId ?? source.purchaseMeta?.batchId ?? null;
            if (sourceBatchId !== batch.id) {
              continue;
            }
            const amount = source.netAmount;
            totals.invoiceCount += 1;
            if (invoice.status === InvoiceStatus.PAID) {
              totals.collected += amount;
            } else if (invoice.status === InvoiceStatus.PENDING) {
              totals.pending += amount;
            } else if (invoice.status === InvoiceStatus.OVERDUE) {
              totals.overdue += amount;
            }
          }
          continue;
        }

        if (!invoice.membershipId) {
          continue;
        }

        const purchaseMeta = parsePurchaseMeta(invoice.purchaseMeta);
        const invoiceBatchId =
          purchaseMeta?.batchId ??
          purchaseMeta?.coveredStudents.find(
            (seat) =>
              seat.studentId === invoice.studentId &&
              typeof seat.batchId === "string",
          )?.batchId ??
          null;

        // Attribute by invoice batch, not "student is enrolled somewhere".
        // Missing meta + multi-batch students would otherwise double-count.
        if (invoiceBatchId) {
          if (invoiceBatchId !== batch.id) {
            continue;
          }
        } else if (!studentIdSet.has(invoice.studentId)) {
          continue;
        } else {
          const enrolledBatches = studentBatchMap.get(invoice.studentId);
          if (!enrolledBatches || enrolledBatches.size !== 1) {
            continue;
          }
        }

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

        if (invoice.status === InvoiceStatus.PAID) {
          totals.collected += amount;
          if (bucket) {
            bucket.collected += amount;
          }
        } else if (invoice.status === InvoiceStatus.PENDING) {
          totals.pending += amount;
          if (bucket) {
            bucket.pending += amount;
          }
        } else if (invoice.status === InvoiceStatus.OVERDUE) {
          totals.overdue += amount;
          if (bucket) {
            bucket.overdue += amount;
          }
        }
      }
    }

    return {
      period,
      from: monthRange?.from.toISOString() ?? null,
      to: monthRange?.to.toISOString() ?? null,
      enrolledCount,
      totals,
      bySubscription: [...bySubscriptionMap.values()],
    };
  }
}

function currentCalendarMonthRange(now: Date) {
  const from = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const to = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59,
    999,
  );
  return { from, to };
}

function invoiceMatchesRevenuePeriod(
  invoice: {
    status: InvoiceStatus;
    paidAt: Date | null;
  },
  range: { from: Date; to: Date },
) {
  if (
    invoice.status === InvoiceStatus.PENDING ||
    invoice.status === InvoiceStatus.OVERDUE
  ) {
    return true;
  }
  if (invoice.status !== InvoiceStatus.PAID || !invoice.paidAt) {
    return false;
  }
  return invoice.paidAt >= range.from && invoice.paidAt <= range.to;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}
