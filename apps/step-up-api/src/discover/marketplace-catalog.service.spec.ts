import { NotFoundException } from "@nestjs/common";
import { BillingCadence } from "../generated/prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MarketplaceCatalogService } from "./marketplace-catalog.service";

const NOW = Date.now();
const inDays = (days: number) => new Date(NOW + days * 24 * 60 * 60 * 1000);

function trainerRow(
  id: string,
  extra: {
    photoUrl?: string | null;
    categories?: string[];
    studioId?: string | null;
    ratings?: number[];
  } = {},
) {
  return {
    id,
    publicSlug: `${id}-slug`,
    photoUrl: extra.photoUrl === undefined ? `trainers/${id}.jpg` : extra.photoUrl,
    styles: ["Hip Hop"],
    active: true,
    studioId: extra.studioId ?? "studio-1",
    trainerRatingAvg: null,
    trainerRatingCount: 0,
    encryptedKey: "k",
    piiCiphertext: "c",
    piiIv: "iv",
    trainerCategories: (extra.categories ?? ["DANCE"]).map((category) => ({
      category,
    })),
    trainerMarketplaceRatings: (extra.ratings ?? []).map((rating) => ({
      rating,
    })),
  };
}

function batchRow(
  id: string,
  extra: {
    name?: string;
    coverImageUrl?: string | null;
    category?: string;
    audience?: "KIDS" | "ADULTS" | "BOTH";
    level?: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | null;
    seats?: number;
    price?: number | null;
    days?: number;
    styles?: Array<{ name: string; description: string }>;
    trainer?: ReturnType<typeof trainerRow>;
    address?: string;
  } = {},
) {
  const startsAt = inDays(extra.days ?? 2);
  const endsAt = new Date(startsAt.getTime() + 60 * 60 * 1000);
  return {
    id,
    name: extra.name ?? `Class ${id}`,
    slug: `${id}-slug`,
    active: true,
    coverImageUrl:
      extra.coverImageUrl === undefined ? `classes/${id}.jpg` : extra.coverImageUrl,
    marketplaceCategory: extra.category ?? "DANCE",
    classLevel: extra.level ?? "BEGINNER",
    classAudience: extra.audience ?? "ADULTS",
    category: extra.audience === "KIDS" ? "KIDS" : "ADULTS",
    danceCategories: extra.styles ?? [{ name: "Hip Hop", description: "" }],
    scheduleJson: {
      startTime: "18:00",
      endTime: "19:00",
      weekdays: [2, 4],
    },
    capacity: extra.seats ?? 12,
    branchId: "branch-1",
    branch: {
      id: "branch-1",
      name: "T Nagar",
      address: extra.address ?? "T Nagar, Chennai",
      latitude: 13.04,
      longitude: 80.24,
      coverMedia: { objectKey: "branches/tnagar.jpg" },
    },
    summary: { availableSeats: extra.seats ?? 12 },
    plans:
      extra.price === null
        ? []
        : [
            {
              subscription: {
                price: extra.price ?? 1500,
                billingCadence: BillingCadence.MONTHLY,
                active: true,
              },
            },
          ],
    trainers: extra.trainer
      ? [{ trainer: extra.trainer }]
      : [{ trainer: trainerRow("trainer-1") }],
    sessions: [
      {
        id: `${id}-session`,
        startsAt,
        endsAt,
        status: "SCHEDULED",
      },
    ],
  };
}

function studioRow(
  extra: {
    id?: string;
    name?: string;
    hero?: string | null;
    categories?: string[];
    batches?: ReturnType<typeof batchRow>[];
    trainers?: ReturnType<typeof trainerRow>[];
    address?: string;
    ratings?: number[];
    ratedRows?: Array<{ rating: number; category: string }>;
    settings?: Partial<{
      publicStudioListing: boolean;
      publicClasses: boolean;
      publicTrainers: boolean;
      publicRatings: boolean;
      bookingTrial: boolean;
      bookingEnrollment: boolean;
      bookingPrivate: boolean;
      bookingFloorHire: boolean;
    }>;
  } = {},
) {
  const id = extra.id ?? "studio-1";
  const trainers = extra.trainers ?? [trainerRow("trainer-1", { studioId: id })];
  return {
    id,
    slug: extra.name ? extra.name.toLowerCase().replace(/\s+/g, "-") : "rhythm-house",
    name: extra.name ?? "Rhythm House",
    address: extra.address ?? "T Nagar, Chennai",
    heroDesktopUrl: extra.hero === undefined ? "heroes/rh.png" : extra.hero,
    heroMobileUrl: null,
    primaryCategory: extra.categories?.[0] ?? "DANCE",
    settings: {
      publicStudioListing: true,
      publicClasses: true,
      publicTrainers: true,
      publicRatings: true,
      bookingTrial: true,
      bookingEnrollment: true,
      bookingPrivate: false,
      bookingFloorHire: false,
      ...extra.settings,
    },
    marketplaceCategories: (extra.categories ?? ["DANCE"]).map((category) => ({
      category,
    })),
    marketplaceRatings:
      extra.ratedRows ??
      (extra.ratings ?? []).map((rating) => ({ rating })),
    branches: [
      {
        id: "branch-1",
        name: "T Nagar",
        address: extra.address ?? "T Nagar, Chennai",
        latitude: 13.04,
        longitude: 80.24,
        coverMedia: { objectKey: "branches/tnagar.jpg" },
      },
    ],
    batches: extra.batches ?? [batchRow("batch-1")],
    trainerLinks: trainers.map((trainer) => ({ trainer })),
  };
}

describe("MarketplaceCatalogService", () => {
  const prisma = {
    studio: { findMany: vi.fn(), findFirst: vi.fn() },
    user: { findMany: vi.fn(), findFirst: vi.fn() },
    booking: { findMany: vi.fn() },
    batch: { findFirst: vi.fn() },
    slugRedirect: { findMany: vi.fn(), upsert: vi.fn(), updateMany: vi.fn() },
  };
  const media = {
    signReadUrl: vi.fn(async (url: string | null) =>
      url ? `signed:${url}` : null,
    ),
    signReadUrls: vi.fn(async (urls: string[]) =>
      urls.map((url) => `signed:${url}`),
    ),
  };
  const slugs = {
    resolve: vi.fn(async (_kind: string, value: string) => value),
    record: vi.fn(),
  };
  const crypto = {
    decryptUser: vi.fn((user: { id: string }) => ({
      id: user.id,
      name: user.id === "trainer-2" ? "Arun" : "Priya",
      bio: "Hip hop faculty",
    })),
  };

  let service: MarketplaceCatalogService;

  function seed(
    studios: ReturnType<typeof studioRow>[],
    independents: ReturnType<typeof trainerRow>[] = [],
  ) {
    prisma.studio.findMany.mockResolvedValue(studios);
    prisma.user.findMany.mockResolvedValue(independents);
    prisma.booking.findMany.mockResolvedValue([]);
  }

  beforeEach(() => {
    vi.clearAllMocks();
    prisma.booking.findMany.mockResolvedValue([]);
    prisma.user.findMany.mockResolvedValue([]);
    slugs.resolve.mockImplementation(async (_kind: string, value: string) => value);
    service = new MarketplaceCatalogService(
      prisma as never,
      media as never,
      crypto as never,
      slugs as never,
    );
  });

  it("hides a class without a cover and keeps the studio", async () => {
    seed([
      studioRow({
        batches: [
          batchRow("hidden", { coverImageUrl: null, name: "No Cover" }),
          batchRow("visible", { name: "With Cover" }),
        ],
      }),
    ]);

    const classes = await service.listClasses({
      category: "DANCE",
      city: "chennai",
    });
    expect(classes.items.map((item) => item.name)).toEqual(["With Cover"]);
    expect(classes.items[0]?.coverImageUrl).toBe("signed:classes/visible.jpg");

    const studios = await service.listStudios({
      category: "DANCE",
      city: "chennai",
    });
    expect(studios.items).toHaveLength(1);
    expect(studios.items[0]?.name).toBe("Rhythm House");
  });

  it("does not leak Music inventory into Dance", async () => {
    seed([
      studioRow({
        categories: ["DANCE", "MUSIC"],
        batches: [
          batchRow("dance", { name: "Hip Hop Foundations", category: "DANCE" }),
          batchRow("music", { name: "Piano Lab", category: "MUSIC" }),
        ],
      }),
    ]);

    const dance = await service.listClasses({
      category: "DANCE",
      city: "chennai",
    });
    expect(dance.items.map((item) => item.name)).toEqual([
      "Hip Hop Foundations",
    ]);

    const music = await service.listClasses({
      category: "MUSIC",
      city: "chennai",
    });
    expect(music.items.map((item) => item.name)).toEqual(["Piano Lab"]);
  });

  it("keeps Kids classes when audience=KIDS", async () => {
    seed([
      studioRow({
        batches: [
          batchRow("kids", { name: "Kids Ballet", audience: "KIDS" }),
          batchRow("adults", { name: "Adult Ballet", audience: "ADULTS" }),
          batchRow("both", { name: "Open Ballet", audience: "BOTH" }),
        ],
      }),
    ]);

    const kids = await service.listClasses({
      category: "DANCE",
      city: "chennai",
      audience: "KIDS",
    });
    expect(kids.items.map((item) => item.name).sort()).toEqual([
      "Kids Ballet",
      "Open Ballet",
    ]);
  });

  it("matches search tokens on class, style, studio, trainer, and area", async () => {
    seed([
      studioRow({
        name: "Adyar Studio",
        address: "Adyar, Chennai",
        batches: [
          batchRow("hop", {
            name: "Hip Hop Foundations",
            styles: [{ name: "Hip Hop", description: "" }],
            address: "Adyar, Chennai",
            trainer: trainerRow("trainer-1"),
          }),
        ],
      }),
    ]);

    const byStyle = await service.listClasses({
      category: "DANCE",
      city: "chennai",
      q: "hip hop",
    });
    expect(byStyle.items).toHaveLength(1);
    expect(byStyle.sort).toBe("relevance");

    const byArea = await service.listClasses({
      category: "DANCE",
      city: "chennai",
      q: "adyar",
    });
    expect(byArea.items[0]?.name).toBe("Hip Hop Foundations");

    const byTrainer = await service.listClasses({
      category: "DANCE",
      city: "chennai",
      q: "priya",
    });
    expect(byTrainer.items).toHaveLength(1);

    const miss = await service.listClasses({
      category: "DANCE",
      city: "chennai",
      q: "kathak",
    });
    expect(miss.items).toEqual([]);
    expect(miss.empty.kind).toBe("filters");
    expect(miss.empty.message).toContain("filters");
  });

  it("returns a zero-result empty envelope instead of fabricating cards", async () => {
    seed([]);
    const empty = await service.listClasses({
      category: "MUSIC",
      city: "chennai",
    });
    expect(empty.items).toEqual([]);
    expect(empty.empty.kind).toBe("category");
    expect(empty.empty.message).toContain("Music");
    expect(empty.empty.message).toContain("Chennai");
    expect(empty.tab).toBe("classes");
    expect(empty.category).toBe("MUSIC");
    expect(empty.city).toBe("chennai");
  });

  it("uses tab empty copy when studios exist but no public classes do", async () => {
    seed([
      studioRow({
        batches: [batchRow("hidden", { coverImageUrl: null })],
      }),
    ]);
    const empty = await service.listClasses({
      category: "DANCE",
      city: "chennai",
    });
    expect(empty.items).toEqual([]);
    expect(empty.empty.kind).toBe("tab");
  });

  it("sorts availability with bookable classes first", async () => {
    seed([
      studioRow({
        batches: [
          batchRow("full", {
            name: "Sold Out",
            seats: 0,
          }),
          batchRow("open", {
            name: "Open Class",
            seats: 8,
            days: 4,
          }),
        ],
        settings: { bookingTrial: false },
      }),
    ]);

    const page = await service.listClasses({
      category: "DANCE",
      city: "chennai",
      sort: "availability",
    });
    expect(page.sort).toBe("availability");
    expect(page.items[0]?.name).toBe("Open Class");
    expect(page.items[0]?.canEnroll).toBe(true);
    expect(page.items[1]?.name).toBe("Sold Out");
    expect(page.items[1]?.canEnroll).toBe(false);
  });

  it("exposes seat copy for 0, 1–5, and omits it above 5", async () => {
    seed([
      studioRow({
        batches: [
          batchRow("full", { name: "Full Class", seats: 0 }),
          batchRow("few", { name: "Few Left", seats: 3 }),
          batchRow("many", { name: "Open Floor", seats: 12 }),
        ],
      }),
    ]);
    const page = await service.listClasses({
      category: "DANCE",
      city: "chennai",
    });
    const byName = Object.fromEntries(
      page.items.map((item) => [item.name, item.seatLabel]),
    );
    expect(byName["Full Class"]).toBe("Full");
    expect(byName["Few Left"]).toBe("3 seats left");
    expect(byName["Open Floor"]).toBeNull();
  });

  it("puts missing prices last on price sort", async () => {
    seed([
      studioRow({
        batches: [
          batchRow("ask", { name: "Ask studio", price: null }),
          batchRow("priced", { name: "Priced", price: 900 }),
        ],
      }),
    ]);
    const page = await service.listClasses({
      category: "DANCE",
      city: "chennai",
      sort: "price",
    });
    expect(page.items.map((item) => item.name)).toEqual([
      "Priced",
      "Ask studio",
    ]);
    expect(page.items[0]?.priceFrom).toBe(900);
    expect(page.items[1]?.priceFrom).toBeNull();
  });

  it("hides trainers without a photo and lists independents with a photo", async () => {
    seed(
      [
        studioRow({
          trainers: [trainerRow("hidden-trainer", { photoUrl: null })],
          batches: [batchRow("class-1")],
        }),
      ],
      [
        trainerRow("indie", {
          photoUrl: "trainers/indie.jpg",
          studioId: null,
          categories: ["DANCE"],
        }),
      ],
    );

    const page = await service.listTrainers({
      category: "DANCE",
      city: "chennai",
    });
    expect(page.items.map((item) => item.id)).toEqual(["indie"]);
    expect(page.items[0]?.canPrivate).toBe(false);
    expect(page.items[0]?.photoUrl).toBe("signed:trainers/indie.jpg");
  });

  it("returns class detail by slug with booking flags and upcoming sessions", async () => {
    const batch = batchRow("detail", { name: "Hip Hop Foundations" });
    const studio = studioRow({
      batches: [batch],
      settings: { bookingPrivate: true, bookingFloorHire: true },
    });
    prisma.batch.findFirst.mockResolvedValue({
      ...batch,
      studio,
    });

    const detail = await service.getClass("detail-slug");
    expect(detail.name).toBe("Hip Hop Foundations");
    expect(detail.canTrial).toBe(true);
    expect(detail.canPrivate).toBe(true);
    expect(detail.canFloorHire).toBe(true);
    expect(detail.upcomingSessions).toHaveLength(1);
    expect(detail.viewerEnrolled).toBeNull();
    expect(detail.trainerSlug).toBe("trainer-1-slug");
    expect(detail.plans[0]?.name).toBe("Plan");
  });

  it("follows an old class slug through SlugRedirect", async () => {
    slugs.resolve.mockResolvedValueOnce("detail-slug");
    const batch = batchRow("detail", { name: "Hip Hop Foundations" });
    prisma.batch.findFirst.mockResolvedValue({
      ...batch,
      studio: studioRow({ batches: [batch] }),
    });
    const detail = await service.getClass("old-class");
    expect(slugs.resolve).toHaveBeenCalledWith("CLASS", "old-class");
    expect(detail.slug).toBe("detail-slug");
  });

  it("returns studio detail with classes, trainers, and visit fields", async () => {
    const batch = batchRow("detail", { name: "Hip Hop Foundations" });
    const studio = studioRow({
      batches: [batch],
      settings: { bookingFloorHire: true },
    });
    seed([studio]);
    prisma.studio.findFirst.mockResolvedValue({
      ...studio,
      about: "A downtown floor.",
      tagline: "Move more",
      photos: ["studios/tour.jpg"],
      branches: studio.branches.map((branch) => ({
        ...branch,
        amenities: ["parking"],
        openingHours: { days: [{ day: 1, open: "10:00", close: "20:00" }] },
        media: [{ objectKey: "branches/hall.jpg" }],
      })),
    });

    const detail = await service.getStudio("rhythm-house");
    expect(detail.name).toBe("Rhythm House");
    expect(detail.about).toBe("A downtown floor.");
    expect(detail.canFloorHire).toBe(true);
    expect(detail.classes.map((item) => item.name)).toEqual([
      "Hip Hop Foundations",
    ]);
    expect(detail.trainers[0]?.id).toBe("trainer-1");
    expect(detail.branches[0]?.mapsUrl).toContain("13.04");
    expect(detail.photos.length).toBeGreaterThan(0);
  });

  it("does not let Fitness stars lift Dance cards", async () => {
    seed([
      studioRow({
        ratedRows: [
          { rating: 5, category: "FITNESS" },
          { rating: 5, category: "FITNESS" },
          { rating: 5, category: "FITNESS" },
        ],
      }),
    ]);
    const page = await service.listStudios({
      category: "DANCE",
      city: "chennai",
    });
    expect(page.items[0]?.rating).toEqual({
      visible: false,
      label: "New",
      count: 0,
    });
  });

  it("404s a class that fails the public image gate", async () => {
    const batch = batchRow("hidden", { coverImageUrl: null });
    prisma.batch.findFirst.mockResolvedValue({
      ...batch,
      studio: studioRow({ batches: [batch] }),
    });
    await expect(service.getClass("hidden")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
