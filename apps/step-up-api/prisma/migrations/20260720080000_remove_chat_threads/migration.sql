-- Promote thread replies into the main conversation timeline, then drop threads.

UPDATE "Message" SET "threadId" = NULL WHERE "threadId" IS NOT NULL;

ALTER TABLE "Message" DROP CONSTRAINT IF EXISTS "Message_threadId_fkey";

DROP TABLE IF EXISTS "Thread";

DROP INDEX IF EXISTS "Message_conversationId_threadId_createdAt_idx";

ALTER TABLE "Message" DROP COLUMN IF EXISTS "threadId";

CREATE INDEX "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");
