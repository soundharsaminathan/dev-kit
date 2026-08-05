import "dotenv/config";
import { ConfigService } from "@nestjs/config";
import {
  AttendanceSource,
  AttendanceStatus,
  BillingCadence,
  BookingStatus,
  BookingType,
  ContestStatus,
  ConversationRole,
  ConversationType,
  EnrollmentMode,
  IndividualAudience,
  InvoiceStatus,
  MembershipSeatRole,
  MembershipStatus,
  MessageType,
  type Prisma,
  ProfileVisibility,
  SessionStatus,
  SessionType,
  SubscriptionKind,
  UserRole,
} from "@prisma/client";
import { SAMPLE_CERTIFICATE_LAYOUT } from "../src/certificates/certificate-layout";
import { ChatCryptoService } from "../src/chat/chat-crypto.service";
import { UserCryptoService } from "../src/users/user-crypto.service";
import { createScriptPrismaClient, withDbRetry } from "./script-db";

/**
 * Isolated studio for deployed Playwright smoke against the real DB.
 * Re-run anytime after cleanup:
 *   pnpm --filter @step-up/api prisma:seed:smoke
 */

const crypto = new UserCryptoService(new ConfigService());
const chatCrypto = new ChatCryptoService(new ConfigService());
let prisma = createScriptPrismaClient();

export const SMOKE = {
  studioId: "studio-smoke-1",
  branchMainId: "smoke-branch-main-1",
  branchEastId: "smoke-branch-east-1",
  adultMonthlyId: "smoke-sub-individual-adult-monthly",
  adultQuarterlyId: "smoke-sub-individual-adult-quarterly",
  kidMonthlyId: "smoke-sub-individual-kid-monthly",
  kidQuarterlyId: "smoke-sub-individual-kid-quarterly",
  kidsBatchId: "smoke-batch-kids-1",
  beginnerBatchId: "smoke-batch-beginner-1",
  trialBatchId: "smoke-batch-trial-1",
  sessionAttendanceId: "smoke-session-kids-mon",
  sessionAttendancePastId: "smoke-session-kids-past-1",
  membershipStudentId: "smoke-membership-student-1",
  invoicePendingId: "smoke-invoice-pending-1",
  bookingPendingId: "smoke-booking-pending-1",
  certificateTemplateId: "smoke-cert-template-1",
  contestId: "smoke-contest-1",
  conversationId: "smoke-conversation-dm-1",
  postId: "smoke-post-1",
  users: {
    SYSTEM_ADMIN: {
      id: "smoke-system-admin-1",
      firebaseUid: "smoke-system-admin-1",
      email: "smoke-admin@stepup.dev",
      name: "Smoke System Admin",
    },
    OWNER: {
      id: "smoke-owner-1",
      firebaseUid: "smoke-owner-1",
      email: "smoke-owner@stepup.dev",
      name: "Smoke Studio Owner",
    },
    STAFF: {
      id: "smoke-staff-1",
      firebaseUid: "smoke-staff-1",
      email: "smoke-staff@stepup.dev",
      name: "Smoke Front Desk",
    },
    TRAINER: {
      id: "smoke-trainer-1",
      firebaseUid: "smoke-trainer-1",
      email: "smoke-trainer@stepup.dev",
      name: "Smoke Lead Trainer",
    },
    STUDENT: {
      id: "smoke-student-1",
      firebaseUid: "smoke-student-1",
      email: "smoke-student@stepup.dev",
      name: "Smoke Alex Student",
    },
    PARENT: {
      id: "smoke-parent-1",
      firebaseUid: "smoke-parent-1",
      email: "smoke-parent@stepup.dev",
      name: "Smoke Jamie Parent",
    },
    ONBOARDING: {
      id: "smoke-onboarding-1",
      firebaseUid: "smoke-onboarding-1",
      email: "smoke-onboarding@stepup.dev",
      name: "Smoke New Dancer",
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
  incompleteOnboarding?: boolean;
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
      ? user.incompleteOnboarding
        ? {
            experienceLevel: null,
            scheduleVibe: [] as string[],
            gender: null,
            ageRange: null,
            preferredBranchId: null,
            onboardingCompletedAt: null,
          }
        : {
            experienceLevel: "BEGINNER" as const,
            scheduleVibe: ["weekday_evenings", "weekends"],
            gender: "FEMALE" as const,
            ageRange: "TWENTY_TO_FORTY" as const,
            preferredBranchId: SMOKE.branchMainId,
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
      active: true,
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
  const { studioId } = SMOKE;
  const u = SMOKE.users;

  await upsertUser(
    {
      ...u.SYSTEM_ADMIN,
      phone: "+91 97000 90000",
      role: UserRole.SYSTEM_ADMIN,
      styles: [],
      profileVisibility: ProfileVisibility.PRIVATE,
    },
    null,
  );

  await upsertUser(
    {
      ...u.OWNER,
      phone: "+91 97000 90001",
      role: UserRole.OWNER,
      styles: ["Hip Hop"],
      profileVisibility: ProfileVisibility.PUBLIC,
    },
    null,
  );

  await prisma.studio.upsert({
    where: { id: studioId },
    update: {
      name: "Smoke Test Studio",
      address: "1 Smoke Lane",
      contact: u.OWNER.email,
      ownerId: u.OWNER.id,
    },
    create: {
      id: studioId,
      name: "Smoke Test Studio",
      address: "1 Smoke Lane",
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
      id: SMOKE.branchMainId,
      name: "Smoke Main",
      address: "1 Smoke Lane",
    },
    {
      id: SMOKE.branchEastId,
      name: "Smoke East",
      address: "2 Smoke Lane",
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
      phone: "+91 97000 90002",
      role: UserRole.STAFF,
      styles: [],
      profileVisibility: ProfileVisibility.PUBLIC,
    },
    {
      ...u.TRAINER,
      phone: "+91 97000 90003",
      role: UserRole.TRAINER,
      styles: ["Hip Hop"],
      profileVisibility: ProfileVisibility.PUBLIC,
    },
    {
      ...u.PARENT,
      phone: "+91 97000 90005",
      role: UserRole.PARENT,
      styles: [],
      profileVisibility: ProfileVisibility.PRIVATE,
    },
    {
      ...u.STUDENT,
      phone: "+91 97000 90006",
      role: UserRole.STUDENT,
      styles: ["Hip Hop"],
      profileVisibility: ProfileVisibility.PUBLIC,
    },
    {
      ...u.ONBOARDING,
      phone: "+91 97000 90007",
      role: UserRole.STUDENT,
      styles: [],
      profileVisibility: ProfileVisibility.PRIVATE,
      incompleteOnboarding: true,
    },
  ];

  for (const user of studioUsers) {
    await upsertUser(user, studioId);
  }

  // Reset onboarding user every run so the wizard flow is re-testable.
  // Clear trial bookings/enrollments left behind when a prior run's cleanup failed.
  await prisma.booking.deleteMany({
    where: { studentId: u.ONBOARDING.id },
  });
  await prisma.batchEnrollment.deleteMany({
    where: { studentId: u.ONBOARDING.id },
  });
  await prisma.user.update({
    where: { id: u.ONBOARDING.id },
    data: {
      experienceLevel: null,
      scheduleVibe: [],
      gender: null,
      ageRange: null,
      preferredBranchId: null,
      onboardingCompletedAt: null,
      styles: [],
    },
  });

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
      id: SMOKE.adultMonthlyId,
      name: "Smoke Adult Monthly",
      kind: SubscriptionKind.INDIVIDUAL,
      individualAudience: IndividualAudience.ADULT,
      billingCadence: BillingCadence.MONTHLY,
      adultSeats: 1,
      kidSeats: 0,
      price: 3500,
    },
    {
      id: SMOKE.adultQuarterlyId,
      name: "Smoke Adult Quarterly",
      kind: SubscriptionKind.INDIVIDUAL,
      individualAudience: IndividualAudience.ADULT,
      billingCadence: BillingCadence.QUARTERLY,
      adultSeats: 1,
      kidSeats: 0,
      price: 9000,
    },
    {
      id: SMOKE.kidMonthlyId,
      name: "Smoke Kid Monthly",
      kind: SubscriptionKind.INDIVIDUAL,
      individualAudience: IndividualAudience.KID,
      billingCadence: BillingCadence.MONTHLY,
      adultSeats: 0,
      kidSeats: 1,
      price: 2500,
    },
    {
      id: SMOKE.kidQuarterlyId,
      name: "Smoke Kid Quarterly",
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

  await prisma.certificateTemplate.upsert({
    where: { id: SMOKE.certificateTemplateId },
    update: {
      studioId,
      name: "Smoke Certificate",
      isSample: false,
      layoutJson: SAMPLE_CERTIFICATE_LAYOUT,
    },
    create: {
      id: SMOKE.certificateTemplateId,
      studioId,
      name: "Smoke Certificate",
      isSample: false,
      layoutJson: SAMPLE_CERTIFICATE_LAYOUT,
    },
  });

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
      id: SMOKE.kidsBatchId,
      name: "Smoke Kids Batch",
      category: "KIDS",
      branchId: SMOKE.branchMainId,
      enrollmentMode: EnrollmentMode.STAFF_ONLY,
      trainerIds: [u.TRAINER.id],
      scheduleJson: { days: ["Mon", "Wed"], time: "17:00" },
    },
    {
      id: SMOKE.beginnerBatchId,
      name: "Smoke Adult Beginner",
      category: "ADULTS",
      branchId: SMOKE.branchEastId,
      enrollmentMode: EnrollmentMode.SELF_JOIN,
      trainerIds: [u.TRAINER.id],
      scheduleJson: { days: ["Sat"], time: "10:00" },
    },
    {
      id: SMOKE.trialBatchId,
      name: "Smoke Open Trial",
      category: "ADULTS",
      branchId: SMOKE.branchMainId,
      enrollmentMode: EnrollmentMode.SELF_JOIN,
      trainerIds: [u.TRAINER.id],
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
          { name: "Hip-hop", description: "Smoke fixture class" },
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
          { name: "Hip-hop", description: "Smoke fixture class" },
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
    { batchId: SMOKE.kidsBatchId, subscriptionId: SMOKE.kidMonthlyId },
    { batchId: SMOKE.kidsBatchId, subscriptionId: SMOKE.kidQuarterlyId },
    { batchId: SMOKE.beginnerBatchId, subscriptionId: SMOKE.adultMonthlyId },
    { batchId: SMOKE.beginnerBatchId, subscriptionId: SMOKE.adultQuarterlyId },
    { batchId: SMOKE.trialBatchId, subscriptionId: SMOKE.adultMonthlyId },
    { batchId: SMOKE.trialBatchId, subscriptionId: SMOKE.adultQuarterlyId },
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
        batchId: SMOKE.kidsBatchId,
        studentId: u.STUDENT.id,
      },
    },
    update: {},
    create: {
      batchId: SMOKE.kidsBatchId,
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
    where: { id: SMOKE.membershipStudentId },
    update: {
      subscriptionId: SMOKE.kidMonthlyId,
      purchaserUserId: u.PARENT.id,
      periodStart,
      periodEnd,
      status: MembershipStatus.ACTIVE,
    },
    create: {
      id: SMOKE.membershipStudentId,
      subscriptionId: SMOKE.kidMonthlyId,
      purchaserUserId: u.PARENT.id,
      periodStart,
      periodEnd,
      status: MembershipStatus.ACTIVE,
    },
  });

  await prisma.membershipCoveredStudent.upsert({
    where: {
      membershipId_studentId: {
        membershipId: SMOKE.membershipStudentId,
        studentId: u.STUDENT.id,
      },
    },
    update: { seatRole: MembershipSeatRole.KID },
    create: {
      membershipId: SMOKE.membershipStudentId,
      studentId: u.STUDENT.id,
      seatRole: MembershipSeatRole.KID,
    },
  });

  const weekStart = mondayOfWeek();
  const mondayAttendanceStart = utcAt(weekStart, 0, 17);
  const attendanceStartsAt =
    mondayAttendanceStart.getTime() > now.getTime()
      ? new Date(now.getTime() - 30 * 60 * 1000)
      : mondayAttendanceStart;
  const attendanceEndsAt = new Date(
    attendanceStartsAt.getTime() + 60 * 60 * 1000,
  );
  const sessions: Array<{
    id: string;
    batchId: string;
    startsAt: Date;
    endsAt: Date;
    status: SessionStatus;
    type?: SessionType;
  }> = [
    {
      id: SMOKE.sessionAttendancePastId,
      batchId: SMOKE.kidsBatchId,
      startsAt: utcAt(weekStart, -7, 17),
      endsAt: utcAt(weekStart, -7, 18),
      status: SessionStatus.COMPLETED,
    },
    {
      id: SMOKE.sessionAttendanceId,
      batchId: SMOKE.kidsBatchId,
      startsAt: attendanceStartsAt,
      endsAt: attendanceEndsAt,
      status: SessionStatus.SCHEDULED,
    },
    ...nextWeekdayOccurrences(6, 5, 10).map((startsAt, index) => {
      const endsAt = new Date(startsAt);
      endsAt.setUTCHours(11, 0, 0, 0);
      return {
        id: `smoke-session-beginner-w${index}`,
        batchId: SMOKE.beginnerBatchId,
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
        id: `smoke-session-trial-w${index}`,
        batchId: SMOKE.trialBatchId,
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

  await prisma.attendance.upsert({
    where: {
      sessionId_studentId: {
        sessionId: SMOKE.sessionAttendancePastId,
        studentId: u.STUDENT.id,
      },
    },
    update: {
      status: AttendanceStatus.PRESENT,
      markedById: u.TRAINER.id,
      source: AttendanceSource.TRAINER,
    },
    create: {
      sessionId: SMOKE.sessionAttendancePastId,
      studentId: u.STUDENT.id,
      status: AttendanceStatus.PRESENT,
      markedById: u.TRAINER.id,
      source: AttendanceSource.TRAINER,
    },
  });

  await prisma.invoice.upsert({
    where: { id: SMOKE.invoicePendingId },
    update: {
      studentId: u.STUDENT.id,
      amount: 1500,
      status: InvoiceStatus.PENDING,
      paymentMethod: null,
      paidAt: null,
      platformFeePercent: 5,
      studioId,
      membershipId: null,
      paymentHoldExpiresAt: null,
      purchaseMeta: null,
    },
    create: {
      id: SMOKE.invoicePendingId,
      studentId: u.STUDENT.id,
      amount: 1500,
      status: InvoiceStatus.PENDING,
      platformFeePercent: 5,
      studioId,
    },
  });

  await prisma.booking.upsert({
    where: { id: SMOKE.bookingPendingId },
    update: {
      studioId,
      studentId: u.STUDENT.id,
      type: BookingType.TRIAL,
      batchId: SMOKE.trialBatchId,
      status: BookingStatus.PENDING,
      notes: "Smoke fixture booking",
    },
    create: {
      id: SMOKE.bookingPendingId,
      studioId,
      studentId: u.STUDENT.id,
      type: BookingType.TRIAL,
      batchId: SMOKE.trialBatchId,
      status: BookingStatus.PENDING,
      notes: "Smoke fixture booking",
    },
  });

  const contestStarts = new Date(now);
  contestStarts.setUTCDate(contestStarts.getUTCDate() + 14);
  const contestEnds = new Date(contestStarts);
  contestEnds.setUTCDate(contestEnds.getUTCDate() + 2);

  await prisma.contest.upsert({
    where: { id: SMOKE.contestId },
    update: {
      studioId,
      branchId: SMOKE.branchMainId,
      title: "Smoke Showcase",
      description: "Smoke fixture contest",
      startsAt: contestStarts,
      endsAt: contestEnds,
      status: ContestStatus.OPEN,
      creatorId: u.STAFF.id,
      certificationEnabled: false,
      certificateTemplateId: null,
    },
    create: {
      id: SMOKE.contestId,
      studioId,
      branchId: SMOKE.branchMainId,
      title: "Smoke Showcase",
      description: "Smoke fixture contest",
      startsAt: contestStarts,
      endsAt: contestEnds,
      status: ContestStatus.OPEN,
      creatorId: u.STAFF.id,
      certificationEnabled: false,
    },
  });

  await prisma.post.upsert({
    where: { id: SMOKE.postId },
    update: {
      authorId: u.STUDENT.id,
      caption: "Smoke fixture post",
      imageUrls: [],
    },
    create: {
      id: SMOKE.postId,
      authorId: u.STUDENT.id,
      caption: "Smoke fixture post",
      imageUrls: [],
    },
  });

  const dmKey = [u.STUDENT.id, u.TRAINER.id].sort().join(":");
  let encryptedKey: string | null = null;
  try {
    encryptedKey = chatCrypto.generateWrappedKey();
  } catch {
    console.warn(
      "CHAT_MASTER_KEY missing — skipping smoke DM conversation seed",
    );
  }

  if (encryptedKey) {
    await prisma.conversation.deleteMany({
      where: {
        dmKey,
        id: { not: SMOKE.conversationId },
      },
    });

    await prisma.conversation.upsert({
      where: { id: SMOKE.conversationId },
      update: {
        type: ConversationType.DM,
        title: null,
        dmKey,
        encryptedKey,
        createdById: u.STUDENT.id,
        lastMessageAt: now,
      },
      create: {
        id: SMOKE.conversationId,
        type: ConversationType.DM,
        dmKey,
        encryptedKey,
        createdById: u.STUDENT.id,
        lastMessageAt: now,
      },
    });

    for (const memberId of [u.STUDENT.id, u.TRAINER.id]) {
      await prisma.conversationMember.upsert({
        where: {
          conversationId_userId: {
            conversationId: SMOKE.conversationId,
            userId: memberId,
          },
        },
        update: { role: ConversationRole.MEMBER },
        create: {
          conversationId: SMOKE.conversationId,
          userId: memberId,
          role: ConversationRole.MEMBER,
        },
      });
    }

    const encrypted = chatCrypto.encryptPayload(encryptedKey, {
      text: "Smoke hello",
    });
    const existingMessage = await prisma.message.findFirst({
      where: {
        conversationId: SMOKE.conversationId,
        clientMessageId: "smoke-seed-hello",
      },
    });
    if (!existingMessage) {
      await prisma.message.create({
        data: {
          conversationId: SMOKE.conversationId,
          senderId: u.TRAINER.id,
          clientMessageId: "smoke-seed-hello",
          type: MessageType.TEXT,
          ciphertext: encrypted.ciphertext,
          iv: encrypted.iv,
          imageUrls: [],
        },
      });
    }
  }

  console.log(`Smoke test studio ready: ${studioId}`);
  console.log(
    `  users: ${Object.values(u)
      .map((x) => x.id)
      .join(", ")}`,
  );
}

withDbRetry("smoke seed", async () => {
  await prisma.$disconnect().catch(() => undefined);
  prisma = createScriptPrismaClient();
  await prisma.$connect();
  await main();
})
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => undefined);
  });
