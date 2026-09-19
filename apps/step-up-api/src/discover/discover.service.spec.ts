import { NotFoundException } from "@nestjs/common";
import { BillingCadence } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DiscoverService } from "./discover.service";

describe("DiscoverService", () => {
  const prisma = {
    studio: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    session: {
      findMany: vi.fn(),
    },
    user: {
      count: vi.fn(),
    },
  };
  const media = {
    signReadUrl: vi.fn(async (url: string | null) =>
      url ? `signed:${url}` : null,
    ),
  };

  let service: DiscoverService;

  const studioFixture = {
    id: "studio-1",
    slug: "rhythm-house",
    name: "Rhythm House",
    address: "T Nagar, Chennai",
    contact: "044-0000",
    logoUrl: "logos/rh.png",
    heroMobileUrl: null,
    heroDesktopUrl: "heroes/rh.png",
    photos: [],
    branches: [
      {
        address: "T Nagar, Chennai",
        latitude: 13.04,
        longitude: 80.24,
        coverMedia: null,
        media: [],
      },
    ],
    batches: [
      {
        id: "batch-1",
        name: "Bharatanatyam Kids",
        category: "KIDS" as const,
        danceCategories: [{ name: "Bharatanatyam", description: "" }],
        scheduleJson: {
          startTime: "09:00",
          endTime: "10:00",
          weekdays: [6],
        },
        active: true,
        ratingAvg: 4.8,
        ratingCount: 10,
        coverImageUrl: null,
        plans: [
          {
            subscription: {
              price: 2000,
              billingCadence: BillingCadence.MONTHLY,
              active: true,
            },
          },
        ],
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new DiscoverService(prisma as never, media as never);
  });

  it("lists studio cards with honest fields and omits empty ratings", async () => {
    prisma.studio.findMany.mockResolvedValue([
      studioFixture,
      {
        ...studioFixture,
        id: "studio-e2e",
        slug: "e2e-test-studio",
        name: "E2E Test Studio",
      },
      {
        ...studioFixture,
        id: "studio-2",
        slug: "quiet-floor",
        name: "Quiet Floor",
        address: "Unknown lane",
        branches: [
          {
            address: "Unknown lane",
            latitude: null,
            longitude: null,
            coverMedia: null,
            media: [],
          },
        ],
        batches: [
          {
            ...studioFixture.batches[0],
            id: "batch-2",
            ratingAvg: null,
            ratingCount: 0,
            plans: [],
            danceCategories: [],
          },
        ],
      },
    ]);

    const cards = await service.listStudios({ city: "chennai" });
    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({
      id: "studio-1",
      name: "Rhythm House",
      city: "Chennai",
      cityId: "chennai",
      locality: "T Nagar",
      localityId: "t-nagar",
      styles: ["Bharatanatyam"],
      categories: ["dance"],
      imageUrl: "signed:heroes/rh.png",
      ratingAvg: 4.8,
      ratingCount: 10,
      priceFrom: 2000,
      priceCadence: BillingCadence.MONTHLY,
    });
    expect(cards[0]).not.toHaveProperty("contact");
    expect(cards[0]).not.toHaveProperty("owner");
    expect(Object.keys(cards[0]!).join(",")).not.toMatch(/email|phone|pii/i);
  });

  it("returns distance when lat/lng are provided", async () => {
    prisma.studio.findMany.mockResolvedValue([studioFixture]);
    const cards = await service.listStudios({
      lat: 13.04,
      lng: 80.24,
      maxKm: 50,
    });
    expect(cards[0]?.distanceKm).toBe(0);
  });

  it("throws for missing or test studios on detail", async () => {
    prisma.studio.findFirst.mockResolvedValue(null);
    await expect(service.getStudio("missing")).rejects.toBeInstanceOf(
      NotFoundException,
    );

    prisma.studio.findFirst.mockResolvedValue({
      ...studioFixture,
      slug: "smoke-test",
      name: "Smoke Test Studio",
    });
    await expect(service.getStudio("smoke-test")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("returns empty list for an unknown city filter", async () => {
    prisma.studio.findMany.mockResolvedValue([studioFixture]);
    await expect(service.listStudios({ city: "atlantis" })).resolves.toEqual(
      [],
    );
  });

  it("aggregates cities categories and stats", async () => {
    prisma.studio.findMany.mockResolvedValue([studioFixture]);
    prisma.user.count.mockResolvedValue(42);

    await expect(service.listCities()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "chennai",
          label: "Chennai",
          studioCount: 1,
        }),
        expect.objectContaining({ id: "mumbai", studioCount: 0 }),
      ]),
    );

    await expect(service.listCategories()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "dance", studioCount: 1 }),
        expect.objectContaining({ id: "music", studioCount: 0 }),
      ]),
    );

    await expect(service.getStats()).resolves.toEqual({
      studios: 1,
      classes: 1,
      learners: 42,
    });
  });

  it("filters by style and locality without a second catalog load", async () => {
    prisma.studio.findMany.mockResolvedValue([studioFixture]);

    await expect(
      service.listStudios({ city: "chennai", style: "bharatanatyam" }),
    ).resolves.toHaveLength(1);
    await expect(
      service.listStudios({ city: "chennai", style: "hip-hop" }),
    ).resolves.toEqual([]);
    await expect(
      service.listStudios({ city: "chennai", locality: "t-nagar" }),
    ).resolves.toHaveLength(1);
    await expect(
      service.listStudios({ city: "chennai", locality: "velachery" }),
    ).resolves.toEqual([]);
    expect(prisma.studio.findMany).toHaveBeenCalledTimes(1);
  });

  it("returns a Chennai landing payload with coming soon cities", async () => {
    prisma.studio.findMany.mockResolvedValue([studioFixture]);

    const landing = await service.listLanding("chennai");
    expect(landing.city).toEqual({
      id: "chennai",
      label: "Chennai",
      available: true,
    });
    expect(
      landing.cities.some((item) => item.id === "bengaluru" && !item.available),
    ).toBe(true);
    expect(landing.styles.some((item) => item.label === "Bharatanatyam")).toBe(
      true,
    );
    expect(landing.areas.some((item) => item.id === "t-nagar")).toBe(true);
    expect(landing.studios).toHaveLength(1);
  });

  it("lists public trial slots and hides test studios", async () => {
    prisma.studio.findFirst.mockResolvedValue({
      id: studioFixture.id,
      slug: studioFixture.slug,
      name: studioFixture.name,
    });
    prisma.session.findMany.mockResolvedValue([
      {
        id: "session-1",
        batchId: "batch-1",
        startsAt: new Date("2026-09-20T10:00:00.000Z"),
        endsAt: new Date("2026-09-20T11:00:00.000Z"),
        batch: {
          name: "Bharatanatyam Kids",
          category: "KIDS",
          danceCategories: [{ name: "Bharatanatyam" }],
        },
      },
    ]);

    await expect(service.listPublicTrialSlots("rhythm-house")).resolves.toEqual(
      [
        {
          sessionId: "session-1",
          batchId: "batch-1",
          batchName: "Bharatanatyam Kids",
          audience: "KIDS",
          styleBadge: "Bharatanatyam",
          startsAt: "2026-09-20T10:00:00.000Z",
          endsAt: "2026-09-20T11:00:00.000Z",
        },
      ],
    );

    prisma.studio.findFirst.mockResolvedValue({
      id: "test-1",
      slug: "smoke-test",
      name: "Smoke Test Studio",
    });
    await expect(
      service.listPublicTrialSlots("smoke-test"),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
