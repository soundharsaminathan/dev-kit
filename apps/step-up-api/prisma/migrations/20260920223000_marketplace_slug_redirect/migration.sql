-- F4: persist old marketplace slugs so rename 301s instead of 404.

CREATE TYPE "MarketplaceSlugKind" AS ENUM ('CLASS', 'STUDIO', 'TRAINER');

CREATE TABLE "SlugRedirect" (
  "id" TEXT NOT NULL,
  "kind" "MarketplaceSlugKind" NOT NULL,
  "fromSlug" TEXT NOT NULL,
  "toSlug" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SlugRedirect_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SlugRedirect_kind_fromSlug_key"
  ON "SlugRedirect" ("kind", "fromSlug");
CREATE INDEX "SlugRedirect_kind_toSlug_idx"
  ON "SlugRedirect" ("kind", "toSlug");
