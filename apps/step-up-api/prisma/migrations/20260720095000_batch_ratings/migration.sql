CREATE TABLE "BatchRating" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BatchRating_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BatchRating_batchId_studentId_key" ON "BatchRating"("batchId", "studentId");
CREATE INDEX "BatchRating_batchId_idx" ON "BatchRating"("batchId");
CREATE INDEX "BatchRating_studentId_idx" ON "BatchRating"("studentId");

ALTER TABLE "BatchRating" ADD CONSTRAINT "BatchRating_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BatchRating" ADD CONSTRAINT "BatchRating_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
