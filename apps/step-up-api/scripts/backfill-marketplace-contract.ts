import "dotenv/config";
import { UserRole } from "../src/generated/prisma/client";
import { createScriptPrismaClient } from "../prisma/script-db";
import { batchSlugFromName } from "../src/discover/marketplace.contract";
import {
  backfillClassAudience,
  marketplaceCategoryFromStyles,
  studioMarketplaceCategories,
  trainerMarketplaceCategories,
} from "../src/discover/marketplace.backfill";

async function main() {
  const prisma = createScriptPrismaClient();
  const studios = await prisma.studio.findMany({
    select: {
      id: true,
      batches: {
        select: {
          id: true,
          name: true,
          category: true,
          danceCategories: true,
          slug: true,
        },
      },
    },
  });

  for (const studio of studios) {
    const { categories, primary } = studioMarketplaceCategories(
      studio.batches.map((batch) => batch.danceCategories),
    );
    await prisma.studio.update({
      where: { id: studio.id },
      data: { primaryCategory: primary },
    });
    await prisma.studioMarketplaceCategory.deleteMany({
      where: { studioId: studio.id },
    });
    if (categories.length > 0) {
      await prisma.studioMarketplaceCategory.createMany({
        data: categories.map((category) => ({
          studioId: studio.id,
          category,
        })),
      });
    }

    for (const batch of studio.batches) {
      await prisma.batch.update({
        where: { id: batch.id },
        data: {
          marketplaceCategory: marketplaceCategoryFromStyles(
            batch.danceCategories,
          ),
          classAudience: backfillClassAudience(batch.category),
          slug: batch.slug ?? batchSlugFromName(batch.name, batch.id),
        },
      });
    }
  }

  const trainers = await prisma.user.findMany({
    where: { role: UserRole.TRAINER },
    select: {
      id: true,
      studioId: true,
      styles: true,
      trainedBatches: {
        select: { batch: { select: { danceCategories: true } } },
      },
    },
  });

  for (const trainer of trainers) {
    const categories = trainerMarketplaceCategories({
      styles: trainer.styles,
      batchDanceCategories: trainer.trainedBatches.map(
        (link) => link.batch.danceCategories,
      ),
    });
    await prisma.trainerMarketplaceCategory.deleteMany({
      where: { trainerId: trainer.id },
    });
    await prisma.trainerMarketplaceCategory.createMany({
      data: categories.map((category) => ({
        trainerId: trainer.id,
        category,
      })),
    });
  }

  await prisma.$disconnect();
}

void main();
