-- CreateTable
CREATE TABLE "BatchPlan" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,

    CONSTRAINT "BatchPlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BatchPlan_batchId_idx" ON "BatchPlan"("batchId");

-- CreateIndex
CREATE INDEX "BatchPlan_subscriptionId_idx" ON "BatchPlan"("subscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "BatchPlan_batchId_subscriptionId_key" ON "BatchPlan"("batchId", "subscriptionId");

-- AddForeignKey
ALTER TABLE "BatchPlan" ADD CONSTRAINT "BatchPlan_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatchPlan" ADD CONSTRAINT "BatchPlan_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
