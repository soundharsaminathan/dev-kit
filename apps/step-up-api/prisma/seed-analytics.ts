import "dotenv/config";
import { ConfigService } from "@nestjs/config";
import {
  AttendanceSource,
  AttendanceStatus,
  BillingCadence,
  BookingStatus,
  BookingType,
  EnrollmentMode,
  IndividualAudience,
  InvoiceStatus,
  MembershipSeatRole,
  MembershipStatus,
  PaymentMethod,
  type Prisma,
  PrismaClient,
  ProfileVisibility,
  SessionStatus,
  SessionType,
  SubscriptionKind,
  UserRole,
} from "@prisma/client";
import { UserCryptoService } from "../src/users/user-crypto.service";

/**
 * Isolated studio with rich analytics fixtures for Payments, Retention,
 * student funnel, and batch revenue demos.
 *
 *   pnpm --filter @step-up/api prisma:seed:analytics
 *
 * Log in (AUTH_BYPASS): analytics-owner@stepup.dev
 */

const prisma = new PrismaClient();
const crypto = new UserCryptoService(new ConfigService());

export const ANALYTICS = {
  studioId: "studio-analytics-1",
  branchMainId: "analytics-branch-main-1",
  branchEastId: "analytics-branch-east-1",
  adultMonthlyId: "analytics-sub-adult-monthly",
  adultQuarterlyId: "analytics-sub-adult-quarterly",
  kidMonthlyId: "analytics-sub-kid-monthly",
  kidQuarterlyId: "analytics-sub-kid-quarterly",
  kidsBatchId: "analytics-batch-kids-1",
  beginnerBatchId: "analytics-batch-beginner-1",
  trialBatchId: "analytics-batch-trial-1",
  completedBatchId: "analytics-batch-completed-1",
  users: {
    OWNER: {
      id: "analytics-owner-1",
      firebaseUid: "analytics-owner-1",
      email: "analytics-owner@stepup.dev",
      name: "Analytics Studio Owner",
    },
    STAFF: {
      id: "analytics-staff-1",
      firebaseUid: "analytics-staff-1",
      email: "analytics-staff@stepup.dev",
      name: "Analytics Front Desk",
    },
    TRAINER: {
      id: "analytics-trainer-1",
      firebaseUid: "analytics-trainer-1",
      email: "analytics-trainer@stepup.dev",
      name: "Analytics Lead Trainer",
    },
    TRAINER_2: {
      id: "analytics-trainer-2",
      firebaseUid: "analytics-trainer-2",
      email: "analytics-trainer-2@stepup.dev",
      name: "Analytics Second Trainer",
    },
  },
} as const;

type SeedUser = {
  id: string;
  firebaseUid: string;
  email: string;
  name: string;
  phone: string;
  role: UserRole;
  styles: string[];
  profileVisibility: ProfileVisibility;
  createdAt?: Date;
};

function daysAgo(days: number, hour = 12): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  d.setUTCHours(hour, 0, 0, 0);
  return d;
}

function monthsAgo(months: number, day = 15): Date {
  const d = new Date();
  d.setUTCMonth(d.getUTCMonth() - months, day);
  d.setUTCHours(12, 0, 0, 0);
  return d;
}

function mondayOfWeek(from = new Date()): Date {
  const d = new Date(from);
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function utcAt(base: Date, dayOffset: number, hour: number, minute = 0): Date {
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() + dayOffset);
  d.setUTCHours(hour, minute, 0, 0);
  return d;
}

function periodWindow(offsetMonths: number, lengthMonths = 1) {
  const now = new Date();
  const periodStart = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth() - offsetMonths,
      1,
      0,
      0,
      0,
      0,
    ),
  );
  const periodEnd = new Date(
    Date.UTC(
      periodStart.getUTCFullYear(),
      periodStart.getUTCMonth() + lengthMonths,
      1,
      0,
      0,
      0,
      0,
    ),
  );
  return { periodStart, periodEnd };
}

async function upsertUser(user: SeedUser, studioId: string | null) {
  const sealed = crypto.sealPii({
    email: user.email,
    name: user.name,
    phone: user.phone,
    bio: null,
    instagramUrl: null,
  });
  const studentOnboarding =
    user.role === UserRole.STUDENT
      ? {
          experienceLevel: "BEGINNER" as const,
          scheduleVibe: ["weekday_evenings", "weekends"],
          gender: "FEMALE" as const,
          ageRange: "TWENTY_TO_FORTY" as const,
          preferredBranchId: ANALYTICS.branchMainId,
          onboardingCompletedAt: new Date("2026-01-01T00:00:00.000Z"),
        }
      : {};

  await prisma.user.upsert({
    where: { firebaseUid: user.firebaseUid },
    update: {
      ...sealed,
      styles: user.styles,
      profileVisibility: user.profileVisibility,
      studioId,
      role: user.role,
      ...studentOnboarding,
      ...(user.createdAt ? { createdAt: user.createdAt } : {}),
    },
    create: {
      id: user.id,
      firebaseUid: user.firebaseUid,
      ...sealed,
      styles: user.styles,
      profileVisibility: user.profileVisibility,
      role: user.role,
      studioId,
      ...studentOnboarding,
      ...(user.createdAt ? { createdAt: user.createdAt } : {}),
    },
  });
}

async function upsertStudent(opts: {
  index: number;
  stage: string;
  name: string;
  createdAt: Date;
}) {
  const id = `analytics-student-${opts.stage}-${opts.index}`;
  await upsertUser(
    {
      id,
      firebaseUid: id,
      email: `${id}@stepup.dev`,
      name: opts.name,
      phone: `+91 98100 ${String(10000 + opts.index).slice(-5)}`,
      role: UserRole.STUDENT,
      styles: ["Hip Hop"],
      profileVisibility: ProfileVisibility.PUBLIC,
      createdAt: opts.createdAt,
    },
    ANALYTICS.studioId,
  );
  return id;
}

async function enroll(
  batchId: string,
  studentId: string,
  options: { isTrial?: boolean; trialSessionIds?: string[] } = {},
) {
  await prisma.batchEnrollment.upsert({
    where: {
      batchId_studentId: { batchId, studentId },
    },
    update: {
      isTrial: options.isTrial ?? false,
      trialSessionIds: options.trialSessionIds ?? undefined,
    },
    create: {
      batchId,
      studentId,
      isTrial: options.isTrial ?? false,
      trialSessionIds: options.trialSessionIds ?? undefined,
    },
  });
}

async function upsertMembership(opts: {
  id: string;
  subscriptionId: string;
  purchaserUserId: string;
  studentId: string;
  seatRole: MembershipSeatRole;
  status: MembershipStatus;
  periodStart: Date;
  periodEnd: Date;
}) {
  await prisma.membership.upsert({
    where: { id: opts.id },
    update: {
      subscriptionId: opts.subscriptionId,
      purchaserUserId: opts.purchaserUserId,
      periodStart: opts.periodStart,
      periodEnd: opts.periodEnd,
      status: opts.status,
    },
    create: {
      id: opts.id,
      subscriptionId: opts.subscriptionId,
      purchaserUserId: opts.purchaserUserId,
      periodStart: opts.periodStart,
      periodEnd: opts.periodEnd,
      status: opts.status,
    },
  });
  await prisma.membershipCoveredStudent.upsert({
    where: {
      membershipId_studentId: {
        membershipId: opts.id,
        studentId: opts.studentId,
      },
    },
    update: { seatRole: opts.seatRole },
    create: {
      membershipId: opts.id,
      studentId: opts.studentId,
      seatRole: opts.seatRole,
    },
  });
}

async function upsertInvoice(opts: {
  id: string;
  studentId: string;
  amount: number;
  status: InvoiceStatus;
  paymentMethod?: PaymentMethod | null;
  paidAt?: Date | null;
  membershipId?: string | null;
}) {
  await prisma.invoice.upsert({
    where: { id: opts.id },
    update: {
      studentId: opts.studentId,
      amount: opts.amount,
      status: opts.status,
      paymentMethod: opts.paymentMethod ?? null,
      paidAt: opts.paidAt ?? null,
      platformFeePercent: 5,
      studioId: ANALYTICS.studioId,
      membershipId: opts.membershipId ?? null,
      paymentHoldExpiresAt: null,
      purchaseMeta: null,
    },
    create: {
      id: opts.id,
      studentId: opts.studentId,
      amount: opts.amount,
      status: opts.status,
      paymentMethod: opts.paymentMethod ?? null,
      paidAt: opts.paidAt ?? null,
      platformFeePercent: 5,
      studioId: ANALYTICS.studioId,
      membershipId: opts.membershipId ?? null,
    },
  });
}

async function upsertAttendance(opts: {
  sessionId: string;
  studentId: string;
  status: AttendanceStatus;
  markedById: string;
}) {
  await prisma.attendance.upsert({
    where: {
      sessionId_studentId: {
        sessionId: opts.sessionId,
        studentId: opts.studentId,
      },
    },
    update: {
      status: opts.status,
      markedById: opts.markedById,
      source: AttendanceSource.TRAINER,
    },
    create: {
      sessionId: opts.sessionId,
      studentId: opts.studentId,
      status: opts.status,
      markedById: opts.markedById,
      source: AttendanceSource.TRAINER,
    },
  });
}

async function upsertBooking(opts: {
  id: string;
  studentId: string;
  type: BookingType;
  status: BookingStatus;
  batchId?: string | null;
  sessionId?: string | null;
  trainerId?: string | null;
  startsAt?: Date | null;
  endsAt?: Date | null;
  notes?: string;
}) {
  await prisma.booking.upsert({
    where: { id: opts.id },
    update: {
      studioId: ANALYTICS.studioId,
      studentId: opts.studentId,
      type: opts.type,
      status: opts.status,
      batchId: opts.batchId ?? null,
      sessionId: opts.sessionId ?? null,
      trainerId: opts.trainerId ?? null,
      startsAt: opts.startsAt ?? null,
      endsAt: opts.endsAt ?? null,
      notes: opts.notes ?? null,
    },
    create: {
      id: opts.id,
      studioId: ANALYTICS.studioId,
      studentId: opts.studentId,
      type: opts.type,
      status: opts.status,
      batchId: opts.batchId ?? null,
      sessionId: opts.sessionId ?? null,
      trainerId: opts.trainerId ?? null,
      startsAt: opts.startsAt ?? null,
      endsAt: opts.endsAt ?? null,
      notes: opts.notes ?? null,
    },
  });
}

const FIRST_NAMES = [
  "Aanya",
  "Dev",
  "Isha",
  "Kabir",
  "Meera",
  "Rohan",
  "Sana",
  "Vihaan",
  "Zara",
  "Arjun",
  "Diya",
  "Nikhil",
  "Pooja",
  "Reyansh",
  "Tara",
  "Anika",
  "Harsh",
  "Kavya",
  "Om",
  "Riya",
  "Shaurya",
  "Veda",
  "Yash",
  "Aditi",
  "Farhan",
  "Gia",
  "Jai",
  "Lina",
  "Milan",
  "Naina",
  "Priya",
  "Ravi",
  "Simran",
  "Uday",
  "Veer",
  "Wania",
] as const;

const PAYMENT_METHODS = [
  PaymentMethod.CASH,
  PaymentMethod.UPI_MANUAL,
  PaymentMethod.RAZORPAY,
] as const;

async function main() {
  const { studioId } = ANALYTICS;
  const u = ANALYTICS.users;

  await upsertUser(
    {
      ...u.OWNER,
      phone: "+91 98200 10001",
      role: UserRole.OWNER,
      styles: ["Hip Hop"],
      profileVisibility: ProfileVisibility.PUBLIC,
    },
    null,
  );

  await prisma.studio.upsert({
    where: { id: studioId },
    update: {
      name: "Analytics Demo Studio",
      address: "88 Metrics Avenue",
      contact: u.OWNER.email,
      ownerId: u.OWNER.id,
    },
    create: {
      id: studioId,
      name: "Analytics Demo Studio",
      address: "88 Metrics Avenue",
      photos: [],
      contact: u.OWNER.email,
      ownerId: u.OWNER.id,
    },
  });

  await prisma.studioSettings.upsert({
    where: { studioId },
    update: {},
    create: {
      studioId,
      graceDays: 3,
      expireAlertDays: 7,
      platformFeePercent: 5,
    },
  });

  await prisma.user.update({
    where: { id: u.OWNER.id },
    data: { studioId },
  });

  for (const branch of [
    {
      id: ANALYTICS.branchMainId,
      name: "Analytics Main",
      address: "88 Metrics Avenue",
    },
    {
      id: ANALYTICS.branchEastId,
      name: "Analytics East",
      address: "12 Chart Lane",
    },
  ]) {
    await prisma.studioBranch.upsert({
      where: { id: branch.id },
      update: {
        studioId,
        name: branch.name,
        address: branch.address,
      },
      create: {
        id: branch.id,
        studioId,
        name: branch.name,
        address: branch.address,
        latitude: 12.97,
        longitude: 77.59,
        description: null,
        amenities: [],
      },
    });
  }

  for (const staff of [
    {
      ...u.STAFF,
      phone: "+91 98200 10002",
      role: UserRole.STAFF,
      styles: [] as string[],
      profileVisibility: ProfileVisibility.PUBLIC,
    },
    {
      ...u.TRAINER,
      phone: "+91 98200 10003",
      role: UserRole.TRAINER,
      styles: ["Hip Hop"],
      profileVisibility: ProfileVisibility.PUBLIC,
    },
    {
      ...u.TRAINER_2,
      phone: "+91 98200 10004",
      role: UserRole.TRAINER,
      styles: ["Contemporary"],
      profileVisibility: ProfileVisibility.PUBLIC,
    },
  ] satisfies SeedUser[]) {
    await upsertUser(staff, studioId);
  }

  const subscriptions = [
    {
      id: ANALYTICS.adultMonthlyId,
      name: "Analytics Adult Monthly",
      individualAudience: IndividualAudience.ADULT,
      billingCadence: BillingCadence.MONTHLY,
      adultSeats: 1,
      kidSeats: 0,
      price: 3500,
    },
    {
      id: ANALYTICS.adultQuarterlyId,
      name: "Analytics Adult Quarterly",
      individualAudience: IndividualAudience.ADULT,
      billingCadence: BillingCadence.QUARTERLY,
      adultSeats: 1,
      kidSeats: 0,
      price: 9000,
    },
    {
      id: ANALYTICS.kidMonthlyId,
      name: "Analytics Kid Monthly",
      individualAudience: IndividualAudience.KID,
      billingCadence: BillingCadence.MONTHLY,
      adultSeats: 0,
      kidSeats: 1,
      price: 2500,
    },
    {
      id: ANALYTICS.kidQuarterlyId,
      name: "Analytics Kid Quarterly",
      individualAudience: IndividualAudience.KID,
      billingCadence: BillingCadence.QUARTERLY,
      adultSeats: 0,
      kidSeats: 1,
      price: 6500,
    },
  ] as const;

  for (const sub of subscriptions) {
    await prisma.subscription.upsert({
      where: { id: sub.id },
      update: {
        name: sub.name,
        kind: SubscriptionKind.INDIVIDUAL,
        individualAudience: sub.individualAudience,
        familyPack: null,
        billingCadence: sub.billingCadence,
        adultSeats: sub.adultSeats,
        kidSeats: sub.kidSeats,
        price: sub.price,
        active: true,
        studioId,
        creatorId: u.OWNER.id,
      },
      create: {
        id: sub.id,
        studioId,
        creatorId: u.OWNER.id,
        name: sub.name,
        kind: SubscriptionKind.INDIVIDUAL,
        individualAudience: sub.individualAudience,
        familyPack: null,
        billingCadence: sub.billingCadence,
        adultSeats: sub.adultSeats,
        kidSeats: sub.kidSeats,
        price: sub.price,
        active: true,
      },
    });
  }

  type BatchSeed = {
    id: string;
    name: string;
    category: "KIDS" | "ADULTS";
    branchId: string;
    enrollmentMode: EnrollmentMode;
    trainerIds: string[];
    scheduleJson: Prisma.InputJsonValue;
    active: boolean;
  };

  const batches: BatchSeed[] = [
    {
      id: ANALYTICS.kidsBatchId,
      name: "Analytics Kids Batch",
      category: "KIDS",
      branchId: ANALYTICS.branchMainId,
      enrollmentMode: EnrollmentMode.STAFF_ONLY,
      trainerIds: [u.TRAINER.id],
      scheduleJson: { days: ["Mon", "Wed"], time: "17:00" },
      active: true,
    },
    {
      id: ANALYTICS.beginnerBatchId,
      name: "Analytics Adult Beginner",
      category: "ADULTS",
      branchId: ANALYTICS.branchEastId,
      enrollmentMode: EnrollmentMode.SELF_JOIN,
      trainerIds: [u.TRAINER.id, u.TRAINER_2.id],
      scheduleJson: { days: ["Sat"], time: "10:00" },
      active: true,
    },
    {
      id: ANALYTICS.trialBatchId,
      name: "Analytics Open Trial",
      category: "ADULTS",
      branchId: ANALYTICS.branchMainId,
      enrollmentMode: EnrollmentMode.SELF_JOIN,
      trainerIds: [u.TRAINER.id, u.TRAINER_2.id],
      scheduleJson: { days: ["Sat"], time: "11:00" },
      active: true,
    },
    {
      id: ANALYTICS.completedBatchId,
      name: "Analytics Summer Intensive (Ended)",
      category: "ADULTS",
      branchId: ANALYTICS.branchEastId,
      enrollmentMode: EnrollmentMode.STAFF_ONLY,
      trainerIds: [u.TRAINER_2.id],
      scheduleJson: { days: ["Tue", "Thu"], time: "19:00" },
      active: false,
    },
  ];

  for (const batch of batches) {
    const { trainerIds, ...data } = batch;
    await prisma.batch.upsert({
      where: { id: batch.id },
      update: {
        name: data.name,
        category: data.category,
        branchId: data.branchId,
        danceCategories: [
          { name: "Hip-hop", description: "Analytics fixture class" },
        ],
        scheduleJson: data.scheduleJson,
        capacity: 40,
        enrollmentMode: data.enrollmentMode,
        active: data.active,
        certificationEnabled: false,
        certificateTemplateId: null,
      },
      create: {
        id: data.id,
        studioId,
        branchId: data.branchId,
        name: data.name,
        category: data.category,
        danceCategories: [
          { name: "Hip-hop", description: "Analytics fixture class" },
        ],
        scheduleJson: data.scheduleJson,
        capacity: 40,
        enrollmentMode: data.enrollmentMode,
        creatorId: u.TRAINER.id,
        active: data.active,
        certificationEnabled: false,
      },
    });

    for (const trainerId of trainerIds) {
      await prisma.batchTrainer.upsert({
        where: {
          batchId_trainerId: { batchId: batch.id, trainerId },
        },
        update: {},
        create: { batchId: batch.id, trainerId },
      });
    }
  }

  const batchPlans: Array<{ batchId: string; subscriptionId: string }> = [
    { batchId: ANALYTICS.kidsBatchId, subscriptionId: ANALYTICS.kidMonthlyId },
    {
      batchId: ANALYTICS.kidsBatchId,
      subscriptionId: ANALYTICS.kidQuarterlyId,
    },
    {
      batchId: ANALYTICS.beginnerBatchId,
      subscriptionId: ANALYTICS.adultMonthlyId,
    },
    {
      batchId: ANALYTICS.beginnerBatchId,
      subscriptionId: ANALYTICS.adultQuarterlyId,
    },
    {
      batchId: ANALYTICS.trialBatchId,
      subscriptionId: ANALYTICS.adultMonthlyId,
    },
    {
      batchId: ANALYTICS.completedBatchId,
      subscriptionId: ANALYTICS.adultMonthlyId,
    },
  ];

  for (const plan of batchPlans) {
    await prisma.batchPlan.upsert({
      where: {
        batchId_subscriptionId: {
          batchId: plan.batchId,
          subscriptionId: plan.subscriptionId,
        },
      },
      update: {},
      create: {
        batchId: plan.batchId,
        subscriptionId: plan.subscriptionId,
      },
    });
  }

  const weekStart = mondayOfWeek();
  const sessionIds = {
    kidsPast1: "analytics-session-kids-past-1",
    kidsPast2: "analytics-session-kids-past-2",
    kidsPast3: "analytics-session-kids-past-3",
    kidsUpcoming: "analytics-session-kids-upcoming",
    beginnerPast1: "analytics-session-beginner-past-1",
    beginnerPast2: "analytics-session-beginner-past-2",
    beginnerUpcoming: "analytics-session-beginner-upcoming",
    trialPast1: "analytics-session-trial-past-1",
    trialPast2: "analytics-session-trial-past-2",
    trialUpcoming: "analytics-session-trial-upcoming",
    completed1: "analytics-session-completed-1",
    completed2: "analytics-session-completed-2",
  } as const;

  const sessions: Array<{
    id: string;
    batchId: string;
    startsAt: Date;
    endsAt: Date;
    status: SessionStatus;
    type?: SessionType;
  }> = [
    {
      id: sessionIds.kidsPast1,
      batchId: ANALYTICS.kidsBatchId,
      startsAt: utcAt(weekStart, -14, 17),
      endsAt: utcAt(weekStart, -14, 18),
      status: SessionStatus.COMPLETED,
    },
    {
      id: sessionIds.kidsPast2,
      batchId: ANALYTICS.kidsBatchId,
      startsAt: utcAt(weekStart, -7, 17),
      endsAt: utcAt(weekStart, -7, 18),
      status: SessionStatus.COMPLETED,
    },
    {
      id: sessionIds.kidsPast3,
      batchId: ANALYTICS.kidsBatchId,
      startsAt: utcAt(weekStart, -3, 17),
      endsAt: utcAt(weekStart, -3, 18),
      status: SessionStatus.COMPLETED,
    },
    {
      id: sessionIds.kidsUpcoming,
      batchId: ANALYTICS.kidsBatchId,
      startsAt: utcAt(weekStart, 7, 17),
      endsAt: utcAt(weekStart, 7, 18),
      status: SessionStatus.SCHEDULED,
    },
    {
      id: sessionIds.beginnerPast1,
      batchId: ANALYTICS.beginnerBatchId,
      startsAt: utcAt(weekStart, -14, 10),
      endsAt: utcAt(weekStart, -14, 11),
      status: SessionStatus.COMPLETED,
    },
    {
      id: sessionIds.beginnerPast2,
      batchId: ANALYTICS.beginnerBatchId,
      startsAt: utcAt(weekStart, -7, 10),
      endsAt: utcAt(weekStart, -7, 11),
      status: SessionStatus.COMPLETED,
    },
    {
      id: sessionIds.beginnerUpcoming,
      batchId: ANALYTICS.beginnerBatchId,
      startsAt: utcAt(weekStart, 7, 10),
      endsAt: utcAt(weekStart, 7, 11),
      status: SessionStatus.SCHEDULED,
    },
    {
      id: sessionIds.trialPast1,
      batchId: ANALYTICS.trialBatchId,
      startsAt: utcAt(weekStart, -10, 11),
      endsAt: utcAt(weekStart, -10, 12),
      status: SessionStatus.COMPLETED,
      type: SessionType.TRIAL,
    },
    {
      id: sessionIds.trialPast2,
      batchId: ANALYTICS.trialBatchId,
      startsAt: utcAt(weekStart, -3, 11),
      endsAt: utcAt(weekStart, -3, 12),
      status: SessionStatus.COMPLETED,
      type: SessionType.TRIAL,
    },
    {
      id: sessionIds.trialUpcoming,
      batchId: ANALYTICS.trialBatchId,
      startsAt: utcAt(weekStart, 7, 11),
      endsAt: utcAt(weekStart, 7, 12),
      status: SessionStatus.SCHEDULED,
      type: SessionType.TRIAL,
    },
    {
      id: sessionIds.completed1,
      batchId: ANALYTICS.completedBatchId,
      startsAt: monthsAgo(3, 5),
      endsAt: monthsAgo(3, 5),
      status: SessionStatus.COMPLETED,
    },
    {
      id: sessionIds.completed2,
      batchId: ANALYTICS.completedBatchId,
      startsAt: monthsAgo(2, 12),
      endsAt: monthsAgo(2, 12),
      status: SessionStatus.COMPLETED,
    },
  ];

  // Fix completed session end times (same-day 1h classes)
  for (const session of sessions) {
    if (
      session.id === sessionIds.completed1 ||
      session.id === sessionIds.completed2
    ) {
      const ends = new Date(session.startsAt);
      ends.setUTCHours(ends.getUTCHours() + 1);
      session.endsAt = ends;
    }
  }

  for (const session of sessions) {
    await prisma.session.upsert({
      where: { id: session.id },
      update: {
        startsAt: session.startsAt,
        endsAt: session.endsAt,
        status: session.status,
        batchId: session.batchId,
        type: session.type ?? SessionType.REGULAR,
      },
      create: {
        id: session.id,
        batchId: session.batchId,
        startsAt: session.startsAt,
        endsAt: session.endsAt,
        status: session.status,
        type: session.type ?? SessionType.REGULAR,
      },
    });
  }

  let nameIndex = 0;
  const nextName = () => FIRST_NAMES[nameIndex++ % FIRST_NAMES.length];

  // --- signedInOnly (6) ---
  const signedInCreatedAts = [
    daysAgo(3),
    daysAgo(10),
    monthsAgo(1, 8),
    monthsAgo(2, 20),
    monthsAgo(5, 4),
    monthsAgo(10, 18),
  ];
  for (let i = 0; i < signedInCreatedAts.length; i++) {
    await upsertStudent({
      index: i + 1,
      stage: "signed",
      name: `${nextName()} SignedIn`,
      createdAt: signedInCreatedAts[i],
    });
  }

  // --- trialRegistered (5) ---
  for (let i = 0; i < 5; i++) {
    const studentId = await upsertStudent({
      index: i + 1,
      stage: "trialreg",
      name: `${nextName()} TrialReg`,
      createdAt: daysAgo(5 + i * 4),
    });
    await upsertBooking({
      id: `analytics-booking-trialreg-${i + 1}`,
      studentId,
      type: BookingType.TRIAL,
      status: i % 2 === 0 ? BookingStatus.PENDING : BookingStatus.CONFIRMED,
      batchId: ANALYTICS.trialBatchId,
      sessionId: sessionIds.trialUpcoming,
      trainerId: u.TRAINER.id,
      notes: "Analytics trial registered",
    });
  }

  // --- trialAttended (5) ---
  for (let i = 0; i < 5; i++) {
    const studentId = await upsertStudent({
      index: i + 1,
      stage: "trialatt",
      name: `${nextName()} TrialAtt`,
      createdAt: daysAgo(12 + i * 3),
    });
    const trialSession =
      i % 2 === 0 ? sessionIds.trialPast1 : sessionIds.trialPast2;
    if (i < 3) {
      await upsertBooking({
        id: `analytics-booking-trialatt-${i + 1}`,
        studentId,
        type: BookingType.TRIAL,
        status: BookingStatus.COMPLETED,
        batchId: ANALYTICS.trialBatchId,
        sessionId: trialSession,
        trainerId: i % 2 === 0 ? u.TRAINER.id : u.TRAINER_2.id,
        notes: "Analytics trial completed",
      });
    } else {
      await enroll(ANALYTICS.trialBatchId, studentId, {
        isTrial: true,
        trialSessionIds: [trialSession],
      });
      await upsertAttendance({
        sessionId: trialSession,
        studentId,
        status: AttendanceStatus.PRESENT,
        markedById: u.TRAINER.id,
      });
    }
  }

  // --- completedWithoutPlan (5) ---
  for (let i = 0; i < 5; i++) {
    const studentId = await upsertStudent({
      index: i + 1,
      stage: "completed",
      name: `${nextName()} Completed`,
      createdAt: monthsAgo(3 + i, 9),
    });
    await enroll(ANALYTICS.completedBatchId, studentId);
    if (i < 2) {
      const past = periodWindow(4);
      await upsertMembership({
        id: `analytics-mem-completed-${i + 1}`,
        subscriptionId: ANALYTICS.adultMonthlyId,
        purchaserUserId: studentId,
        studentId,
        seatRole: MembershipSeatRole.ADULT,
        status: MembershipStatus.EXPIRED,
        periodStart: past.periodStart,
        periodEnd: past.periodEnd,
      });
    }
  }

  // --- active (14): renewals, at-risk, absentees, invoice variety ---
  type ActiveKind = "renewed" | "healthy" | "due" | "expired" | "kids";
  const activePlan: Array<{ kind: ActiveKind; createdAt: Date }> = [
    { kind: "renewed", createdAt: monthsAgo(8, 2) },
    { kind: "renewed", createdAt: monthsAgo(7, 14) },
    { kind: "renewed", createdAt: monthsAgo(6, 22) },
    { kind: "renewed", createdAt: monthsAgo(5, 6) },
    { kind: "healthy", createdAt: monthsAgo(4, 11) },
    { kind: "healthy", createdAt: monthsAgo(3, 3) },
    { kind: "healthy", createdAt: daysAgo(40) },
    { kind: "healthy", createdAt: daysAgo(20) },
    { kind: "due", createdAt: monthsAgo(2, 17) },
    { kind: "due", createdAt: monthsAgo(1, 9) },
    { kind: "expired", createdAt: monthsAgo(4, 28) },
    { kind: "expired", createdAt: monthsAgo(3, 15) },
    { kind: "kids", createdAt: monthsAgo(2, 5) },
    { kind: "kids", createdAt: daysAgo(25) },
  ];

  const activeStudentIds: string[] = [];

  for (let i = 0; i < activePlan.length; i++) {
    const plan = activePlan[i];
    const studentId = await upsertStudent({
      index: i + 1,
      stage: "active",
      name: `${nextName()} Active`,
      createdAt: plan.createdAt,
    });
    activeStudentIds.push(studentId);

    const isKid = plan.kind === "kids";
    const batchId = isKid ? ANALYTICS.kidsBatchId : ANALYTICS.beginnerBatchId;
    const subscriptionId = isKid
      ? ANALYTICS.kidMonthlyId
      : i % 3 === 0
        ? ANALYTICS.adultQuarterlyId
        : ANALYTICS.adultMonthlyId;
    const seatRole = isKid ? MembershipSeatRole.KID : MembershipSeatRole.ADULT;
    const amount =
      subscriptionId === ANALYTICS.adultQuarterlyId
        ? 9000
        : subscriptionId === ANALYTICS.kidMonthlyId
          ? 2500
          : 3500;

    await enroll(batchId, studentId);

    if (plan.kind === "renewed") {
      const previous = periodWindow(1);
      const current = periodWindow(0);
      await upsertMembership({
        id: `analytics-mem-active-${i + 1}-prev`,
        subscriptionId,
        purchaserUserId: studentId,
        studentId,
        seatRole,
        status: MembershipStatus.ACTIVE,
        periodStart: previous.periodStart,
        periodEnd: previous.periodEnd,
      });
      await upsertMembership({
        id: `analytics-mem-active-${i + 1}-curr`,
        subscriptionId,
        purchaserUserId: studentId,
        studentId,
        seatRole,
        status: MembershipStatus.ACTIVE,
        periodStart: current.periodStart,
        periodEnd: current.periodEnd,
      });
      await upsertInvoice({
        id: `analytics-inv-active-${i + 1}-prev`,
        studentId,
        amount,
        status: InvoiceStatus.PAID,
        paymentMethod: PAYMENT_METHODS[i % PAYMENT_METHODS.length],
        paidAt: daysAgo(35 + i * 3),
        membershipId: `analytics-mem-active-${i + 1}-prev`,
      });
      await upsertInvoice({
        id: `analytics-inv-active-${i + 1}-curr`,
        studentId,
        amount,
        status: InvoiceStatus.PAID,
        paymentMethod: PAYMENT_METHODS[(i + 1) % PAYMENT_METHODS.length],
        paidAt: daysAgo(2 + i),
        membershipId: `analytics-mem-active-${i + 1}-curr`,
      });
    } else if (plan.kind === "due") {
      const current = periodWindow(0);
      await upsertMembership({
        id: `analytics-mem-active-${i + 1}`,
        subscriptionId,
        purchaserUserId: studentId,
        studentId,
        seatRole,
        status: MembershipStatus.DUE,
        periodStart: current.periodStart,
        periodEnd: current.periodEnd,
      });
      await upsertInvoice({
        id: `analytics-inv-active-${i + 1}`,
        studentId,
        amount,
        status: InvoiceStatus.OVERDUE,
        membershipId: `analytics-mem-active-${i + 1}`,
      });
    } else if (plan.kind === "expired") {
      const past = periodWindow(2);
      await upsertMembership({
        id: `analytics-mem-active-${i + 1}`,
        subscriptionId,
        purchaserUserId: studentId,
        studentId,
        seatRole,
        status: MembershipStatus.EXPIRED,
        periodStart: past.periodStart,
        periodEnd: past.periodEnd,
      });
      await upsertInvoice({
        id: `analytics-inv-active-${i + 1}`,
        studentId,
        amount,
        status: InvoiceStatus.PENDING,
        membershipId: `analytics-mem-active-${i + 1}`,
      });
    } else {
      const current = periodWindow(0);
      await upsertMembership({
        id: `analytics-mem-active-${i + 1}`,
        subscriptionId,
        purchaserUserId: studentId,
        studentId,
        seatRole,
        status: MembershipStatus.ACTIVE,
        periodStart: current.periodStart,
        periodEnd: current.periodEnd,
      });
      await upsertInvoice({
        id: `analytics-inv-active-${i + 1}`,
        studentId,
        amount,
        status: InvoiceStatus.PAID,
        paymentMethod: PAYMENT_METHODS[i % PAYMENT_METHODS.length],
        paidAt: daysAgo(4 + i * 7),
        membershipId: `analytics-mem-active-${i + 1}`,
      });
      // Extra older paid invoice for payment series depth
      if (i % 2 === 0) {
        await upsertInvoice({
          id: `analytics-inv-active-${i + 1}-old`,
          studentId,
          amount,
          status: InvoiceStatus.PAID,
          paymentMethod: PAYMENT_METHODS[(i + 2) % PAYMENT_METHODS.length],
          paidAt: daysAgo(60 + i * 5),
          membershipId: `analytics-mem-active-${i + 1}`,
        });
      }
    }

    // Attendance mix for retention absentees + presence
    const pastSession = isKid ? sessionIds.kidsPast2 : sessionIds.beginnerPast2;
    const olderSession = isKid
      ? sessionIds.kidsPast1
      : sessionIds.beginnerPast1;
    await upsertAttendance({
      sessionId: olderSession,
      studentId,
      status: AttendanceStatus.PRESENT,
      markedById: u.TRAINER.id,
    });
    await upsertAttendance({
      sessionId: pastSession,
      studentId,
      status:
        plan.kind === "due" || plan.kind === "expired"
          ? AttendanceStatus.ABSENT
          : i % 4 === 0
            ? AttendanceStatus.ABSENT
            : AttendanceStatus.PRESENT,
      markedById: u.TRAINER.id,
    });
  }

  // Extra paid invoices across the year for yearly payment charts
  for (let i = 0; i < 8; i++) {
    const studentId = activeStudentIds[i % activeStudentIds.length];
    await upsertInvoice({
      id: `analytics-inv-series-${i + 1}`,
      studentId,
      amount: 3500 + (i % 3) * 500,
      status: InvoiceStatus.PAID,
      paymentMethod: PAYMENT_METHODS[i % PAYMENT_METHODS.length],
      paidAt: daysAgo(15 + i * 12),
    });
  }

  // Trainer retention bookings (COMPLETED + CANCELLED)
  for (let i = 0; i < 10; i++) {
    const studentId = activeStudentIds[i % activeStudentIds.length];
    const trainerId = i % 3 === 0 ? u.TRAINER_2.id : u.TRAINER.id;
    const startsAt = daysAgo(8 + i * 2, 18);
    const endsAt = new Date(startsAt);
    endsAt.setUTCHours(endsAt.getUTCHours() + 1);
    await upsertBooking({
      id: `analytics-booking-private-${i + 1}`,
      studentId,
      type: BookingType.PRIVATE,
      status: i % 4 === 0 ? BookingStatus.CANCELLED : BookingStatus.COMPLETED,
      trainerId,
      startsAt,
      endsAt,
      notes: "Analytics private booking",
    });
  }

  console.log(`Analytics demo studio ready: ${studioId}`);
  console.log(`  owner login: ${u.OWNER.email}`);
  console.log(
    `  funnel: signedInOnly=6 trialRegistered=5 trialAttended=5 completedWithoutPlan=5 active=14`,
  );
  console.log(
    `  batches: ${ANALYTICS.kidsBatchId}, ${ANALYTICS.beginnerBatchId}, ${ANALYTICS.trialBatchId}, ${ANALYTICS.completedBatchId}`,
  );
  console.log(
    `  check: /app (funnel), /app/payments, /app/retention, /app/batches/$id revenue`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
