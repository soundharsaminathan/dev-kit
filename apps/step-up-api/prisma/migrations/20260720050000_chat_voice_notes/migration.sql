-- AlterEnum
ALTER TYPE "MessageType" ADD VALUE 'AUDIO';

-- AlterTable
ALTER TABLE "Message" ADD COLUMN "audioUrl" TEXT;
ALTER TABLE "Message" ADD COLUMN "audioDuration" INTEGER;
