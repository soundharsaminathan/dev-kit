import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { Feature } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import {
  type FeatureKey,
  FEATURE_CATALOG,
  isFeatureKey,
} from "./feature-keys";

export type StudioFeatureDto = {
  key: string;
  name: string;
  description: string;
  category: string;
  enabled: boolean;
  globallyEnabled: boolean;
  dependsOnKeys: string[];
};

type StudioFeatureRequest = {
  studioFeatureMaps?: Map<string, Map<string, boolean>>;
};

@Injectable()
export class StudioFeaturesService {
  private catalog: Feature[] | null = null;

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getCatalog(forceRefresh = false): Promise<Feature[]> {
    if (this.catalog && !forceRefresh) {
      return this.catalog;
    }
    const rows = await this.prisma.feature.findMany({
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });
    this.catalog = rows.length > 0 ? rows : null;
    return rows;
  }

  /** Fail-closed map: key → enabled for this studio. Unknown keys absent = false. */
  async getEnabledMap(
    studioId: string,
    request?: StudioFeatureRequest,
  ): Promise<Map<string, boolean>> {
    const cached = request?.studioFeatureMaps?.get(studioId);
    if (cached) {
      return cached;
    }

    const catalog = await this.getCatalog();
    const rows = await this.prisma.studioFeature.findMany({
      where: { studioId },
      select: {
        enabled: true,
        feature: {
          select: {
            key: true,
            globallyEnabled: true,
          },
        },
      },
    });

    const byKey = new Map(
      rows.map((row) => [
        row.feature.key,
        row.feature.globallyEnabled && row.enabled,
      ]),
    );

    const map = new Map<string, boolean>();
    for (const feature of catalog) {
      map.set(feature.key, byKey.get(feature.key) === true);
    }

    if (request) {
      if (!request.studioFeatureMaps) {
        request.studioFeatureMaps = new Map();
      }
      request.studioFeatureMaps.set(studioId, map);
    }

    return map;
  }

  async isEnabled(
    studioId: string,
    key: string,
    request?: StudioFeatureRequest,
  ): Promise<boolean> {
    if (!isFeatureKey(key)) {
      return false;
    }
    const map = await this.getEnabledMap(studioId, request);
    return map.get(key) === true;
  }

  async getForStudio(studioId: string): Promise<StudioFeatureDto[]> {
    const catalog = await this.getCatalog();
    const map = await this.getEnabledMap(studioId);
    return catalog.map((feature) => ({
      key: feature.key,
      name: feature.name,
      description: feature.description,
      category: feature.category,
      enabled: map.get(feature.key) === true,
      globallyEnabled: feature.globallyEnabled,
      dependsOnKeys: feature.dependsOnKeys,
    }));
  }

  async setEnabled(
    studioId: string,
    key: string,
    enabled: boolean,
  ): Promise<StudioFeatureDto> {
    if (!isFeatureKey(key)) {
      throw new NotFoundException(`Unknown feature: ${key}`);
    }

    const feature = await this.prisma.feature.findUnique({
      where: { key },
    });
    if (!feature) {
      throw new NotFoundException(`Unknown feature: ${key}`);
    }

    const studio = await this.prisma.studio.findUnique({
      where: { id: studioId },
      select: { id: true },
    });
    if (!studio) {
      throw new NotFoundException("Studio not found");
    }

    await this.prisma.studioFeature.upsert({
      where: {
        studioId_featureId: {
          studioId,
          featureId: feature.id,
        },
      },
      update: { enabled },
      create: {
        studioId,
        featureId: feature.id,
        enabled,
      },
    });

    return {
      key: feature.key,
      name: feature.name,
      description: feature.description,
      category: feature.category,
      enabled: feature.globallyEnabled && enabled,
      globallyEnabled: feature.globallyEnabled,
      dependsOnKeys: feature.dependsOnKeys,
    };
  }

  /** Ensure catalog exists (for createStudio / tests when migration seed already ran). */
  async ensureCatalogSeeded() {
    const count = await this.prisma.feature.count();
    if (count > 0) {
      return;
    }
    for (const feature of FEATURE_CATALOG) {
      await this.prisma.feature.create({
        data: {
          key: feature.key,
          name: feature.name,
          description: feature.description,
          category: feature.category,
          globallyEnabled: true,
          dependsOnKeys: [],
        },
      });
    }
    this.catalog = null;
  }
}

export function assertFeatureAccess(
  enabled: boolean,
  message = "This feature is not available for this studio",
): asserts enabled is true {
  if (!enabled) {
    throw new ForbiddenException(message);
  }
}

export function requireKnownFeatureKey(key: string): FeatureKey {
  if (!isFeatureKey(key)) {
    throw new BadRequestException(`Unknown feature: ${key}`);
  }
  return key;
}
