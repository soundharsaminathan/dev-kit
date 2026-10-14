import { NotFoundException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FEATURE_CATALOG } from "./feature-keys";
import { StudioFeaturesService } from "./studio-features.service";

const STUDIO_A = "studio-a";
const STUDIO_B = "studio-b";

function catalogRows() {
  return FEATURE_CATALOG.map((feature, index) => ({
    id: `feat-${index}`,
    key: feature.key,
    name: feature.name,
    description: feature.description,
    category: feature.category,
    globallyEnabled: true,
    dependsOnKeys: [] as string[],
    createdAt: new Date(),
    updatedAt: new Date(),
  }));
}

describe("StudioFeaturesService", () => {
  const prisma = {
    feature: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
    },
    studioFeature: {
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
    studio: {
      findUnique: vi.fn(),
    },
  };

  let service: StudioFeaturesService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new StudioFeaturesService(prisma as never);
    prisma.feature.findMany.mockResolvedValue(catalogRows());
  });

  it("isEnabled is fail-closed when the StudioFeature row is missing", async () => {
    prisma.studioFeature.findMany.mockResolvedValue([]);
    await expect(service.isEnabled(STUDIO_A, "bookings")).resolves.toBe(false);
  });

  it("isEnabled returns false for unknown keys", async () => {
    prisma.studioFeature.findMany.mockResolvedValue([]);
    await expect(service.isEnabled(STUDIO_A, "not_a_feature")).resolves.toBe(
      false,
    );
  });

  it("isEnabled respects StudioFeature.enabled and globallyEnabled", async () => {
    const catalog = catalogRows();
    const bookings = catalog.find((row) => row.key === "bookings")!;
    prisma.studioFeature.findMany.mockResolvedValue([
      {
        enabled: true,
        feature: { key: "bookings", globallyEnabled: true },
      },
    ]);
    await expect(service.isEnabled(STUDIO_A, "bookings")).resolves.toBe(true);

    prisma.studioFeature.findMany.mockResolvedValue([
      {
        enabled: false,
        feature: { key: "bookings", globallyEnabled: true },
      },
    ]);
    // Clear request cache by not passing request; service caches catalog only.
    const service2 = new StudioFeaturesService(prisma as never);
    prisma.feature.findMany.mockResolvedValue(catalog);
    await expect(service2.isEnabled(STUDIO_A, "bookings")).resolves.toBe(false);

    prisma.studioFeature.findMany.mockResolvedValue([
      {
        enabled: true,
        feature: { key: "bookings", globallyEnabled: false },
      },
    ]);
    const service3 = new StudioFeaturesService(prisma as never);
    prisma.feature.findMany.mockResolvedValue([
      { ...bookings, globallyEnabled: false },
    ]);
    await expect(service3.isEnabled(STUDIO_A, "bookings")).resolves.toBe(false);
  });

  it("reuses the enabled map on the same request object", async () => {
    prisma.studioFeature.findMany.mockResolvedValue([
      {
        enabled: true,
        feature: { key: "bookings", globallyEnabled: true },
      },
    ]);
    const request: {
      studioFeatureMaps?: Map<string, Map<string, boolean>>;
    } = {};
    await service.isEnabled(STUDIO_A, "bookings", request);
    await service.isEnabled(STUDIO_A, "chat", request);
    expect(prisma.studioFeature.findMany).toHaveBeenCalledTimes(1);
  });

  it("isolates feature maps per studio", async () => {
    prisma.studioFeature.findMany
      .mockResolvedValueOnce([
        {
          enabled: true,
          feature: { key: "bookings", globallyEnabled: true },
        },
      ])
      .mockResolvedValueOnce([
        {
          enabled: false,
          feature: { key: "bookings", globallyEnabled: true },
        },
      ]);
    await expect(service.isEnabled(STUDIO_A, "bookings")).resolves.toBe(true);
    await expect(service.isEnabled(STUDIO_B, "bookings")).resolves.toBe(false);
  });

  it("setEnabled upserts and returns the updated feature", async () => {
    const catalog = catalogRows();
    const bookings = catalog.find((row) => row.key === "bookings")!;
    prisma.feature.findUnique.mockResolvedValue(bookings);
    prisma.studio.findUnique.mockResolvedValue({ id: STUDIO_A });
    prisma.studioFeature.upsert.mockResolvedValue({});

    const result = await service.setEnabled(STUDIO_A, "bookings", false);
    expect(result.enabled).toBe(false);
    expect(prisma.studioFeature.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          studioId_featureId: {
            studioId: STUDIO_A,
            featureId: bookings.id,
          },
        },
        update: { enabled: false },
        create: {
          studioId: STUDIO_A,
          featureId: bookings.id,
          enabled: false,
        },
      }),
    );
  });

  it("setEnabled throws for unknown keys", async () => {
    await expect(
      service.setEnabled(STUDIO_A, "nope", true),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("getForStudio merges catalog with studio rows", async () => {
    prisma.studioFeature.findMany.mockResolvedValue([
      {
        enabled: true,
        feature: { key: "bookings", globallyEnabled: true },
      },
      {
        enabled: false,
        feature: { key: "chat", globallyEnabled: true },
      },
    ]);
    const features = await service.getForStudio(STUDIO_A);
    expect(features.find((f) => f.key === "bookings")?.enabled).toBe(true);
    expect(features.find((f) => f.key === "chat")?.enabled).toBe(false);
    expect(features.find((f) => f.key === "feed")?.enabled).toBe(false);
  });
});
