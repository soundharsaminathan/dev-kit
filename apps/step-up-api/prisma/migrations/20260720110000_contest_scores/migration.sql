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

-- CreateIndex
CREATE INDEX "ContestScore_judgeId_idx" ON "ContestScore"("judgeId");

-- CreateIndex
CREATE INDEX "ContestScore_entryId_idx" ON "ContestScore"("entryId");

-- CreateIndex
CREATE UNIQUE INDEX "ContestScore_entryId_judgeId_key" ON "ContestScore"("entryId", "judgeId");

-- AddForeignKey
ALTER TABLE "ContestScore" ADD CONSTRAINT "ContestScore_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "ContestEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestScore" ADD CONSTRAINT "ContestScore_judgeId_fkey" FOREIGN KEY ("judgeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
