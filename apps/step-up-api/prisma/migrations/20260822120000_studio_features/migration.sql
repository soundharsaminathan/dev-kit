-- CreateTable
CREATE TABLE "Feature" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "globallyEnabled" BOOLEAN NOT NULL DEFAULT true,
    "dependsOnKeys" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Feature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudioFeature" (
    "studioId" TEXT NOT NULL,
    "featureId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudioFeature_pkey" PRIMARY KEY ("studioId","featureId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Feature_key_key" ON "Feature"("key");

-- CreateIndex
CREATE INDEX "StudioFeature_studioId_idx" ON "StudioFeature"("studioId");

-- AddForeignKey
ALTER TABLE "StudioFeature" ADD CONSTRAINT "StudioFeature_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioFeature" ADD CONSTRAINT "StudioFeature_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "Feature"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed catalog (fixed ids for deterministic migrations)
INSERT INTO "Feature" ("id", "key", "name", "description", "category", "globallyEnabled", "dependsOnKeys", "createdAt", "updatedAt")
VALUES
  ('feat_chat', 'chat', 'Chat', 'Studio messaging and conversations.', 'Communication', true, ARRAY[]::TEXT[], CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat_feed', 'feed', 'Feed', 'Social feed posts and comments.', 'Communication', true, ARRAY[]::TEXT[], CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat_payments', 'payments', 'Payments', 'Online payments dashboard and Razorpay checkout.', 'Finance', true, ARRAY[]::TEXT[], CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat_expenses', 'expenses', 'Expenses', 'Studio expense tracking and reports.', 'Finance', true, ARRAY[]::TEXT[], CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat_payouts', 'payouts', 'Payouts', 'Trainer payout management.', 'Finance', true, ARRAY[]::TEXT[], CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat_contests', 'contests', 'Contests', 'Studio contests and entries.', 'Engagement', true, ARRAY[]::TEXT[], CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat_bookings', 'bookings', 'Bookings', 'Trial and class bookings.', 'Operations', true, ARRAY[]::TEXT[], CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat_data_import', 'data_import', 'Data Import', 'Bulk CSV import of studio data.', 'Operations', true, ARRAY[]::TEXT[], CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('feat_ai_agent', 'ai_agent', 'AI agent', 'Staff AI assistant in the studio app.', 'Operations', true, ARRAY[]::TEXT[], CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Backfill: every existing studio gets all features enabled
INSERT INTO "StudioFeature" ("studioId", "featureId", "enabled", "createdAt", "updatedAt")
SELECT s."id", f."id", true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Studio" s
CROSS JOIN "Feature" f;
