import "dotenv/config";
import { createScriptPrismaClient, withDbRetry } from "./script-db";
import { isSmokeLoadId } from "./seed-smoke-load";

/**
 * Removes run-created transactional data for the smoke studio while keeping
 * the structural seed (users, batches, plans, branches, fixed sessions) and
 * dense `smoke-load-*` performance fixtures.
 *
 *   pnpm --filter @step-up/api prisma:cleanup:smoke
 */

let prisma = createScriptPrismaClient();

const STUDIO_ID = "studio-smoke-1";
const SEED_USER_IDS = [
  "smoke-system-admin-1",
  "smoke-owner-1",
  "smoke-staff-1",
  "smoke-trainer-1",
  "smoke-student-1",
  "smoke-parent-1",
  "smoke-onboarding-1",
] as const;
const SEED_BATCH_IDS = [
  "smoke-batch-kids-1",
  "smoke-batch-beginner-1",
  "smoke-batch-trial-1",
] as const;
const SEED_SUBSCRIPTION_IDS = [
  "smoke-sub-individual-adult-monthly",
  "smoke-sub-individual-adult-quarterly",
  "smoke-sub-individual-kid-monthly",
  "smoke-sub-individual-kid-quarterly",
] as const;
const SEED_SESSION_IDS = [
  "smoke-session-kids-mon",
  "smoke-session-kids-past-1",
] as const;
const SEED_IDS = {
  invoicePendingId: "smoke-invoice-pending-1",
  invoicePaidMembershipId: "smoke-invoice-paid-membership-1",
  bookingPendingId: "smoke-booking-pending-1",
  membershipStudentId: "smoke-membership-student-1",
  certificateTemplateId: "smoke-cert-template-1",
  contestId: "smoke-contest-1",
  conversationId: "smoke-conversation-dm-1",
  postId: "smoke-post-1",
} as const;

function isPreservedUserId(id: string) {
  return (
    SEED_USER_IDS.includes(id as (typeof SEED_USER_IDS)[number]) ||
    isSmokeLoadId(id)
  );
}

function isPreservedBatchId(id: string) {
  return (
    SEED_BATCH_IDS.includes(id as (typeof SEED_BATCH_IDS)[number]) ||
    isSmokeLoadId(id)
  );
}

function isPreservedSessionId(id: string) {
  return (
    SEED_SESSION_IDS.includes(id as (typeof SEED_SESSION_IDS)[number]) ||
    id.startsWith("smoke-session-beginner-w") ||
    id.startsWith("smoke-session-trial-w") ||
    isSmokeLoadId(id)
  );
}

function isPreservedInvoiceId(id: string) {
  return (
    id === SEED_IDS.invoicePendingId ||
    id === SEED_IDS.invoicePaidMembershipId ||
    isSmokeLoadId(id)
  );
}

function isPreservedBookingId(id: string) {
  return id === SEED_IDS.bookingPendingId || isSmokeLoadId(id);
}

function isPreservedMembershipId(id: string) {
  return id === SEED_IDS.membershipStudentId || isSmokeLoadId(id);
}

function isPreservedPostId(id: string) {
  return id === SEED_IDS.postId || isSmokeLoadId(id);
}

async function main() {
  const studioUsers = await prisma.user.findMany({
    where: { studioId: STUDIO_ID },
    select: { id: true },
  });
  const studioUserIds = studioUsers.map((user) => user.id);
  const ephemeralUserIds = studioUserIds.filter((id) => !isPreservedUserId(id));

  const batches = await prisma.batch.findMany({
    where: { studioId: STUDIO_ID },
    select: { id: true },
  });
  const batchIds = batches.map((batch) => batch.id);
  const ephemeralBatchIds = batchIds.filter((id) => !isPreservedBatchId(id));

  const sessions = await prisma.session.findMany({
    where: { batchId: { in: batchIds } },
    select: { id: true },
  });
  const sessionIds = sessions.map((session) => session.id);
  const ephemeralSessionIds = sessionIds.filter(
    (id) => !isPreservedSessionId(id),
  );

  // Notifications for smoke users (any created during the run).
  await prisma.notificationDelivery.deleteMany({
    where: { notification: { userId: { in: studioUserIds } } },
  });
  await prisma.notification.deleteMany({
    where: { userId: { in: studioUserIds } },
  });

  // Attendance created during the run on seed/load sessions.
  // Keep smoke-load attendance and the past PRESENT seed for Alex.
  const attendance = await prisma.attendance.findMany({
    where: { sessionId: { in: sessionIds } },
    select: { id: true, sessionId: true, studentId: true },
  });
  const ephemeralAttendanceIds = attendance
    .filter((row) => {
      if (
        row.sessionId === "smoke-session-kids-past-1" &&
        row.studentId === "smoke-student-1"
      ) {
        return false;
      }
      if (isSmokeLoadId(row.sessionId) || isSmokeLoadId(row.studentId)) {
        return false;
      }
      return true;
    })
    .map((row) => row.id);
  if (ephemeralAttendanceIds.length > 0) {
    await prisma.attendance.deleteMany({
      where: { id: { in: ephemeralAttendanceIds } },
    });
  }

  // Bookings except seed pending + smoke-load fixtures.
  const bookings = await prisma.booking.findMany({
    where: { studioId: STUDIO_ID },
    select: { id: true },
  });
  const ephemeralBookingIds = bookings
    .map((booking) => booking.id)
    .filter((id) => !isPreservedBookingId(id));
  if (ephemeralBookingIds.length > 0) {
    await prisma.booking.deleteMany({
      where: { id: { in: ephemeralBookingIds } },
    });
  }

  // Invoices except seed + smoke-load fixtures — reset seed pending invoice.
  const invoices = await prisma.invoice.findMany({
    where: { studioId: STUDIO_ID },
    select: { id: true },
  });
  const ephemeralInvoiceIds = invoices
    .map((invoice) => invoice.id)
    .filter((id) => !isPreservedInvoiceId(id));
  if (ephemeralInvoiceIds.length > 0) {
    await prisma.invoice.deleteMany({
      where: { id: { in: ephemeralInvoiceIds } },
    });
  }
  await prisma.invoice.updateMany({
    where: { id: SEED_IDS.invoicePendingId },
    data: {
      studentId: "smoke-student-1",
      amount: 3500,
      status: "PENDING",
      paymentMethod: null,
      paidAt: null,
      razorpayOrderId: null,
      razorpayPaymentId: null,
      paymentHoldExpiresAt: null,
      membershipId: null,
      purchaseMeta: {
        batchId: "smoke-batch-beginner-1",
        subscriptionId: "smoke-sub-individual-adult-monthly",
        purchaserUserId: "smoke-student-1",
        coveredStudents: [
          {
            studentId: "smoke-student-1",
            seatRole: "ADULT",
            batchId: "smoke-batch-beginner-1",
          },
        ],
      },
    },
  });

  await prisma.membership.updateMany({
    where: { id: SEED_IDS.membershipStudentId },
    data: {
      status: "ACTIVE",
    },
  });

  // Memberships created during the run (keep seed + smoke-load memberships).
  const memberships = await prisma.membership.findMany({
    where: {
      OR: [
        { purchaserUserId: { in: studioUserIds } },
        { subscription: { studioId: STUDIO_ID } },
      ],
    },
    select: { id: true },
  });
  const membershipIds = memberships
    .map((m) => m.id)
    .filter((id) => !isPreservedMembershipId(id));
  if (membershipIds.length > 0) {
    await prisma.membershipCoveredStudent.deleteMany({
      where: { membershipId: { in: membershipIds } },
    });
    await prisma.membership.deleteMany({
      where: { id: { in: membershipIds } },
    });
  }

  // Ephemeral subscriptions (plans created during run).
  await prisma.subscription.deleteMany({
    where: {
      studioId: STUDIO_ID,
      id: { notIn: [...SEED_SUBSCRIPTION_IDS] },
    },
  });

  // Contests created during the run (keep seed contest).
  await prisma.contest.deleteMany({
    where: {
      studioId: STUDIO_ID,
      id: { not: SEED_IDS.contestId },
    },
  });

  // Certificate templates created during the run (keep seed + sample).
  await prisma.certificateTemplate.deleteMany({
    where: {
      studioId: STUDIO_ID,
      id: {
        notIn: [SEED_IDS.certificateTemplateId, `cert-sample-${STUDIO_ID}`],
      },
      isSample: false,
    },
  });

  // Chat: delete non-seed conversations for smoke users; trim extra messages.
  const conversations = await prisma.conversation.findMany({
    where: {
      OR: [
        { id: SEED_IDS.conversationId },
        { members: { some: { userId: { in: studioUserIds } } } },
        { batchId: { in: batchIds } },
      ],
    },
    select: { id: true },
  });
  const conversationIds = conversations.map((c) => c.id);
  const ephemeralConversationIds = conversationIds.filter(
    (id) => id !== SEED_IDS.conversationId && !isSmokeLoadId(id),
  );
  if (ephemeralConversationIds.length > 0) {
    await prisma.messageReaction.deleteMany({
      where: { message: { conversationId: { in: ephemeralConversationIds } } },
    });
    await prisma.message.deleteMany({
      where: { conversationId: { in: ephemeralConversationIds } },
    });
    await prisma.conversationMember.deleteMany({
      where: { conversationId: { in: ephemeralConversationIds } },
    });
    await prisma.conversation.deleteMany({
      where: { id: { in: ephemeralConversationIds } },
    });
  }
  await prisma.message.deleteMany({
    where: {
      conversationId: SEED_IDS.conversationId,
      clientMessageId: { not: "smoke-seed-hello" },
    },
  });

  // Posts created during the run (keep seed + smoke-load posts).
  const posts = await prisma.post.findMany({
    where: { authorId: { in: studioUserIds } },
    select: { id: true },
  });
  const ephemeralPostIds = posts
    .map((post) => post.id)
    .filter((id) => !isPreservedPostId(id));
  if (ephemeralPostIds.length > 0) {
    await prisma.postComment.deleteMany({
      where: { postId: { in: ephemeralPostIds } },
    });
    await prisma.postLike.deleteMany({
      where: { postId: { in: ephemeralPostIds } },
    });
    await prisma.post.deleteMany({
      where: { id: { in: ephemeralPostIds } },
    });
  }

  // Ephemeral sessions then batches.
  if (ephemeralSessionIds.length > 0) {
    await prisma.attendance.deleteMany({
      where: { sessionId: { in: ephemeralSessionIds } },
    });
    await prisma.booking.deleteMany({
      where: { sessionId: { in: ephemeralSessionIds } },
    });
    await prisma.session.deleteMany({
      where: { id: { in: ephemeralSessionIds } },
    });
  }

  if (ephemeralBatchIds.length > 0) {
    await prisma.batchEnrollment.deleteMany({
      where: { batchId: { in: ephemeralBatchIds } },
    });
    await prisma.batchTrainer.deleteMany({
      where: { batchId: { in: ephemeralBatchIds } },
    });
    await prisma.batchPlan.deleteMany({
      where: { batchId: { in: ephemeralBatchIds } },
    });
    await prisma.batchRating.deleteMany({
      where: { batchId: { in: ephemeralBatchIds } },
    });
    await prisma.session.deleteMany({
      where: { batchId: { in: ephemeralBatchIds } },
    });
    await prisma.booking.deleteMany({
      where: { batchId: { in: ephemeralBatchIds } },
    });
    await prisma.batch.deleteMany({
      where: { id: { in: ephemeralBatchIds } },
    });
  }

  // Ephemeral students created during the run (keep smoke-load users).
  if (ephemeralUserIds.length > 0) {
    await prisma.parentChild.deleteMany({
      where: {
        OR: [
          { parentUserId: { in: ephemeralUserIds } },
          { childUserId: { in: ephemeralUserIds } },
        ],
      },
    });
    await prisma.batchEnrollment.deleteMany({
      where: { studentId: { in: ephemeralUserIds } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: ephemeralUserIds } },
    });
  }

  // Reset seed booking to PENDING.
  await prisma.booking.updateMany({
    where: { id: SEED_IDS.bookingPendingId },
    data: {
      status: "PENDING",
      paymentHoldExpiresAt: null,
      razorpayOrderId: null,
      razorpayPaymentId: null,
    },
  });

  console.log(`Smoke cleanup complete for ${STUDIO_ID}`);
}

withDbRetry("smoke cleanup", async () => {
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
