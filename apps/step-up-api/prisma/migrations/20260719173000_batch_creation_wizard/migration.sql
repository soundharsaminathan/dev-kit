ALTER TABLE "Batch"
ADD COLUMN "location" TEXT NOT NULL DEFAULT '',
ADD COLUMN "danceCategories" JSONB NOT NULL DEFAULT '[]';

CREATE TABLE "BatchTrainer" (
    "batchId" TEXT NOT NULL,
    "trainerId" TEXT NOT NULL,
    CONSTRAINT "BatchTrainer_pkey" PRIMARY KEY ("batchId", "trainerId")
);

ALTER TABLE "BatchTrainer"
ADD CONSTRAINT "BatchTrainer_batchId_fkey"
FOREIGN KEY ("batchId") REFERENCES "Batch"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BatchTrainer"
ADD CONSTRAINT "BatchTrainer_trainerId_fkey"
FOREIGN KEY ("trainerId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
