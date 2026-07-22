import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  BillingCadence,
  BookingStatus,
  EnrollmentMode,
  PlanType,
  type Prisma,
  SessionStatus,
  UserRole,
} from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import type { DecryptedUser } from "../users/user-crypto.service";
import { UserCryptoService } from "../users/user-crypto.service";

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

const batchPlanInclude = {
  monthlyPlan: true,
  fullBatchPlan: true,
} as const;

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
    monthlyPlan?: { priceMonthly?: unknown } | null;
    fullBatchPlan?: { priceMonthly?: unknown } | null;
    branch?: {
      photos?: string[] | null;
      coverMedia?: { objectKey?: string | null } | null;
      media?: Array<{ objectKey?: string | null }> | null;
    } | null;
    coverImageUrl?: string | null;
    trainers: { trainer: Record<string, unknown> }[];
  },
>(batch: T) {
  const enrollmentCount =
    batch._count?.enrollments ?? batch.enrollments?.length ?? 0;
  const remainingSeats = Math.max(0, batch.capacity - enrollmentCount);
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
    durationMinutes: durationMinutesFromSchedule(batch.scheduleJson),
    scheduleLabel: scheduleLabelFrom(batch.scheduleJson),
    styleBadge: primaryStyleFrom(batch.danceCategories),
    coverImageUrl,
    priceMonthly:
      batch.monthlyPlan?.priceMonthly ??
      batch.fullBatchPlan?.priceMonthly ??
      null,
  };
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

function buildSessions(schedule: BatchSchedule) {
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

  const sessions: { startsAt: Date; endsAt: Date }[] = [];
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
  desiredSessions: { startsAt: Date; endsAt: Date }[],
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
      })),
    });
  }

  for (const desired of desiredSessions) {
    const match = existing.find(
      (session) =>
        session.startsAt.toISOString() === desired.startsAt.toISOString(),
    );
    if (match && match.endsAt.getTime() !== desired.endsAt.getTime()) {
      await tx.session.update({
        where: { id: match.id },
        data: { endsAt: desired.endsAt },
      });
    }
  }
}

@Injectable()
export class BatchesService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(UserCryptoService) private readonly crypto: UserCryptoService,
  ) {}

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
        ...batchPlanInclude,
        branch: { include: branchCoverInclude },
        certificateTemplate: true,
        trainers: { include: { trainer: true } },
        _count: { select: { enrollments: true } },
      },
      orderBy: { name: "asc" },
    });

    const mapped = batches.map((batch) => {
      const trainers = batch.trainers.map((row) => ({
        ...row,
        trainer: this.crypto.decryptUser(row.trainer),
      }));
      return shapeDiscoverBatch({ ...batch, trainers });
    });

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
        ...batchPlanInclude,
        branch: { include: branchCoverInclude },
        certificateTemplate: true,
        sessions: { orderBy: { startsAt: "asc" } },
        trainers: { include: { trainer: true } },
        _count: { select: { enrollments: true } },
      },
    });

    const trainers = batch.trainers.map((row) => ({
      ...row,
      trainer: this.crypto.decryptUser(row.trainer),
    }));
    const enrollments = batch.enrollments.map((enrollment) => ({
      ...enrollment,
      student: this.crypto.decryptUser(enrollment.student),
    }));

    let viewerRating: number | null = null;
    let viewerEnrolled = false;
    let viewerBooking: {
      id: string;
      type: string;
      status: BookingStatus;
      notes: string | null;
      startsAt: Date | null;
      endsAt: Date | null;
    } | null = null;

    if (options?.studentId) {
      viewerEnrolled = batch.enrollments.some(
        (enrollment) => enrollment.studentId === options.studentId,
      );
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
            status: {
              in: [BookingStatus.PENDING, BookingStatus.CONFIRMED],
            },
          },
          orderBy: [{ status: "asc" }, { id: "desc" }],
          select: {
            id: true,
            type: true,
            status: true,
            notes: true,
            startsAt: true,
            endsAt: true,
          },
        }),
      ]);
      viewerRating = existingRating?.rating ?? null;
      viewerBooking = openBooking;
    }

    return {
      ...shapeDiscoverBatch({
        ...batch,
        trainers,
        enrollments,
      }),
      viewerRating,
      viewerEnrolled,
      viewerBooking,
    };
  }

  async create(
    creatorId: string,
    data: {
      studioId: string;
      name: string;
      category: Prisma.BatchCreateInput["category"];
      monthlyPlanId?: string | null;
      fullBatchPlanId?: string | null;
      branchId: string;
      trainerIds: string[];
      danceCategories: { name: string; description: string }[];
      scheduleJson: Prisma.InputJsonValue;
      capacity: number;
      enrollmentMode: EnrollmentMode;
      active?: boolean;
      certificationEnabled?: boolean;
      certificateTemplateId?: string | null;
      coverImageUrl?: string | null;
      ratingAvg?: number | null;
      ratingCount?: number;
    },
  ) {
    const schedule = data.scheduleJson as unknown as BatchSchedule;
    const sessions = buildSessions(schedule);
    const trainerIds = [...new Set(data.trainerIds)];
    const certificationEnabled = data.certificationEnabled ?? false;
    const monthlyPlanId = data.monthlyPlanId || null;
    const fullBatchPlanId = data.fullBatchPlanId || null;

    if (!monthlyPlanId && !fullBatchPlanId) {
      throw new BadRequestException(
        "Select at least one monthly or full-batch plan",
      );
    }

    const [monthlyPlan, fullBatchPlan, trainers, branch, certificateTemplate] =
      await Promise.all([
        monthlyPlanId
          ? this.prisma.plan.findUnique({ where: { id: monthlyPlanId } })
          : Promise.resolve(null),
        fullBatchPlanId
          ? this.prisma.plan.findUnique({ where: { id: fullBatchPlanId } })
          : Promise.resolve(null),
        this.prisma.user.findMany({ where: { id: { in: trainerIds } } }),
        this.prisma.studioBranch.findUnique({ where: { id: data.branchId } }),
        certificationEnabled && data.certificateTemplateId
          ? this.prisma.certificateTemplate.findUnique({
              where: { id: data.certificateTemplateId },
            })
          : Promise.resolve(null),
      ]);

    if (monthlyPlanId) {
      this.assertBatchPlanSlot(
        monthlyPlan,
        data.studioId,
        BillingCadence.MONTHLY,
        "monthly",
      );
    }
    if (fullBatchPlanId) {
      this.assertBatchPlanSlot(
        fullBatchPlan,
        data.studioId,
        BillingCadence.FULL_BATCH,
        "full-batch",
      );
    }

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

    return this.prisma.batch.create({
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
        monthlyPlanId,
        fullBatchPlanId,
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
      },
      include: {
        ...batchPlanInclude,
        branch: { include: branchCoverInclude },
        certificateTemplate: true,
        sessions: { orderBy: { startsAt: "asc" } },
        trainers: { include: { trainer: true } },
      },
    });
  }

  async update(
    id: string,
    data: {
      name?: string;
      monthlyPlanId?: string | null;
      fullBatchPlanId?: string | null;
      branchId?: string;
      trainerIds?: string[];
      danceCategories?: { name: string; description: string }[];
      scheduleJson?: Prisma.InputJsonValue;
      capacity?: number;
      enrollmentMode?: EnrollmentMode;
      active?: boolean;
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

    const plansTouched =
      data.monthlyPlanId !== undefined || data.fullBatchPlanId !== undefined;
    const nextMonthlyPlanId =
      data.monthlyPlanId !== undefined
        ? data.monthlyPlanId || null
        : batch.monthlyPlanId;
    const nextFullBatchPlanId =
      data.fullBatchPlanId !== undefined
        ? data.fullBatchPlanId || null
        : batch.fullBatchPlanId;

    if (plansTouched) {
      if (!nextMonthlyPlanId && !nextFullBatchPlanId) {
        throw new BadRequestException(
          "Select at least one monthly or full-batch plan",
        );
      }

      const [monthlyPlan, fullBatchPlan] = await Promise.all([
        nextMonthlyPlanId
          ? this.prisma.plan.findUnique({ where: { id: nextMonthlyPlanId } })
          : Promise.resolve(null),
        nextFullBatchPlanId
          ? this.prisma.plan.findUnique({ where: { id: nextFullBatchPlanId } })
          : Promise.resolve(null),
      ]);

      if (nextMonthlyPlanId) {
        this.assertBatchPlanSlot(
          monthlyPlan,
          batch.studioId,
          BillingCadence.MONTHLY,
          "monthly",
        );
      }
      if (nextFullBatchPlanId) {
        this.assertBatchPlanSlot(
          fullBatchPlan,
          batch.studioId,
          BillingCadence.FULL_BATCH,
          "full-batch",
        );
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
      ? buildSessions(data.scheduleJson as unknown as BatchSchedule)
      : undefined;

    const {
      trainerIds: incomingTrainerIds,
      scheduleJson,
      danceCategories,
      monthlyPlanId,
      fullBatchPlanId,
      ...batchData
    } = data;

    return this.prisma.$transaction(async (tx) => {
      if (trainerIds) {
        await tx.batchTrainer.deleteMany({ where: { batchId: id } });
        await tx.batchTrainer.createMany({
          data: trainerIds.map((trainerId) => ({ batchId: id, trainerId })),
        });
      }

      if (desiredSessions) {
        await syncBatchSessions(tx, id, desiredSessions);
      }

      return tx.batch.update({
        where: { id },
        data: {
          ...batchData,
          ...(monthlyPlanId !== undefined
            ? { monthlyPlanId: monthlyPlanId || null }
            : {}),
          ...(fullBatchPlanId !== undefined
            ? { fullBatchPlanId: fullBatchPlanId || null }
            : {}),
          ...(danceCategories ? { danceCategories } : {}),
          ...(scheduleJson ? { scheduleJson } : {}),
          certificateTemplateId: certificationEnabled
            ? certificateTemplateId
            : null,
          certificationEnabled,
        },
        include: {
          branch: { include: branchCoverInclude },
          ...batchPlanInclude,
          certificateTemplate: true,
          sessions: { orderBy: { startsAt: "asc" } },
          trainers: { include: { trainer: true } },
        },
      });
    });
  }

  remove(id: string) {
    return this.prisma.batch.delete({ where: { id } });
  }

  async enroll(batchId: string, studentId: string, actor: DecryptedUser) {
    const staffRoles: UserRole[] = [
      UserRole.OWNER,
      UserRole.STAFF,
      UserRole.TRAINER,
    ];
    const isStaff = staffRoles.includes(actor.role);

    if (!isStaff) {
      if (actor.role === UserRole.STUDENT && actor.id !== studentId) {
        throw new ForbiddenException("Students can only enroll themselves");
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

    if (batch.enrollments.length >= batch.capacity) {
      throw new BadRequestException("Batch is at capacity");
    }

    return this.prisma.batchEnrollment.upsert({
      where: {
        batchId_studentId: { batchId, studentId },
      },
      update: {},
      create: { batchId, studentId },
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
          ...batchPlanInclude,
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
        ...batchPlanInclude,
        enrollments: true,
      },
    });

    if (!batch) {
      throw new NotFoundException("Batch not found");
    }

    const planIds = [batch.monthlyPlanId, batch.fullBatchPlanId].filter(
      (planId): planId is string => Boolean(planId),
    );
    const studentIds = batch.enrollments.map(
      (enrollment) => enrollment.studentId,
    );

    type PlanSummary = {
      id: string;
      name: string;
      billingCadence: BillingCadence;
      priceMonthly: number;
      type: PlanType;
    };

    const toPlanSummary = (
      plan: {
        id: string;
        name: string;
        billingCadence: BillingCadence;
        priceMonthly: unknown;
        type: PlanType;
      } | null,
    ): PlanSummary | null =>
      plan
        ? {
            id: plan.id,
            name: plan.name,
            billingCadence: plan.billingCadence,
            priceMonthly: Number(plan.priceMonthly),
            type: plan.type,
          }
        : null;

    const emptyBucket = () => ({
      collected: 0,
      pending: 0,
      overdue: 0,
      invoiceCount: 0,
    });

    const byPlanMap = new Map(
      planIds.map((planId) => {
        const plan =
          batch.monthlyPlanId === planId
            ? batch.monthlyPlan
            : batch.fullBatchPlan;
        return [
          planId,
          {
            planId,
            billingCadence:
              plan?.billingCadence ??
              (batch.monthlyPlanId === planId
                ? BillingCadence.MONTHLY
                : BillingCadence.FULL_BATCH),
            name: plan?.name ?? planId,
            ...emptyBucket(),
          },
        ];
      }),
    );

    const totals = emptyBucket();

    if (studentIds.length > 0 && planIds.length > 0) {
      const invoices = await this.prisma.invoice.findMany({
        where: {
          studioId: batch.studioId,
          studentId: { in: studentIds },
          subscription: { planId: { in: planIds } },
        },
        include: {
          subscription: { select: { planId: true } },
        },
      });

      for (const invoice of invoices) {
        const amount = Number(invoice.amount);
        const planId = invoice.subscription?.planId;
        const bucket = planId ? byPlanMap.get(planId) : undefined;

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
      monthlyPlan: toPlanSummary(batch.monthlyPlan),
      fullBatchPlan: toPlanSummary(batch.fullBatchPlan),
      enrolledCount: batch.enrollments.length,
      totals,
      byPlan: [...byPlanMap.values()],
    };
  }

  private assertBatchPlanSlot(
    plan: {
      studioId: string;
      type: PlanType;
      billingCadence: BillingCadence;
      active: boolean;
    } | null,
    studioId: string,
    expectedCadence: BillingCadence,
    label: string,
  ) {
    if (
      !plan?.active ||
      plan.studioId !== studioId ||
      plan.type !== PlanType.FIXED_BATCH ||
      plan.billingCadence !== expectedCadence
    ) {
      throw new BadRequestException(
        `Select an available fixed-batch ${label} plan`,
      );
    }
  }
}
