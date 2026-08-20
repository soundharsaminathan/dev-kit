import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import {
  BatchEnrollmentStatus,
  type BillingCadence,
  BookingStatus,
  type IndividualAudience,
  SessionStatus,
  SessionType,
  type SubscriptionKind,
} from "@prisma/client";
import {
  accumulatePaidMonths,
  paidMonthsInvoiceSelect,
  paidMonthsInvoiceWhere,
} from "../../billing/family-combine";
import { MediaService } from "../../media/media.service";
import { MembershipsService } from "../../memberships/memberships.service";
import { PrismaService } from "../../prisma/prisma.service";
import { buildPage, type Page } from "../../shared/pagination";
import { matchesPersonSearch } from "../../users/person-search";
import { userPiiSelect } from "../../users/user-crypto.service";
import { UserPresenter } from "../../users/user-presenter";
import {
  compareAttendanceRisk,
  computeAttendanceMonthCounts,
  isSessionEligibleForEnrollment,
  parseAttendanceMonthKey,
} from "../attendance-month";
import type { DiscoverBatchFilters } from "../batches.service";
import { inactiveReasonFromEndReason } from "../enrollment-status";
import { BatchQuery } from "../persistence/batch.query";

type BatchDayTime = {
  weekday: number;
  startTime: string;
  endTime: string;
};

type BatchSchedule = {
  frequency: "DAILY" | "WEEKLY";
  weekdays: number[];
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  dayTimes?: BatchDayTime[];
  utcOffsetMinutes: number;
};

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function minutesFromHhmm(value: string) {
  return Number(value.slice(0, 2)) * 60 + Number(value.slice(3));
}

function durationMinutesFromSchedule(schedule: unknown): number | null {
  if (!schedule || typeof schedule !== "object") return null;
  const s = schedule as Partial<BatchSchedule>;
  const sample =
    s.dayTimes?.[0] ??
    (s.startTime && s.endTime
      ? { startTime: s.startTime, endTime: s.endTime }
      : null);
  if (!sample?.startTime || !sample.endTime) return null;
  const start = minutesFromHhmm(sample.startTime);
  const end = minutesFromHhmm(sample.endTime);
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
  const dayTimes = [...(s.dayTimes ?? [])].sort(
    (a, b) => a.weekday - b.weekday,
  );
  if (dayTimes.length > 0) {
    const uniqueRanges = new Set(
      dayTimes.map((slot) => `${slot.startTime}|${slot.endTime}`),
    );
    if (uniqueRanges.size === 1) {
      const first = dayTimes[0];
      if (!first) {
        return `${s.startTime}–${s.endTime}`;
      }
      const days = dayTimes
        .map((slot) => WEEKDAY_LABELS[slot.weekday] ?? "")
        .filter(Boolean)
        .join(", ");
      return days
        ? `${days} · ${first.startTime}–${first.endTime}`
        : `${first.startTime}–${first.endTime}`;
    }
    const parts = dayTimes
      .map((slot) => {
        const label = WEEKDAY_LABELS[slot.weekday] ?? "";
        return label ? `${label} ${slot.startTime}–${slot.endTime}` : null;
      })
      .filter(Boolean);
    if (parts.length > 0) return parts.join(", ");
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

@Injectable()
export class BatchQueriesService {
  constructor(
    @Inject(BatchQuery) private readonly query: BatchQuery,
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(UserPresenter) private readonly users: UserPresenter,
    @Inject(MediaService) private readonly media: MediaService,
    @Inject(MembershipsService)
    private readonly memberships: MembershipsService,
  ) {}

  async listByStudio(
    studioId: string,
    filters: DiscoverBatchFilters = {},
    pagination: { cursor?: string; limit?: number } = {},
  ): Promise<Page<Record<string, unknown>>> {
    const { rows, limit } = await this.query.findDiscoverCards(
      studioId,
      filters,
      pagination,
    );

    const mapped = await Promise.all(
      rows.map(async (batch) => this.shapeCard(batch)),
    );

    const styleFilter = filters.style?.toLowerCase();
    let items = styleFilter
      ? mapped.filter(
          (batch) =>
            (batch.styleBadge as string | null | undefined)?.toLowerCase() ===
            styleFilter,
        )
      : mapped;

    if (filters.studentId && items.length > 0) {
      items = await this.withViewerBadges(items, filters.studentId);
    }

    return buildPage(items, limit, (row) => row.id as string);
  }

  async getHeader(id: string, options?: { studentId?: string }) {
    const batch = await this.query.findHeader(id);
    const shaped = await this.shapeCard(batch, {
      includeSessions: true,
      includeCertificate: true,
    });

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
      const [enrollment, existingRating, openBooking] = await Promise.all([
        this.prisma.batchEnrollment.findFirst({
          where: {
            batchId: id,
            studentId: options.studentId,
            status: BatchEnrollmentStatus.ACTIVE,
          },
          select: { enrolledAt: true },
        }),
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
      viewerEnrolled = Boolean(enrollment);
      viewerEnrollment = enrollment
        ? { enrolledAt: enrollment.enrolledAt }
        : null;
      viewerRating = existingRating?.rating ?? null;
      viewerBooking = openBooking;
    }

    return {
      ...shaped,
      enrollments: [],
      inactiveEnrollments: [],
      viewerRating,
      viewerEnrolled,
      viewerEnrollment,
      viewerBooking,
    };
  }

  async getRoster(
    batchId: string,
    pagination: {
      cursor?: string;
      limit?: number;
      tab?: "active" | "inactive";
      q?: string;
    },
  ): Promise<Page<Record<string, unknown>>> {
    const query = pagination.q?.trim() ?? "";
    const batch = await this.query.findStudioId(batchId);
    const { rows, limit, tab } = await this.query.findRoster(batchId, {
      cursor: pagination.cursor,
      limit: pagination.limit,
      tab: pagination.tab,
      searchAll: Boolean(query),
    });

    const studentIds = rows.map((row) => row.studentId);
    let monthlyUnpaidIds = new Set<string>();
    let paidMonthsByStudent = new Map<string, number>();

    if (tab === "active" && batch && studentIds.length > 0) {
      monthlyUnpaidIds =
        await this.memberships.findMonthlyUnpaidStudentIds(studentIds);
      const paidInvoices = await this.prisma.invoice.findMany({
        where: paidMonthsInvoiceWhere(batch.studioId, studentIds),
        select: paidMonthsInvoiceSelect,
      });
      paidMonthsByStudent = accumulatePaidMonths(paidInvoices, {
        onlyStudentIds: new Set(studentIds),
      });
    }

    const presentedStudents = await this.users.presentLiteMany(
      rows.map((row) => row.student),
      { email: true, phone: true },
    );

    const mapped = rows.map((row, index) => {
      const student = {
        ...presentedStudents[index],
        styles: row.student.styles,
        createdAt: row.student.createdAt,
      };

      if (tab === "inactive") {
        return {
          id: row.id,
          studentId: row.studentId,
          enrolledAt: row.enrolledAt,
          endedAt: row.endedAt,
          endReason: row.endReason,
          endNote: row.endNote,
          inactiveReason: inactiveReasonFromEndReason(row.endReason),
          student,
        };
      }

      return {
        id: row.id,
        studentId: row.studentId,
        enrolledAt: row.enrolledAt,
        monthlyUnpaid: monthlyUnpaidIds.has(row.studentId),
        paidMonths: paidMonthsByStudent.get(row.studentId) ?? 0,
        student,
      };
    });

    const filtered = query
      ? mapped.filter((row) =>
          matchesPersonSearch(
            {
              name: row.student.name,
              email: row.student.email,
              phone: row.student.phone,
            },
            query,
          ),
        )
      : mapped;

    if (!query) {
      return buildPage(filtered, limit, (row) => row.id as string);
    }

    let startIndex = 0;
    if (pagination.cursor) {
      const cursorIndex = filtered.findIndex(
        (row) => row.id === pagination.cursor,
      );
      startIndex = cursorIndex >= 0 ? cursorIndex + 1 : 0;
    }
    const page = filtered.slice(startIndex, startIndex + limit);
    const hasMore = startIndex + page.length < filtered.length;
    return {
      items: page,
      nextCursor: hasMore
        ? ((page[page.length - 1]?.id as string) ?? null)
        : null,
      limit,
    };
  }

  async getAttendanceSummary(
    batchId: string,
    options: { month?: string } = {},
  ) {
    const batch = await this.prisma.batch.findUnique({
      where: { id: batchId },
      select: { id: true },
    });
    if (!batch) {
      throw new NotFoundException("Batch not found");
    }

    const { month, periodStart, periodEnd } = parseAttendanceMonthKey(
      options.month,
    );

    const [sessions, enrollments] = await Promise.all([
      this.prisma.session.findMany({
        where: {
          batchId,
          type: SessionType.REGULAR,
          status: { not: SessionStatus.CANCELLED },
          startsAt: { gte: periodStart, lt: periodEnd },
        },
        select: {
          id: true,
          startsAt: true,
          type: true,
          status: true,
        },
        orderBy: { startsAt: "asc" },
      }),
      this.prisma.batchEnrollment.findMany({
        where: {
          batchId,
          enrolledAt: { lt: periodEnd },
          OR: [
            { status: BatchEnrollmentStatus.ACTIVE },
            {
              status: BatchEnrollmentStatus.ENDED,
              endedAt: { gt: periodStart },
            },
          ],
        },
        select: {
          studentId: true,
          enrolledAt: true,
          status: true,
          endedAt: true,
          student: {
            select: {
              id: true,
              photoUrl: true,
              ...userPiiSelect,
            },
          },
        },
      }),
    ]);

    const sessionIds = sessions.map((session) => session.id);
    const marks =
      sessionIds.length === 0
        ? []
        : await this.prisma.attendance.findMany({
            where: {
              sessionId: { in: sessionIds },
              studentId: {
                in: enrollments.map((row) => row.studentId),
              },
            },
            select: {
              sessionId: true,
              studentId: true,
              status: true,
            },
          });

    const counts = computeAttendanceMonthCounts({
      enrollments,
      sessions,
      marks,
      periodStart,
      periodEnd,
    });

    const presentedStudents = await this.users.presentLiteMany(
      enrollments.map((row) => row.student),
    );
    const studentById = new Map(
      presentedStudents.map((student) => [student.id, student]),
    );
    const countsById = new Map(counts.map((row) => [row.studentId, row]));

    const students = enrollments
      .map((row) => {
        const student = studentById.get(row.studentId);
        const count = countsById.get(row.studentId);
        if (!student || !count) return null;
        return {
          studentId: row.studentId,
          student: {
            id: student.id,
            name: student.name,
            photoUrl: student.photoUrl,
          },
          eligibleCount: count.eligibleCount,
          presentCount: count.presentCount,
          absentCount: count.absentCount,
          unmarkedCount: count.unmarkedCount,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row != null)
      .sort((a, b) =>
        compareAttendanceRisk(
          {
            presentCount: a.presentCount,
            eligibleCount: a.eligibleCount,
            name: a.student.name,
          },
          {
            presentCount: b.presentCount,
            eligibleCount: b.eligibleCount,
            name: b.student.name,
          },
        ),
      );

    return {
      month,
      sessionCount: sessions.length,
      students,
    };
  }

  async getStudentAttendanceDetail(
    batchId: string,
    studentId: string,
    options: { month?: string } = {},
  ) {
    const batch = await this.prisma.batch.findUnique({
      where: { id: batchId },
      select: { id: true },
    });
    if (!batch) {
      throw new NotFoundException("Batch not found");
    }

    const { month, periodStart, periodEnd } = parseAttendanceMonthKey(
      options.month,
    );

    const [sessions, enrollment] = await Promise.all([
      this.prisma.session.findMany({
        where: {
          batchId,
          type: SessionType.REGULAR,
          status: { not: SessionStatus.CANCELLED },
          startsAt: { gte: periodStart, lt: periodEnd },
        },
        select: {
          id: true,
          startsAt: true,
          type: true,
          status: true,
        },
        orderBy: { startsAt: "asc" },
      }),
      this.prisma.batchEnrollment.findFirst({
        where: { batchId, studentId },
        select: {
          studentId: true,
          enrolledAt: true,
          status: true,
          endedAt: true,
          student: {
            select: {
              id: true,
              photoUrl: true,
              ...userPiiSelect,
            },
          },
        },
      }),
    ]);

    if (!enrollment) {
      throw new NotFoundException("Student is not enrolled in this batch");
    }

    const sessionIds = sessions.map((session) => session.id);
    const marks =
      sessionIds.length === 0
        ? []
        : await this.prisma.attendance.findMany({
            where: {
              sessionId: { in: sessionIds },
              studentId,
            },
            select: {
              sessionId: true,
              status: true,
            },
          });
    const marksBySession = new Map(
      marks.map((mark) => [mark.sessionId, mark.status]),
    );

    const detailSessions = sessions
      .filter((session) => isSessionEligibleForEnrollment(session, enrollment))
      .map((session) => ({
        id: session.id,
        startsAt: session.startsAt,
        type: session.type,
        status: session.status,
        attendance: marksBySession.get(session.id) ?? null,
      }));

    const [countsRow] = computeAttendanceMonthCounts({
      enrollments: [enrollment],
      sessions,
      marks: marks.map((mark) => ({
        sessionId: mark.sessionId,
        studentId,
        status: mark.status,
      })),
      periodStart,
      periodEnd,
    });

    const presented = await this.users.presentLiteMany([enrollment.student]);
    const student = presented[0];

    const {
      eligibleCount = 0,
      presentCount = 0,
      absentCount = 0,
      unmarkedCount = 0,
    } = countsRow ?? {};

    return {
      month,
      student: student
        ? { id: student.id, name: student.name, photoUrl: student.photoUrl }
        : { id: studentId, name: "Student", photoUrl: null },
      sessionCount: detailSessions.length,
      sessions: detailSessions,
      counts: {
        eligibleCount,
        presentCount,
        absentCount,
        unmarkedCount,
      },
    };
  }

  private async shapeCard(
    batch: {
      id: string;
      studioId: string;
      name: string;
      category: unknown;
      branchId: string;
      scheduleJson: unknown;
      danceCategories: unknown;
      capacity: number;
      active: boolean;
      coverImageUrl: string | null;
      ratingAvg: number | null;
      ratingCount: number;
      enrollmentMode: unknown;
      summary: {
        capacity: number;
        enrolled: number;
        reserved: number;
        availableSeats: number;
        trainerCount: number;
        active: boolean;
      } | null;
      trainers: Array<{
        trainerId: string;
        trainer: {
          id: string;
          photoUrl: string | null;
          encryptedKey: string;
          piiCiphertext: string;
          piiIv: string;
        };
      }>;
      plans: Array<{
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
      }>;
      branch: {
        id: string;
        name: string;
        address: string;
        coverMedia: { objectKey: string } | null;
        media: Array<{ objectKey: string }>;
      } | null;
      _count: { enrollments: number };
      sessions?: Array<{
        id: string;
        startsAt: Date;
        endsAt: Date;
        status: unknown;
        type: unknown;
      }>;
      certificationEnabled?: boolean;
      certificateTemplateId?: string | null;
      certificateTemplate?: unknown;
    },
    options: { includeSessions?: boolean; includeCertificate?: boolean } = {},
  ) {
    const { plans, price } = extractPlans(batch.plans);
    const enrollmentCount = batch.summary?.enrolled ?? batch._count.enrollments;
    const reserved = batch.summary?.reserved ?? 0;
    const occupied = batch.summary
      ? batch.summary.enrolled + batch.summary.reserved
      : enrollmentCount;
    const remainingSeats = batch.summary
      ? batch.summary.availableSeats
      : Math.max(0, batch.capacity - occupied);

    const coverKey =
      batch.coverImageUrl ||
      batch.branch?.coverMedia?.objectKey ||
      batch.branch?.media?.[0]?.objectKey ||
      null;

    const presentedTrainers = await this.users.presentLiteMany(
      batch.trainers.map((row) => row.trainer),
    );
    const trainers = batch.trainers.map((row, index) => ({
      trainerId: row.trainerId,
      trainer: presentedTrainers[index],
    }));

    let branch: Record<string, unknown> | null = null;
    if (batch.branch) {
      const branchCoverKey =
        batch.branch.coverMedia?.objectKey ||
        batch.branch.media?.[0]?.objectKey ||
        null;
      branch = {
        id: batch.branch.id,
        name: batch.branch.name,
        address: batch.branch.address,
        coverImageUrl: await this.media.signReadUrl(branchCoverKey),
      };
    }

    return {
      id: batch.id,
      studioId: batch.studioId,
      name: batch.name,
      category: batch.category,
      branchId: batch.branchId,
      scheduleJson: batch.scheduleJson,
      danceCategories: batch.danceCategories,
      capacity: batch.capacity,
      active: batch.active,
      ratingAvg: batch.ratingAvg,
      ratingCount: batch.ratingCount,
      enrollmentMode: batch.enrollmentMode,
      coverImageUrl: await this.media.signReadUrl(coverKey),
      trainers,
      plans,
      price,
      branch,
      enrollmentCount,
      occupiedSeats: occupied,
      remainingSeats,
      reservedSeats: reserved,
      durationMinutes: durationMinutesFromSchedule(batch.scheduleJson),
      scheduleLabel: scheduleLabelFrom(batch.scheduleJson),
      styleBadge: primaryStyleFrom(batch.danceCategories),
      summary: batch.summary,
      ...(options.includeSessions ? { sessions: batch.sessions ?? [] } : {}),
      ...(options.includeCertificate
        ? {
            certificationEnabled: batch.certificationEnabled,
            certificateTemplateId: batch.certificateTemplateId,
            certificateTemplate: batch.certificateTemplate,
          }
        : {}),
    };
  }

  private async withViewerBadges<T extends Record<string, unknown>>(
    items: T[],
    studentId: string,
  ): Promise<T[]> {
    const batchIds = items.map((item) => item.id as string);
    const [enrollments, openBookings] = await Promise.all([
      this.prisma.batchEnrollment.findMany({
        where: {
          batchId: { in: batchIds },
          studentId,
          status: BatchEnrollmentStatus.ACTIVE,
        },
        select: { batchId: true, enrolledAt: true },
      }),
      this.prisma.booking.findMany({
        where: {
          batchId: { in: batchIds },
          studentId,
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
    ]);

    const enrollmentByBatch = new Map(
      enrollments.map((row) => [row.batchId, row]),
    );
    const bookingByBatch = new Map<string, (typeof openBookings)[number]>();
    for (const booking of openBookings) {
      if (!booking.batchId || bookingByBatch.has(booking.batchId)) continue;
      bookingByBatch.set(booking.batchId, booking);
    }

    return items.map((item) => {
      const batchId = item.id as string;
      const enrollment = enrollmentByBatch.get(batchId);
      const booking = bookingByBatch.get(batchId);
      return {
        ...item,
        viewerEnrolled: Boolean(enrollment),
        viewerEnrollment: enrollment
          ? { enrolledAt: enrollment.enrolledAt }
          : null,
        viewerBooking: booking
          ? {
              id: booking.id,
              type: booking.type,
              status: booking.status,
              notes: booking.notes,
              startsAt: booking.startsAt,
              endsAt: booking.endsAt,
              paymentHoldExpiresAt: booking.paymentHoldExpiresAt,
            }
          : null,
      };
    });
  }
}
