import "dotenv/config";
import { ConfigService } from "@nestjs/config";
import {
  BillingCadence,
  EnrollmentMode,
  IndividualAudience,
  MembershipSeatRole,
  MembershipStatus,
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
 * Isolated studio for Playwright / HTTP e2e.
 * Does not depend on the demo seed (prisma/seed.ts). Re-run anytime after a wipe:
 *   pnpm --filter @step-up/api prisma:seed:e2e
 */

const prisma = new PrismaClient();
const crypto = new UserCryptoService(new ConfigService());

export const E2E = {
  studioId: "studio-e2e-1",
  branchMainId: "e2e-branch-main-1",
  branchEastId: "e2e-branch-east-1",
  adultMonthlyId: "e2e-sub-individual-adult-monthly",
  adultQuarterlyId: "e2e-sub-individual-adult-quarterly",
  kidMonthlyId: "e2e-sub-individual-kid-monthly",
  kidQuarterlyId: "e2e-sub-individual-kid-quarterly",
  kidsBatchId: "e2e-batch-kids-1",
  beginnerBatchId: "e2e-batch-beginner-1",
  trialBatchId: "e2e-batch-trial-1",
  sessionAttendanceId: "e2e-session-kids-mon",
  sessionAttendancePastId: "e2e-session-kids-past-1",
  membershipStudentId: "e2e-membership-student-1",
  users: {
    SYSTEM_ADMIN: {
      id: "e2e-system-admin-1",
      firebaseUid: "e2e-system-admin-1",
      email: "e2e-admin@stepup.dev",
      name: "E2E System Admin",
    },
    OWNER: {
      id: "e2e-owner-1",
      firebaseUid: "e2e-owner-1",
      email: "e2e-owner@stepup.dev",
      name: "Studio Owner",
    },
    STAFF: {
      id: "e2e-staff-1",
      firebaseUid: "e2e-staff-1",
      email: "e2e-staff@stepup.dev",
      name: "Front Desk Staff",
    },
    TRAINER: {
      id: "e2e-trainer-1",
      firebaseUid: "e2e-trainer-1",
      email: "e2e-trainer@stepup.dev",
      name: "Lead Trainer",
    },
    TRAINER_2: {
      id: "e2e-trainer-2",
      firebaseUid: "e2e-trainer-2",
      email: "e2e-trainer-2@stepup.dev",
      name: "Second Trainer",
    },
    STUDENT: {
      id: "e2e-student-1",
      firebaseUid: "e2e-student-1",
      email: "e2e-student@stepup.dev",
      name: "Alex Student",
    },
    PARENT: {
      id: "e2e-parent-1",
      firebaseUid: "e2e-parent-1",
      email: "e2e-parent@stepup.dev",
      name: "Jamie Parent",
    },
  },
} as const;

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

function nextWeekdayOccurrences(
  weekday: number,
  count: number,
  hour: number,
  minute = 0,
  from = new Date(),
): Date[] {
  const results: Date[] = [];
  const cursor = new Date(
    Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()),
  );
  while (results.length < count) {
    if (cursor.getUTCDay() === weekday) {
      const startsAt = new Date(cursor);
      startsAt.setUTCHours(hour, minute, 0, 0);
      if (startsAt.getTime() > from.getTime()) {
        results.push(new Date(startsAt));
      }
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return results;
}

type SeedUser = {
  id: string;
  firebaseUid: string;
  email: string;
  name: string;
  phone: string;
  role: UserRole;
  styles: string[];
  profileVisibility: ProfileVisibility;
};

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
          preferredBranchId: E2E.branchMainId,
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
    },
  });
}

async function main() {
  const { studioId } = E2E;
  const u = E2E.users;

  await upsertUser(
    {
      ...u.SYSTEM_ADMIN,
      phone: "+91 98000 90000",
      role: UserRole.SYSTEM_ADMIN,
      styles: [],
      profileVisibility: ProfileVisibility.PRIVATE,
    },
    null,
  );

  await upsertUser(
    {
      ...u.OWNER,
      phone: "+91 98000 90001",
      role: UserRole.OWNER,
      styles: ["Hip Hop"],
      profileVisibility: ProfileVisibility.PUBLIC,
    },
    null,
  );

  await prisma.studio.upsert({
    where: { id: studioId },
    update: {
      name: "E2E Test Studio",
      address: "1 Test Lane",
      contact: u.OWNER.email,
      ownerId: u.OWNER.id,
    },
    create: {
      id: studioId,
      name: "E2E Test Studio",
      address: "1 Test Lane",
      photos: [],
      contact: u.OWNER.email,
      ownerId: u.OWNER.id,
    },
  });

  const e2eDanceStyles = [
    {
      id: "hip-hop",
      label: "Hip Hop",
      abbrev: "HH",
      color: "#E4572E",
      emoji: "🕺",
    },
    {
      id: "ballet",
      label: "Ballet",
      abbrev: "BA",
      color: "#6C63FF",
      emoji: "🩰",
    },
    {
      id: "contemporary",
      label: "Contemporary",
      abbrev: "CO",
      color: "#00B894",
      emoji: "💃",
    },
  ];

  await prisma.studioSettings.upsert({
    where: { studioId },
    update: {
      danceStyles: e2eDanceStyles,
    },
    create: {
      studioId,
      graceDays: 3,
      expireAlertDays: 7,
      platformFeePercent: 5,
      danceStyles: e2eDanceStyles,
    },
  });

  await prisma.user.update({
    where: { id: u.OWNER.id },
    data: { studioId },
  });

  for (const branch of [
    {
      id: E2E.branchMainId,
      name: "E2E Main",
      address: "1 Test Lane",
    },
    {
      id: E2E.branchEastId,
      name: "E2E East",
      address: "2 Test Lane",
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

  const studioUsers: SeedUser[] = [
    {
      ...u.STAFF,
      phone: "+91 98000 90002",
      role: UserRole.STAFF,
      styles: [],
      profileVisibility: ProfileVisibility.PUBLIC,
    },
    {
      ...u.TRAINER,
      phone: "+91 98000 90003",
      role: UserRole.TRAINER,
      styles: ["Hip Hop"],
      profileVisibility: ProfileVisibility.PUBLIC,
    },
    {
      ...u.TRAINER_2,
      phone: "+91 98000 90004",
      role: UserRole.TRAINER,
      styles: ["Contemporary"],
      profileVisibility: ProfileVisibility.PUBLIC,
    },
    {
      ...u.PARENT,
      phone: "+91 98000 90005",
      role: UserRole.PARENT,
      styles: [],
      profileVisibility: ProfileVisibility.PRIVATE,
    },
    {
      ...u.STUDENT,
      phone: "+91 98000 90006",
      role: UserRole.STUDENT,
      styles: ["Hip Hop"],
      profileVisibility: ProfileVisibility.PUBLIC,
    },
  ];

  for (const user of studioUsers) {
    await upsertUser(user, studioId);
  }

  await prisma.parentChild.upsert({
    where: {
      parentUserId_childUserId: {
        parentUserId: u.PARENT.id,
        childUserId: u.STUDENT.id,
      },
    },
    update: {},
    create: {
      parentUserId: u.PARENT.id,
      childUserId: u.STUDENT.id,
    },
  });

  const subscriptions = [
    {
      id: E2E.adultMonthlyId,
      name: "E2E Adult Monthly",
      kind: SubscriptionKind.INDIVIDUAL,
      individualAudience: IndividualAudience.ADULT,
      billingCadence: BillingCadence.MONTHLY,
      adultSeats: 1,
      kidSeats: 0,
      price: 3500,
    },
    {
      id: E2E.adultQuarterlyId,
      name: "E2E Adult Quarterly",
      kind: SubscriptionKind.INDIVIDUAL,
      individualAudience: IndividualAudience.ADULT,
      billingCadence: BillingCadence.QUARTERLY,
      adultSeats: 1,
      kidSeats: 0,
      price: 9000,
    },
    {
      id: E2E.kidMonthlyId,
      name: "E2E Kid Monthly",
      kind: SubscriptionKind.INDIVIDUAL,
      individualAudience: IndividualAudience.KID,
      billingCadence: BillingCadence.MONTHLY,
      adultSeats: 0,
      kidSeats: 1,
      price: 2500,
    },
    {
      id: E2E.kidQuarterlyId,
      name: "E2E Kid Quarterly",
      kind: SubscriptionKind.INDIVIDUAL,
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
        kind: sub.kind,
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
        kind: sub.kind,
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
  };

  const batches: BatchSeed[] = [
    {
      id: E2E.kidsBatchId,
      name: "E2E Kids Batch",
      category: "KIDS",
      branchId: E2E.branchMainId,
      enrollmentMode: EnrollmentMode.STAFF_ONLY,
      trainerIds: [u.TRAINER.id],
      scheduleJson: { days: ["Mon", "Wed"], time: "17:00" },
    },
    {
      id: E2E.beginnerBatchId,
      name: "E2E Adult Beginner",
      category: "ADULTS",
      branchId: E2E.branchEastId,
      enrollmentMode: EnrollmentMode.SELF_JOIN,
      trainerIds: [u.TRAINER.id],
      scheduleJson: { days: ["Sat"], time: "10:00" },
    },
    {
      id: E2E.trialBatchId,
      name: "E2E Open Trial",
      category: "ADULTS",
      branchId: E2E.branchMainId,
      enrollmentMode: EnrollmentMode.SELF_JOIN,
      trainerIds: [u.TRAINER.id, u.TRAINER_2.id],
      scheduleJson: { days: ["Sat"], time: "11:00" },
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
          { name: "Hip-hop", description: "E2E fixture class" },
        ],
        scheduleJson: data.scheduleJson,
        capacity: 20,
        enrollmentMode: data.enrollmentMode,
        active: true,
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
          { name: "Hip-hop", description: "E2E fixture class" },
        ],
        scheduleJson: data.scheduleJson,
        capacity: 20,
        enrollmentMode: data.enrollmentMode,
        creatorId: u.TRAINER.id,
        active: true,
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
    { batchId: E2E.kidsBatchId, subscriptionId: E2E.kidMonthlyId },
    { batchId: E2E.kidsBatchId, subscriptionId: E2E.kidQuarterlyId },
    { batchId: E2E.beginnerBatchId, subscriptionId: E2E.adultMonthlyId },
    { batchId: E2E.beginnerBatchId, subscriptionId: E2E.adultQuarterlyId },
    { batchId: E2E.trialBatchId, subscriptionId: E2E.adultMonthlyId },
    { batchId: E2E.trialBatchId, subscriptionId: E2E.adultQuarterlyId },
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

  await prisma.batchEnrollment.upsert({
    where: {
      batchId_studentId: {
        batchId: E2E.kidsBatchId,
        studentId: u.STUDENT.id,
      },
    },
    update: {},
    create: {
      batchId: E2E.kidsBatchId,
      studentId: u.STUDENT.id,
    },
  });

  const now = new Date();
  const weekStartForMembership = mondayOfWeek(now);
  const monthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  );
  const periodStart =
    weekStartForMembership < monthStart ? weekStartForMembership : monthStart;
  const periodEnd = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
  );

  await prisma.membership.upsert({
    where: { id: E2E.membershipStudentId },
    update: {
      subscriptionId: E2E.kidMonthlyId,
      purchaserUserId: u.PARENT.id,
      periodStart,
      periodEnd,
      status: MembershipStatus.ACTIVE,
    },
    create: {
      id: E2E.membershipStudentId,
      subscriptionId: E2E.kidMonthlyId,
      purchaserUserId: u.PARENT.id,
      periodStart,
      periodEnd,
      status: MembershipStatus.ACTIVE,
    },
  });

  await prisma.membershipCoveredStudent.upsert({
    where: {
      membershipId_studentId: {
        membershipId: E2E.membershipStudentId,
        studentId: u.STUDENT.id,
      },
    },
    update: { seatRole: MembershipSeatRole.KID },
    create: {
      membershipId: E2E.membershipStudentId,
      studentId: u.STUDENT.id,
      seatRole: MembershipSeatRole.KID,
    },
  });

  const weekStart = mondayOfWeek();
  const sessions: Array<{
    id: string;
    batchId: string;
    startsAt: Date;
    endsAt: Date;
    status: SessionStatus;
    type?: SessionType;
  }> = [
    {
      id: E2E.sessionAttendancePastId,
      batchId: E2E.kidsBatchId,
      startsAt: utcAt(weekStart, -7, 17),
      endsAt: utcAt(weekStart, -7, 18),
      status: SessionStatus.COMPLETED,
    },
    {
      id: E2E.sessionAttendanceId,
      batchId: E2E.kidsBatchId,
      startsAt: utcAt(weekStart, 0, 17),
      endsAt: utcAt(weekStart, 0, 18),
      status: SessionStatus.SCHEDULED,
    },
    ...nextWeekdayOccurrences(6, 5, 10).map((startsAt, index) => {
      const endsAt = new Date(startsAt);
      endsAt.setUTCHours(11, 0, 0, 0);
      return {
        id: `e2e-session-beginner-w${index}`,
        batchId: E2E.beginnerBatchId,
        startsAt,
        endsAt,
        status: SessionStatus.SCHEDULED,
        type: SessionType.REGULAR,
      };
    }),
    ...nextWeekdayOccurrences(6, 5, 11).map((startsAt, index) => {
      const endsAt = new Date(startsAt);
      endsAt.setUTCHours(12, 0, 0, 0);
      return {
        id: `e2e-session-trial-w${index}`,
        batchId: E2E.trialBatchId,
        startsAt,
        endsAt,
        status: SessionStatus.SCHEDULED,
        type: SessionType.REGULAR,
      };
    }),
  ];

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

  console.log(`E2E test studio ready: ${studioId}`);
  console.log(
    `  users: ${Object.values(u)
      .map((x) => x.id)
      .join(", ")}`,
  );
  console.log(
    `  batches: ${E2E.kidsBatchId}, ${E2E.beginnerBatchId}, ${E2E.trialBatchId}`,
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
