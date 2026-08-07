import { ConfigService } from "@nestjs/config";
import {
  AttendanceSource,
  AttendanceStatus,
  BookingStatus,
  BookingType,
  EnrollmentMode,
  InvoiceStatus,
  MembershipSeatRole,
  MembershipStatus,
  PaymentMethod,
  type PrismaClient,
  ProfileVisibility,
  SessionStatus,
  SessionType,
  UserRole,
} from "@prisma/client";
import { UserCryptoService } from "../src/users/user-crypto.service";

/**
 * Dense fixtures layered onto studio-smoke-1 so deployed performance smoke
 * exercises list/analytics pages with real payload weight (not empty shells).
 *
 * Stable IDs use the `smoke-load-` prefix and are preserved by cleanup-smoke.
 */

export const SMOKE_LOAD_PREFIX = "smoke-load-";

/**
 * Canonical seed batches (`smoke-batch-kids-1`, `smoke-batch-beginner-1`) use
 * capacity 20. Roster extras must stay under that and leave headroom for smoke
 * enroll flows (staff/owner mark-invoice-paid).
 */
const CANONICAL_BATCH_CAPACITY = 20;
const CANONICAL_ENROLL_HEADROOM = 2;

export const SMOKE_LOAD = {
  trainerCount: 8,
  studentCount: 100,
  batchCount: 15,
  sessionsPerBatch: 4,
  invoices: 80,
  bookings: 40,
  posts: 30,
  enrollmentsPerBatch: 12,
  /**
   * Extra roster members on the canonical kids attendance session.
   * Seed student also occupies one kids seat → extras ≤ capacity − 1 − headroom.
   */
  kidsRosterExtras: CANONICAL_BATCH_CAPACITY - 1 - CANONICAL_ENROLL_HEADROOM,
  /**
   * Extra roster members on the canonical adult beginner batch.
   * Leave headroom so smoke enroll + mark-paid can add a seat.
   */
  beginnerRosterExtras: CANONICAL_BATCH_CAPACITY - CANONICAL_ENROLL_HEADROOM,
} as const;

const STYLES = [
  "Hip Hop",
  "Bollywood",
  "Contemporary",
  "Bharatanatyam",
  "Salsa",
] as const;

function pad(n: number, width: number) {
  return String(n).padStart(width, "0");
}

export function smokeLoadTrainerId(index: number) {
  return `${SMOKE_LOAD_PREFIX}trainer-${pad(index, 2)}`;
}

export function smokeLoadStudentId(index: number) {
  return `${SMOKE_LOAD_PREFIX}student-${pad(index, 3)}`;
}

export function smokeLoadBatchId(index: number) {
  return `${SMOKE_LOAD_PREFIX}batch-${pad(index, 2)}`;
}

export function isSmokeLoadId(id: string) {
  return id.startsWith(SMOKE_LOAD_PREFIX);
}

function daysFromNow(days: number, hour = 10): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  d.setUTCHours(hour, 0, 0, 0);
  return d;
}

function daysAgo(days: number, hour = 10): Date {
  return daysFromNow(-days, hour);
}

async function mapPool<T>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<void>,
) {
  let next = 0;
  const runners = Array.from(
    { length: Math.min(concurrency, items.length) },
    async () => {
      while (next < items.length) {
        const index = next;
        next += 1;
        await worker(items[index]!, index);
      }
    },
  );
  await Promise.all(runners);
}

type LoadDeps = {
  prisma: PrismaClient;
  studioId: string;
  ownerId: string;
  seedTrainerId: string;
  seedStudentId: string;
  branchMainId: string;
  branchEastId: string;
  adultMonthlyId: string;
  kidMonthlyId: string;
  kidsBatchId: string;
  beginnerBatchId: string;
  trialBatchId: string;
  sessionAttendancePastId: string;
};

export async function seedSmokeLoadData(deps: LoadDeps) {
  const crypto = new UserCryptoService(new ConfigService());
  const { prisma } = deps;

  const trainerIds = Array.from({ length: SMOKE_LOAD.trainerCount }, (_, i) =>
    smokeLoadTrainerId(i + 1),
  );
  const studentIds = Array.from({ length: SMOKE_LOAD.studentCount }, (_, i) =>
    smokeLoadStudentId(i + 1),
  );
  const batchIds = Array.from({ length: SMOKE_LOAD.batchCount }, (_, i) =>
    smokeLoadBatchId(i + 1),
  );

  await mapPool(trainerIds, 8, async (id, index) => {
    const n = index + 1;
    const sealed = crypto.sealPii({
      email: `${id}@stepup.dev`,
      name: `Load Trainer ${pad(n, 2)}`,
      phone: `+91 97100 ${pad(10000 + n, 5)}`,
      bio: null,
      instagramUrl: null,
    });
    await prisma.user.upsert({
      where: { firebaseUid: id },
      update: {
        ...sealed,
        role: UserRole.TRAINER,
        styles: [STYLES[n % STYLES.length]!],
        profileVisibility: ProfileVisibility.PUBLIC,
        studioId: deps.studioId,
        active: true,
        experienceLevel: "INTERMEDIATE",
        gender: n % 2 === 0 ? "FEMALE" : "MALE",
        ageRange: "TWENTY_TO_FORTY",
        onboardingCompletedAt: daysAgo(90),
      },
      create: {
        id,
        firebaseUid: id,
        ...sealed,
        role: UserRole.TRAINER,
        styles: [STYLES[n % STYLES.length]!],
        profileVisibility: ProfileVisibility.PUBLIC,
        studioId: deps.studioId,
        experienceLevel: "INTERMEDIATE",
        gender: n % 2 === 0 ? "FEMALE" : "MALE",
        ageRange: "TWENTY_TO_FORTY",
        onboardingCompletedAt: daysAgo(90),
      },
    });
  });

  await mapPool(studentIds, 12, async (id, index) => {
    const n = index + 1;
    const sealed = crypto.sealPii({
      email: `${id}@stepup.dev`,
      name: `Load Student ${pad(n, 3)}`,
      phone: `+91 97200 ${pad(10000 + n, 5)}`,
      bio: null,
      instagramUrl: null,
    });
    await prisma.user.upsert({
      where: { firebaseUid: id },
      update: {
        ...sealed,
        role: UserRole.STUDENT,
        styles: [STYLES[n % STYLES.length]!, STYLES[(n + 1) % STYLES.length]!],
        profileVisibility: ProfileVisibility.PUBLIC,
        studioId: deps.studioId,
        active: true,
        experienceLevel: n % 3 === 0 ? "ADVANCED" : "BEGINNER",
        scheduleVibe: ["weekday_evenings", "weekends"],
        gender: n % 2 === 0 ? "FEMALE" : "MALE",
        ageRange:
          n % 4 === 0
            ? "TEN_TO_TWENTY"
            : n % 4 === 1
              ? "UNDER_10"
              : "TWENTY_TO_FORTY",
        preferredBranchId: n % 2 === 0 ? deps.branchMainId : deps.branchEastId,
        onboardingCompletedAt: daysAgo(30 + (n % 60)),
      },
      create: {
        id,
        firebaseUid: id,
        ...sealed,
        role: UserRole.STUDENT,
        styles: [STYLES[n % STYLES.length]!, STYLES[(n + 1) % STYLES.length]!],
        profileVisibility: ProfileVisibility.PUBLIC,
        studioId: deps.studioId,
        experienceLevel: n % 3 === 0 ? "ADVANCED" : "BEGINNER",
        scheduleVibe: ["weekday_evenings", "weekends"],
        gender: n % 2 === 0 ? "FEMALE" : "MALE",
        ageRange:
          n % 4 === 0
            ? "TEN_TO_TWENTY"
            : n % 4 === 1
              ? "UNDER_10"
              : "TWENTY_TO_FORTY",
        preferredBranchId: n % 2 === 0 ? deps.branchMainId : deps.branchEastId,
        onboardingCompletedAt: daysAgo(30 + (n % 60)),
      },
    });
  });

  const allTrainerIds = [deps.seedTrainerId, ...trainerIds];

  await mapPool(batchIds, 6, async (batchId, index) => {
    const n = index + 1;
    const kids = n % 3 === 0;
    const branchId = n % 2 === 0 ? deps.branchMainId : deps.branchEastId;
    const trainerId = allTrainerIds[n % allTrainerIds.length]!;
    const name = kids
      ? `Load Kids Crew ${pad(n, 2)}`
      : `Load Adult Groove ${pad(n, 2)}`;

    await prisma.batch.upsert({
      where: { id: batchId },
      update: {
        name,
        category: kids ? "KIDS" : "ADULTS",
        branchId,
        danceCategories: [
          {
            name: STYLES[n % STYLES.length],
            description: "Smoke load fixture class",
          },
        ],
        scheduleJson: {
          days: kids ? ["Tue", "Thu"] : ["Mon", "Wed", "Fri"],
          time: kids ? "16:30" : "19:00",
        },
        capacity: 30,
        enrollmentMode: EnrollmentMode.SELF_JOIN,
        active: true,
        certificationEnabled: false,
        coverImageUrl:
          "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&q=80",
      },
      create: {
        id: batchId,
        studioId: deps.studioId,
        branchId,
        name,
        category: kids ? "KIDS" : "ADULTS",
        danceCategories: [
          {
            name: STYLES[n % STYLES.length],
            description: "Smoke load fixture class",
          },
        ],
        scheduleJson: {
          days: kids ? ["Tue", "Thu"] : ["Mon", "Wed", "Fri"],
          time: kids ? "16:30" : "19:00",
        },
        capacity: 30,
        enrollmentMode: EnrollmentMode.SELF_JOIN,
        creatorId: deps.ownerId,
        active: true,
        certificationEnabled: false,
        coverImageUrl:
          "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&q=80",
      },
    });

    await prisma.batchTrainer.upsert({
      where: {
        batchId_trainerId: { batchId, trainerId },
      },
      update: {},
      create: { batchId, trainerId },
    });

    const planId = kids ? deps.kidMonthlyId : deps.adultMonthlyId;
    await prisma.batchPlan.upsert({
      where: {
        batchId_subscriptionId: {
          batchId,
          subscriptionId: planId,
        },
      },
      update: {},
      create: {
        batchId,
        subscriptionId: planId,
      },
    });
  });

  // Enroll students across load batches + seed kids/beginner for dense rosters.
  const enrollmentPairs: Array<{ batchId: string; studentId: string }> = [];
  for (let b = 0; b < batchIds.length; b++) {
    const batchId = batchIds[b]!;
    for (let s = 0; s < SMOKE_LOAD.enrollmentsPerBatch; s++) {
      const studentId =
        studentIds[
          (b * SMOKE_LOAD.enrollmentsPerBatch + s) % studentIds.length
        ]!;
      enrollmentPairs.push({ batchId, studentId });
    }
  }

  const kidsRosterStudentIds = studentIds.slice(0, SMOKE_LOAD.kidsRosterExtras);
  const beginnerRosterStudentIds = studentIds.slice(
    10,
    10 + SMOKE_LOAD.beginnerRosterExtras,
  );
  for (const studentId of kidsRosterStudentIds) {
    enrollmentPairs.push({ batchId: deps.kidsBatchId, studentId });
  }
  for (const studentId of beginnerRosterStudentIds) {
    enrollmentPairs.push({ batchId: deps.beginnerBatchId, studentId });
  }

  await mapPool(enrollmentPairs, 16, async ({ batchId, studentId }) => {
    await prisma.batchEnrollment.upsert({
      where: { batchId_studentId: { batchId, studentId } },
      update: {},
      create: { batchId, studentId },
    });
  });

  // Drop stale smoke-load seats left from prior denser seeds so capacity stays open.
  await prisma.batchEnrollment.deleteMany({
    where: {
      batchId: deps.kidsBatchId,
      studentId: {
        startsWith: SMOKE_LOAD_PREFIX,
        notIn: kidsRosterStudentIds,
      },
    },
  });
  await prisma.batchEnrollment.deleteMany({
    where: {
      batchId: deps.beginnerBatchId,
      studentId: {
        startsWith: SMOKE_LOAD_PREFIX,
        notIn: beginnerRosterStudentIds,
      },
    },
  });

  // Active memberships for canonical roster extras so mark-all-present can succeed.
  const rosterMembershipPeriodStart = new Date(
    Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1),
  );
  const rosterMembershipPeriodEnd = new Date(
    Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() + 1, 1),
  );
  const rosterMemberships: Array<{
    id: string;
    studentId: string;
    subscriptionId: string;
    seatRole: MembershipSeatRole;
  }> = [
    ...kidsRosterStudentIds.map((studentId, index) => ({
      id: `${SMOKE_LOAD_PREFIX}membership-kids-roster-${pad(index + 1, 2)}`,
      studentId,
      subscriptionId: deps.kidMonthlyId,
      seatRole: MembershipSeatRole.KID,
    })),
    ...beginnerRosterStudentIds.map((studentId, index) => ({
      id: `${SMOKE_LOAD_PREFIX}membership-adult-roster-${pad(index + 1, 2)}`,
      studentId,
      subscriptionId: deps.adultMonthlyId,
      seatRole: MembershipSeatRole.ADULT,
    })),
  ];

  await mapPool(rosterMemberships, 10, async (row) => {
    await prisma.membership.upsert({
      where: { id: row.id },
      update: {
        subscriptionId: row.subscriptionId,
        purchaserUserId: row.studentId,
        periodStart: rosterMembershipPeriodStart,
        periodEnd: rosterMembershipPeriodEnd,
        status: MembershipStatus.ACTIVE,
      },
      create: {
        id: row.id,
        subscriptionId: row.subscriptionId,
        purchaserUserId: row.studentId,
        periodStart: rosterMembershipPeriodStart,
        periodEnd: rosterMembershipPeriodEnd,
        status: MembershipStatus.ACTIVE,
      },
    });
    await prisma.membershipCoveredStudent.upsert({
      where: {
        membershipId_studentId: {
          membershipId: row.id,
          studentId: row.studentId,
        },
      },
      update: { seatRole: row.seatRole },
      create: {
        membershipId: row.id,
        studentId: row.studentId,
        seatRole: row.seatRole,
      },
    });
  });

  // Sessions for calendar + dense attendance history.
  const sessionSpecs: Array<{
    id: string;
    batchId: string;
    startsAt: Date;
    endsAt: Date;
    status: SessionStatus;
  }> = [];
  for (let b = 0; b < batchIds.length; b++) {
    const batchId = batchIds[b]!;
    for (let s = 0; s < SMOKE_LOAD.sessionsPerBatch; s++) {
      const offset = b * SMOKE_LOAD.sessionsPerBatch + s;
      const past = s % 2 === 0;
      const startsAt = past
        ? daysAgo(7 + offset, 17)
        : daysFromNow(2 + offset, 17);
      const endsAt = new Date(startsAt.getTime() + 60 * 60 * 1000);
      sessionSpecs.push({
        id: `${SMOKE_LOAD_PREFIX}session-${pad(b + 1, 2)}-${pad(s + 1, 2)}`,
        batchId,
        startsAt,
        endsAt,
        status: past ? SessionStatus.COMPLETED : SessionStatus.SCHEDULED,
      });
    }
  }

  await mapPool(sessionSpecs, 12, async (session) => {
    await prisma.session.upsert({
      where: { id: session.id },
      update: {
        batchId: session.batchId,
        startsAt: session.startsAt,
        endsAt: session.endsAt,
        status: session.status,
        type: SessionType.REGULAR,
      },
      create: {
        id: session.id,
        batchId: session.batchId,
        startsAt: session.startsAt,
        endsAt: session.endsAt,
        status: session.status,
        type: SessionType.REGULAR,
      },
    });
  });

  // Attendance on past kids session + first completed load sessions.
  const attendanceTargets = [
    deps.sessionAttendancePastId,
    ...sessionSpecs
      .filter((s) => s.status === SessionStatus.COMPLETED)
      .slice(0, 8)
      .map((s) => s.id),
  ];
  const attendanceRows: Array<{ sessionId: string; studentId: string }> = [];
  for (const sessionId of attendanceTargets) {
    for (let i = 0; i < Math.min(20, studentIds.length); i++) {
      attendanceRows.push({
        sessionId,
        studentId: studentIds[i]!,
      });
    }
  }
  // Include canonical smoke student on load sessions for realism.
  for (const sessionId of attendanceTargets.slice(0, 4)) {
    attendanceRows.push({
      sessionId,
      studentId: deps.seedStudentId,
    });
  }

  await mapPool(attendanceRows, 16, async ({ sessionId, studentId }) => {
    await prisma.attendance.upsert({
      where: { sessionId_studentId: { sessionId, studentId } },
      update: {
        status: AttendanceStatus.PRESENT,
        markedById: deps.seedTrainerId,
        source: AttendanceSource.TRAINER,
      },
      create: {
        sessionId,
        studentId,
        status: AttendanceStatus.PRESENT,
        markedById: deps.seedTrainerId,
        source: AttendanceSource.TRAINER,
      },
    });
  });

  // Memberships + invoices for payments / invoices dashboards.
  const now = new Date();
  const periodStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  );
  const periodEnd = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
  );

  await mapPool(
    Array.from({ length: SMOKE_LOAD.invoices }, (_, i) => i + 1),
    10,
    async (n) => {
      const studentId = studentIds[(n - 1) % studentIds.length]!;
      const membershipId = `${SMOKE_LOAD_PREFIX}membership-${pad(n, 3)}`;
      const invoiceId = `${SMOKE_LOAD_PREFIX}invoice-${pad(n, 3)}`;
      const kids = n % 3 === 0;
      const subscriptionId = kids ? deps.kidMonthlyId : deps.adultMonthlyId;
      const amount = kids ? 2500 : 3500 + (n % 4) * 250;
      const status =
        n % 5 === 0
          ? InvoiceStatus.OVERDUE
          : n % 3 === 0
            ? InvoiceStatus.PENDING
            : InvoiceStatus.PAID;

      await prisma.membership.upsert({
        where: { id: membershipId },
        update: {
          subscriptionId,
          purchaserUserId: studentId,
          periodStart,
          periodEnd,
          status:
            status === InvoiceStatus.OVERDUE
              ? MembershipStatus.EXPIRED
              : MembershipStatus.ACTIVE,
        },
        create: {
          id: membershipId,
          subscriptionId,
          purchaserUserId: studentId,
          periodStart,
          periodEnd,
          status:
            status === InvoiceStatus.OVERDUE
              ? MembershipStatus.EXPIRED
              : MembershipStatus.ACTIVE,
        },
      });
      await prisma.membershipCoveredStudent.upsert({
        where: {
          membershipId_studentId: { membershipId, studentId },
        },
        update: {
          seatRole: kids ? MembershipSeatRole.KID : MembershipSeatRole.ADULT,
        },
        create: {
          membershipId,
          studentId,
          seatRole: kids ? MembershipSeatRole.KID : MembershipSeatRole.ADULT,
        },
      });

      await prisma.invoice.upsert({
        where: { id: invoiceId },
        update: {
          studentId,
          amount,
          status,
          paymentMethod:
            status === InvoiceStatus.PAID ? PaymentMethod.CASH : null,
          paidAt: status === InvoiceStatus.PAID ? daysAgo(n % 20) : null,
          platformFeePercent: 5,
          studioId: deps.studioId,
          membershipId,
          paymentHoldExpiresAt: null,
          purchaseMeta: {
            batchId: batchIds[(n - 1) % batchIds.length],
            subscriptionId,
            purchaserUserId: studentId,
          },
        },
        create: {
          id: invoiceId,
          studentId,
          amount,
          status,
          paymentMethod:
            status === InvoiceStatus.PAID ? PaymentMethod.CASH : null,
          paidAt: status === InvoiceStatus.PAID ? daysAgo(n % 20) : null,
          platformFeePercent: 5,
          studioId: deps.studioId,
          membershipId,
          purchaseMeta: {
            batchId: batchIds[(n - 1) % batchIds.length],
            subscriptionId,
            purchaserUserId: studentId,
          },
        },
      });
    },
  );

  await mapPool(
    Array.from({ length: SMOKE_LOAD.bookings }, (_, i) => i + 1),
    10,
    async (n) => {
      const id = `${SMOKE_LOAD_PREFIX}booking-${pad(n, 3)}`;
      const studentId = studentIds[(n - 1) % studentIds.length]!;
      const batchId =
        n % 4 === 0 ? deps.trialBatchId : batchIds[(n - 1) % batchIds.length]!;
      const status =
        n % 5 === 0
          ? BookingStatus.CONFIRMED
          : n % 3 === 0
            ? BookingStatus.CANCELLED
            : BookingStatus.PENDING;
      await prisma.booking.upsert({
        where: { id },
        update: {
          studioId: deps.studioId,
          studentId,
          type: BookingType.TRIAL,
          batchId,
          status,
          notes: `Smoke load booking ${n}`,
        },
        create: {
          id,
          studioId: deps.studioId,
          studentId,
          type: BookingType.TRIAL,
          batchId,
          status,
          notes: `Smoke load booking ${n}`,
        },
      });
    },
  );

  await mapPool(
    Array.from({ length: SMOKE_LOAD.posts }, (_, i) => i + 1),
    8,
    async (n) => {
      const id = `${SMOKE_LOAD_PREFIX}post-${pad(n, 3)}`;
      const authorId =
        n % 4 === 0
          ? deps.seedStudentId
          : studentIds[(n - 1) % studentIds.length]!;
      await prisma.post.upsert({
        where: { id },
        update: {
          authorId,
          caption: `Smoke load feed post #${n} — class vibes`,
          imageUrls: [
            "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=800&q=80",
          ],
        },
        create: {
          id,
          authorId,
          caption: `Smoke load feed post #${n} — class vibes`,
          imageUrls: [
            "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=800&q=80",
          ],
        },
      });
    },
  );

  console.log(
    `Smoke load fixtures ready: ${SMOKE_LOAD.trainerCount} trainers, ${SMOKE_LOAD.studentCount} students, ${SMOKE_LOAD.batchCount} batches, ${sessionSpecs.length} sessions, ${SMOKE_LOAD.invoices} invoices, ${SMOKE_LOAD.bookings} bookings, ${SMOKE_LOAD.posts} posts`,
  );
}
