-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('OWNER', 'STAFF', 'TRAINER', 'STUDENT', 'PARENT');

-- CreateEnum
CREATE TYPE "BatchCategory" AS ENUM ('KIDS', 'ADULTS');

-- CreateEnum
CREATE TYPE "EnrollmentMode" AS ENUM ('STAFF_ONLY', 'SELF_JOIN');

-- CreateEnum
CREATE TYPE "SubscriptionKind" AS ENUM ('INDIVIDUAL', 'FAMILY');

-- CreateEnum
CREATE TYPE "IndividualAudience" AS ENUM ('ADULT', 'KID');

-- CreateEnum
CREATE TYPE "FamilyPack" AS ENUM ('TWO_KIDS', 'ONE_ADULT_ONE_KID', 'TWO_ADULTS', 'ONE_ADULT_TWO_KIDS', 'TWO_ADULTS_ONE_KID', 'TWO_ADULTS_TWO_KIDS');

-- CreateEnum
CREATE TYPE "BillingCadence" AS ENUM ('MONTHLY', 'QUARTERLY');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('ACTIVE', 'DUE', 'EXPIRED');

-- CreateEnum
CREATE TYPE "MembershipSeatRole" AS ENUM ('ADULT', 'KID');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'UPI_MANUAL');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT');

-- CreateEnum
CREATE TYPE "AttendanceSource" AS ENUM ('TRAINER', 'DESK', 'QR');

-- CreateEnum
CREATE TYPE "BookingType" AS ENUM ('OPEN_SEAT', 'TRIAL', 'PRIVATE');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('MISSED_SESSION', 'SUBSCRIPTION_EXPIRING', 'PAYMENT_OVERDUE', 'RENEWED', 'NOT_RENEWED', 'NEW_FOLLOW', 'CHAT_MESSAGE');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'PUSH', 'EMAIL');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('ACTIVE', 'ARCHIVED', 'DELETED');

-- CreateEnum
CREATE TYPE "ProfileVisibility" AS ENUM ('PUBLIC', 'PRIVATE');

-- CreateEnum
CREATE TYPE "ExperienceLevel" AS ENUM ('BEGINNER', 'SOME_EXPERIENCE', 'INTERMEDIATE', 'ADVANCED');

-- CreateEnum
CREATE TYPE "FollowRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ConversationType" AS ENUM ('DM', 'GROUP', 'BATCH');

-- CreateEnum
CREATE TYPE "ConversationRole" AS ENUM ('ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('TEXT', 'IMAGE', 'AUDIO', 'POLL', 'EVENT', 'LOCATION', 'SYSTEM');

-- CreateEnum
CREATE TYPE "EventRsvpStatus" AS ENUM ('GOING', 'MAYBE', 'DECLINED');

-- CreateEnum
CREATE TYPE "ContestStatus" AS ENUM ('DRAFT', 'OPEN', 'CLOSED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ContestEntryType" AS ENUM ('INDIVIDUAL', 'GROUP');

-- CreateEnum
CREATE TYPE "ContestEntryStatus" AS ENUM ('PENDING', 'CONFIRMED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "BranchMediaKind" AS ENUM ('IMAGE', 'VIDEO');

-- CreateEnum
CREATE TYPE "BranchMediaCategory" AS ENUM ('STUDIO', 'RECEPTION', 'PRACTICE_HALL', 'EVENTS', 'FACILITIES', 'OTHER');

-- CreateEnum
CREATE TYPE "StudentGoalType" AS ENUM ('MONTHLY_SESSIONS');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "firebaseUid" TEXT NOT NULL,
    "encryptedKey" TEXT NOT NULL,
    "piiCiphertext" TEXT NOT NULL,
    "piiIv" TEXT NOT NULL,
    "emailHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "photoUrl" TEXT,
    "bannerUrl" TEXT,
    "coverUrl" TEXT,
    "styles" TEXT[],
    "experienceLevel" "ExperienceLevel",
    "scheduleVibe" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "preferredBranchId" TEXT,
    "onboardingCompletedAt" TIMESTAMP(3),
    "profileVisibility" "ProfileVisibility" NOT NULL DEFAULT 'PRIVATE',
    "studioId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParentChild" (
    "id" TEXT NOT NULL,
    "parentUserId" TEXT NOT NULL,
    "childUserId" TEXT NOT NULL,

    CONSTRAINT "ParentChild_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Studio" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "photos" TEXT[],
    "contact" TEXT,
    "ownerId" TEXT NOT NULL,

    CONSTRAINT "Studio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudioSettings" (
    "studioId" TEXT NOT NULL,
    "graceDays" INTEGER NOT NULL DEFAULT 3,
    "expireAlertDays" INTEGER NOT NULL DEFAULT 7,
    "platformFeePercent" DOUBLE PRECISION NOT NULL DEFAULT 5,

    CONSTRAINT "StudioSettings_pkey" PRIMARY KEY ("studioId")
);

-- CreateTable
CREATE TABLE "StudioBranch" (
    "id" TEXT NOT NULL,
    "studioId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "description" TEXT,
    "coverMediaId" TEXT,
    "amenities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "openingHours" JSONB,
    "pricingBlurb" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudioBranch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BranchMedia" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "kind" "BranchMediaKind" NOT NULL,
    "category" "BranchMediaCategory" NOT NULL DEFAULT 'STUDIO',
    "objectKey" TEXT NOT NULL,
    "caption" TEXT,
    "altText" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BranchMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BranchFaq" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BranchFaq_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BranchTestimonial" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "quote" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "rating" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BranchTestimonial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CertificateTemplate" (
    "id" TEXT NOT NULL,
    "studioId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isSample" BOOLEAN NOT NULL DEFAULT false,
    "layoutJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CertificateTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Batch" (
    "id" TEXT NOT NULL,
    "studioId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "BatchCategory" NOT NULL,
    "danceCategories" JSONB NOT NULL,
    "scheduleJson" JSONB NOT NULL,
    "capacity" INTEGER NOT NULL,
    "enrollmentMode" "EnrollmentMode" NOT NULL,
    "creatorId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "certificationEnabled" BOOLEAN NOT NULL DEFAULT false,
    "certificateTemplateId" TEXT,
    "coverImageUrl" TEXT,
    "ratingAvg" DOUBLE PRECISION,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Batch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BatchRating" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BatchRating_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BatchTrainer" (
    "batchId" TEXT NOT NULL,
    "trainerId" TEXT NOT NULL,

    CONSTRAINT "BatchTrainer_pkey" PRIMARY KEY ("batchId","trainerId")
);

-- CreateTable
CREATE TABLE "BatchEnrollment" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,

    CONSTRAINT "BatchEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "studioId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "SubscriptionKind" NOT NULL,
    "individualAudience" "IndividualAudience",
    "familyPack" "FamilyPack",
    "billingCadence" "BillingCadence" NOT NULL DEFAULT 'MONTHLY',
    "adultSeats" INTEGER NOT NULL,
    "kidSeats" INTEGER NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "purchaserUserId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "status" "MembershipStatus" NOT NULL,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MembershipCoveredStudent" (
    "id" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "seatRole" "MembershipSeatRole" NOT NULL,

    CONSTRAINT "MembershipCoveredStudent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "membershipId" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" "InvoiceStatus" NOT NULL,
    "paymentMethod" "PaymentMethod",
    "paidAt" TIMESTAMP(3),
    "platformFeePercent" DOUBLE PRECISION NOT NULL,
    "studioId" TEXT NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'SCHEDULED',

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attendance" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "status" "AttendanceStatus" NOT NULL,
    "markedById" TEXT NOT NULL,
    "source" "AttendanceSource" NOT NULL,

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "studioId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "type" "BookingType" NOT NULL,
    "batchId" TEXT,
    "sessionId" TEXT,
    "trainerId" TEXT,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'ACTIVE',
    "readAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "dedupeKey" TEXT,
    "deepLink" TEXT,
    "actorId" TEXT,
    "entityType" TEXT,
    "entityId" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationDelivery" (
    "id" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "status" "DeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "providerId" TEXT,
    "errorCode" TEXT,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "quietStartMinutes" INTEGER,
    "quietEndMinutes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushDevice" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT NOT NULL DEFAULT 'web',
    "appVersion" TEXT,
    "userAgent" TEXT,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PushDevice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutboxEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "OutboxEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Follow" (
    "followerId" TEXT NOT NULL,
    "followingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Follow_pkey" PRIMARY KEY ("followerId","followingId")
);

-- CreateTable
CREATE TABLE "FollowRequest" (
    "id" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "status" "FollowRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FollowRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Post" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "caption" TEXT,
    "imageUrls" TEXT[],
    "repostOfId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostLike" (
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostLike_pkey" PRIMARY KEY ("postId","userId")
);

-- CreateTable
CREATE TABLE "PostComment" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "type" "ConversationType" NOT NULL,
    "title" TEXT,
    "imageUrl" TEXT,
    "batchId" TEXT,
    "dmKey" TEXT,
    "encryptedKey" TEXT NOT NULL,
    "createdById" TEXT,
    "lastMessageAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationMember" (
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "ConversationRole" NOT NULL DEFAULT 'MEMBER',
    "lastReadAt" TIMESTAMP(3),
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversationMember_pkey" PRIMARY KEY ("conversationId","userId")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "clientMessageId" TEXT,
    "type" "MessageType" NOT NULL,
    "ciphertext" TEXT,
    "iv" TEXT,
    "imageUrls" TEXT[],
    "audioUrl" TEXT,
    "audioDuration" INTEGER,
    "replyToId" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageReaction" (
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageReaction_pkey" PRIMARY KEY ("messageId","userId","emoji")
);

-- CreateTable
CREATE TABLE "Poll" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "multiSelect" BOOLEAN NOT NULL DEFAULT false,
    "closesAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Poll_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PollOption" (
    "id" TEXT NOT NULL,
    "pollId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "PollOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PollVote" (
    "optionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PollVote_pkey" PRIMARY KEY ("optionId","userId")
);

-- CreateTable
CREATE TABLE "ChatEvent" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "locationLabel" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatEventRsvp" (
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "EventRsvpStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatEventRsvp_pkey" PRIMARY KEY ("eventId","userId")
);

-- CreateTable
CREATE TABLE "Contest" (
    "id" TEXT NOT NULL,
    "studioId" TEXT NOT NULL,
    "branchId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "registrationOpensAt" TIMESTAMP(3),
    "registrationClosesAt" TIMESTAMP(3),
    "status" "ContestStatus" NOT NULL DEFAULT 'DRAFT',
    "creatorId" TEXT NOT NULL,
    "certificationEnabled" BOOLEAN NOT NULL DEFAULT false,
    "certificateTemplateId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContestCategory" (
    "id" TEXT NOT NULL,
    "contestId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "danceStyle" TEXT NOT NULL,
    "ageMin" INTEGER NOT NULL,
    "ageMax" INTEGER NOT NULL,
    "entryType" "ContestEntryType" NOT NULL,
    "maxEntries" INTEGER,
    "maxGroupSize" INTEGER,
    "certificateTemplateId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContestCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContestJudge" (
    "categoryId" TEXT NOT NULL,
    "judgeId" TEXT NOT NULL,

    CONSTRAINT "ContestJudge_pkey" PRIMARY KEY ("categoryId","judgeId")
);

-- CreateTable
CREATE TABLE "ContestEntry" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "teamName" TEXT,
    "status" "ContestEntryStatus" NOT NULL DEFAULT 'CONFIRMED',
    "registeredById" TEXT NOT NULL,
    "placement" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContestEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContestScore" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "judgeId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContestScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContestEntryMember" (
    "entryId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,

    CONSTRAINT "ContestEntryMember_pkey" PRIMARY KEY ("entryId","studentId")
);

-- CreateTable
CREATE TABLE "ContestCertificate" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "certificateNumber" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "issuedById" TEXT NOT NULL,
    "layoutSnapshot" JSONB NOT NULL,

    CONSTRAINT "ContestCertificate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentGoal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "studioId" TEXT NOT NULL,
    "type" "StudentGoalType" NOT NULL DEFAULT 'MONTHLY_SESSIONS',
    "target" INTEGER NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentGoal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Achievement" (
    "id" TEXT NOT NULL,
    "studioId" TEXT,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "criteria" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Achievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentAchievement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "achievementId" TEXT NOT NULL,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "meta" JSONB,

    CONSTRAINT "StudentAchievement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_firebaseUid_key" ON "User"("firebaseUid");

-- CreateIndex
CREATE INDEX "User_studioId_emailHash_idx" ON "User"("studioId", "emailHash");

-- CreateIndex
CREATE INDEX "User_preferredBranchId_idx" ON "User"("preferredBranchId");

-- CreateIndex
CREATE UNIQUE INDEX "ParentChild_parentUserId_childUserId_key" ON "ParentChild"("parentUserId", "childUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Studio_ownerId_key" ON "Studio"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "StudioBranch_coverMediaId_key" ON "StudioBranch"("coverMediaId");

-- CreateIndex
CREATE INDEX "StudioBranch_studioId_idx" ON "StudioBranch"("studioId");

-- CreateIndex
CREATE INDEX "BranchMedia_branchId_sortOrder_idx" ON "BranchMedia"("branchId", "sortOrder");

-- CreateIndex
CREATE INDEX "BranchMedia_branchId_archivedAt_idx" ON "BranchMedia"("branchId", "archivedAt");

-- CreateIndex
CREATE INDEX "BranchFaq_branchId_sortOrder_idx" ON "BranchFaq"("branchId", "sortOrder");

-- CreateIndex
CREATE INDEX "BranchTestimonial_branchId_sortOrder_idx" ON "BranchTestimonial"("branchId", "sortOrder");

-- CreateIndex
CREATE INDEX "CertificateTemplate_studioId_idx" ON "CertificateTemplate"("studioId");

-- CreateIndex
CREATE INDEX "BatchRating_batchId_idx" ON "BatchRating"("batchId");

-- CreateIndex
CREATE INDEX "BatchRating_studentId_idx" ON "BatchRating"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "BatchRating_batchId_studentId_key" ON "BatchRating"("batchId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "BatchEnrollment_batchId_studentId_key" ON "BatchEnrollment"("batchId", "studentId");

-- CreateIndex
CREATE INDEX "Membership_purchaserUserId_idx" ON "Membership"("purchaserUserId");

-- CreateIndex
CREATE INDEX "Membership_subscriptionId_status_idx" ON "Membership"("subscriptionId", "status");

-- CreateIndex
CREATE INDEX "MembershipCoveredStudent_studentId_idx" ON "MembershipCoveredStudent"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "MembershipCoveredStudent_membershipId_studentId_key" ON "MembershipCoveredStudent"("membershipId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_sessionId_studentId_key" ON "Attendance"("sessionId", "studentId");

-- CreateIndex
CREATE INDEX "Booking_batchId_idx" ON "Booking"("batchId");

-- CreateIndex
CREATE INDEX "Notification_userId_status_createdAt_idx" ON "Notification"("userId", "status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_status_idx" ON "Notification"("userId", "readAt", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_userId_dedupeKey_key" ON "Notification"("userId", "dedupeKey");

-- CreateIndex
CREATE INDEX "NotificationDelivery_notificationId_channel_idx" ON "NotificationDelivery"("notificationId", "channel");

-- CreateIndex
CREATE INDEX "NotificationDelivery_status_updatedAt_idx" ON "NotificationDelivery"("status", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_userId_type_channel_key" ON "NotificationPreference"("userId", "type", "channel");

-- CreateIndex
CREATE UNIQUE INDEX "PushDevice_token_key" ON "PushDevice"("token");

-- CreateIndex
CREATE INDEX "PushDevice_userId_idx" ON "PushDevice"("userId");

-- CreateIndex
CREATE INDEX "OutboxEvent_publishedAt_createdAt_idx" ON "OutboxEvent"("publishedAt", "createdAt");

-- CreateIndex
CREATE INDEX "Follow_followingId_idx" ON "Follow"("followingId");

-- CreateIndex
CREATE INDEX "FollowRequest_targetId_status_idx" ON "FollowRequest"("targetId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "FollowRequest_requesterId_targetId_key" ON "FollowRequest"("requesterId", "targetId");

-- CreateIndex
CREATE INDEX "Post_authorId_createdAt_idx" ON "Post"("authorId", "createdAt");

-- CreateIndex
CREATE INDEX "Post_repostOfId_idx" ON "Post"("repostOfId");

-- CreateIndex
CREATE INDEX "PostLike_userId_idx" ON "PostLike"("userId");

-- CreateIndex
CREATE INDEX "PostComment_postId_createdAt_idx" ON "PostComment"("postId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_batchId_key" ON "Conversation"("batchId");

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_dmKey_key" ON "Conversation"("dmKey");

-- CreateIndex
CREATE INDEX "Conversation_lastMessageAt_idx" ON "Conversation"("lastMessageAt");

-- CreateIndex
CREATE INDEX "ConversationMember_userId_idx" ON "ConversationMember"("userId");

-- CreateIndex
CREATE INDEX "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Message_conversationId_senderId_clientMessageId_key" ON "Message"("conversationId", "senderId", "clientMessageId");

-- CreateIndex
CREATE INDEX "MessageReaction_userId_idx" ON "MessageReaction"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Poll_messageId_key" ON "Poll"("messageId");

-- CreateIndex
CREATE INDEX "PollOption_pollId_idx" ON "PollOption"("pollId");

-- CreateIndex
CREATE INDEX "PollVote_userId_idx" ON "PollVote"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ChatEvent_messageId_key" ON "ChatEvent"("messageId");

-- CreateIndex
CREATE INDEX "Contest_studioId_status_idx" ON "Contest"("studioId", "status");

-- CreateIndex
CREATE INDEX "Contest_studioId_startsAt_idx" ON "Contest"("studioId", "startsAt");

-- CreateIndex
CREATE INDEX "ContestCategory_contestId_idx" ON "ContestCategory"("contestId");

-- CreateIndex
CREATE INDEX "ContestEntry_categoryId_status_idx" ON "ContestEntry"("categoryId", "status");

-- CreateIndex
CREATE INDEX "ContestScore_judgeId_idx" ON "ContestScore"("judgeId");

-- CreateIndex
CREATE INDEX "ContestScore_entryId_idx" ON "ContestScore"("entryId");

-- CreateIndex
CREATE UNIQUE INDEX "ContestScore_entryId_judgeId_key" ON "ContestScore"("entryId", "judgeId");

-- CreateIndex
CREATE INDEX "ContestEntryMember_studentId_idx" ON "ContestEntryMember"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "ContestCertificate_entryId_key" ON "ContestCertificate"("entryId");

-- CreateIndex
CREATE INDEX "ContestCertificate_certificateNumber_idx" ON "ContestCertificate"("certificateNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ContestCertificate_certificateNumber_key" ON "ContestCertificate"("certificateNumber");

-- CreateIndex
CREATE INDEX "StudentGoal_userId_studioId_periodStart_idx" ON "StudentGoal"("userId", "studioId", "periodStart");

-- CreateIndex
CREATE INDEX "StudentGoal_studioId_idx" ON "StudentGoal"("studioId");

-- CreateIndex
CREATE UNIQUE INDEX "Achievement_code_key" ON "Achievement"("code");

-- CreateIndex
CREATE INDEX "Achievement_studioId_active_idx" ON "Achievement"("studioId", "active");

-- CreateIndex
CREATE INDEX "StudentAchievement_userId_idx" ON "StudentAchievement"("userId");

-- CreateIndex
CREATE INDEX "StudentAchievement_achievementId_idx" ON "StudentAchievement"("achievementId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentAchievement_userId_achievementId_key" ON "StudentAchievement"("userId", "achievementId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_preferredBranchId_fkey" FOREIGN KEY ("preferredBranchId") REFERENCES "StudioBranch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParentChild" ADD CONSTRAINT "ParentChild_parentUserId_fkey" FOREIGN KEY ("parentUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParentChild" ADD CONSTRAINT "ParentChild_childUserId_fkey" FOREIGN KEY ("childUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Studio" ADD CONSTRAINT "Studio_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioSettings" ADD CONSTRAINT "StudioSettings_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioBranch" ADD CONSTRAINT "StudioBranch_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioBranch" ADD CONSTRAINT "StudioBranch_coverMediaId_fkey" FOREIGN KEY ("coverMediaId") REFERENCES "BranchMedia"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BranchMedia" ADD CONSTRAINT "BranchMedia_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "StudioBranch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BranchFaq" ADD CONSTRAINT "BranchFaq_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "StudioBranch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BranchTestimonial" ADD CONSTRAINT "BranchTestimonial_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "StudioBranch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CertificateTemplate" ADD CONSTRAINT "CertificateTemplate_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Batch" ADD CONSTRAINT "Batch_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Batch" ADD CONSTRAINT "Batch_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "StudioBranch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Batch" ADD CONSTRAINT "Batch_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Batch" ADD CONSTRAINT "Batch_certificateTemplateId_fkey" FOREIGN KEY ("certificateTemplateId") REFERENCES "CertificateTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatchRating" ADD CONSTRAINT "BatchRating_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatchRating" ADD CONSTRAINT "BatchRating_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatchTrainer" ADD CONSTRAINT "BatchTrainer_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatchTrainer" ADD CONSTRAINT "BatchTrainer_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatchEnrollment" ADD CONSTRAINT "BatchEnrollment_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatchEnrollment" ADD CONSTRAINT "BatchEnrollment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_purchaserUserId_fkey" FOREIGN KEY ("purchaserUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipCoveredStudent" ADD CONSTRAINT "MembershipCoveredStudent_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipCoveredStudent" ADD CONSTRAINT "MembershipCoveredStudent_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_markedById_fkey" FOREIGN KEY ("markedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationDelivery" ADD CONSTRAINT "NotificationDelivery_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushDevice" ADD CONSTRAINT "PushDevice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowRequest" ADD CONSTRAINT "FollowRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowRequest" ADD CONSTRAINT "FollowRequest_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_repostOfId_fkey" FOREIGN KEY ("repostOfId") REFERENCES "Post"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostLike" ADD CONSTRAINT "PostLike_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostLike" ADD CONSTRAINT "PostLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostComment" ADD CONSTRAINT "PostComment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostComment" ADD CONSTRAINT "PostComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationMember" ADD CONSTRAINT "ConversationMember_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationMember" ADD CONSTRAINT "ConversationMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageReaction" ADD CONSTRAINT "MessageReaction_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageReaction" ADD CONSTRAINT "MessageReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Poll" ADD CONSTRAINT "Poll_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PollOption" ADD CONSTRAINT "PollOption_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "Poll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PollVote" ADD CONSTRAINT "PollVote_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "PollOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PollVote" ADD CONSTRAINT "PollVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatEvent" ADD CONSTRAINT "ChatEvent_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatEventRsvp" ADD CONSTRAINT "ChatEventRsvp_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "ChatEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatEventRsvp" ADD CONSTRAINT "ChatEventRsvp_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contest" ADD CONSTRAINT "Contest_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contest" ADD CONSTRAINT "Contest_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "StudioBranch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contest" ADD CONSTRAINT "Contest_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contest" ADD CONSTRAINT "Contest_certificateTemplateId_fkey" FOREIGN KEY ("certificateTemplateId") REFERENCES "CertificateTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestCategory" ADD CONSTRAINT "ContestCategory_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "Contest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestCategory" ADD CONSTRAINT "ContestCategory_certificateTemplateId_fkey" FOREIGN KEY ("certificateTemplateId") REFERENCES "CertificateTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestJudge" ADD CONSTRAINT "ContestJudge_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ContestCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestJudge" ADD CONSTRAINT "ContestJudge_judgeId_fkey" FOREIGN KEY ("judgeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestEntry" ADD CONSTRAINT "ContestEntry_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ContestCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestEntry" ADD CONSTRAINT "ContestEntry_registeredById_fkey" FOREIGN KEY ("registeredById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestScore" ADD CONSTRAINT "ContestScore_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "ContestEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestScore" ADD CONSTRAINT "ContestScore_judgeId_fkey" FOREIGN KEY ("judgeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestEntryMember" ADD CONSTRAINT "ContestEntryMember_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "ContestEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestEntryMember" ADD CONSTRAINT "ContestEntryMember_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestCertificate" ADD CONSTRAINT "ContestCertificate_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "ContestEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestCertificate" ADD CONSTRAINT "ContestCertificate_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "CertificateTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestCertificate" ADD CONSTRAINT "ContestCertificate_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentGoal" ADD CONSTRAINT "StudentGoal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentGoal" ADD CONSTRAINT "StudentGoal_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Achievement" ADD CONSTRAINT "Achievement_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentAchievement" ADD CONSTRAINT "StudentAchievement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentAchievement" ADD CONSTRAINT "StudentAchievement_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES "Achievement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
