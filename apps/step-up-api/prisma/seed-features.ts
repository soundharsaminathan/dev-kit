import type { PrismaClient } from "@prisma/client";
import { FEATURE_CATALOG } from "../src/studio-features/feature-keys";

/** Upsert the global feature catalog (idempotent). */
export async function seedFeatureCatalog(prisma: PrismaClient) {
  for (const feature of FEATURE_CATALOG) {
    await prisma.feature.upsert({
      where: { key: feature.key },
      update: {
        name: feature.name,
        description: feature.description,
        category: feature.category,
      },
      create: {
        key: feature.key,
        name: feature.name,
        description: feature.description,
        category: feature.category,
        globallyEnabled: true,
        dependsOnKeys: [],
      },
    });
  }
}

/** Ensure a studio has an explicit StudioFeature row for every catalog feature. */
export async function ensureStudioFeaturesEnabled(
  prisma: PrismaClient,
  studioId: string,
  enabled = true,
) {
  const features = await prisma.feature.findMany({ select: { id: true } });
  for (const feature of features) {
    await prisma.studioFeature.upsert({
      where: {
        studioId_featureId: { studioId, featureId: feature.id },
      },
      update: { enabled },
      create: {
        studioId,
        featureId: feature.id,
        enabled,
      },
    });
  }
}
