-- CreateTable
CREATE TABLE "LeadRemark" (
    "id" TEXT NOT NULL,
    "studioId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadRemark_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LeadRemark_studioId_studentId_createdAt_idx" ON "LeadRemark"("studioId", "studentId", "createdAt");

-- AddForeignKey
ALTER TABLE "LeadRemark" ADD CONSTRAINT "LeadRemark_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadRemark" ADD CONSTRAINT "LeadRemark_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadRemark" ADD CONSTRAINT "LeadRemark_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
