ALTER TABLE "Batch" ADD COLUMN "planId" TEXT;

UPDATE "Batch" b
SET "planId" = p."id"
FROM "Plan" p
WHERE p."batchId" = b."id";

ALTER TABLE "Plan" DROP CONSTRAINT "Plan_batchId_fkey";

ALTER TABLE "Plan" DROP COLUMN "batchId";

ALTER TABLE "Batch"
ADD CONSTRAINT "Batch_planId_fkey"
FOREIGN KEY ("planId") REFERENCES "Plan"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Batch_planId_idx" ON "Batch"("planId");
