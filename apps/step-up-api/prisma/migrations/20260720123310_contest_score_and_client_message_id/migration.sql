-- DropIndex
DROP INDEX "Batch_planId_idx";

-- AlterTable
ALTER TABLE "ChatEventRsvp" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Conversation" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "FollowRequest" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Post" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "StudioBranch" ALTER COLUMN "photos" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;
