import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import {
  BookingStatus,
  MarketplaceCategory,
  type BillingCadence,
  SessionStatus,
  StudioStatus,
  UserRole,
} from "../generated/prisma/client";
import { MediaService } from "../media/media.service";
import { PrismaService } from "../prisma/prisma.service";
import { isTestStudio } from "../studios/test-studio";
import { UserCryptoService, userPiiSelect } from "../users/user-crypto.service";
import {
  stylesFromDanceCategories,
  uniqueCanonicalStyleNames,
} from "./discover.categories";
import { findCityById, matchCityFromAddress } from "./discover.cities";
import { nearestDistanceKm, roundDistanceKm } from "./discover.geo";
import {
  findLocalityById,
  matchLocality,
  stylesMatchQuery,
} from "./discover.localities";
import { batchScheduleLabel } from "./discover.schedule";
import {
  marketplaceFirstPaint,
  type PublicMarketplaceCategory,
} from "./marketplace.contract";
import {
  audienceMatches,
  catalogEmpty,
  catalogLimit,
  categoryLabel,
  classPassesPublicGates,
  compareCatalogItems,
  effectiveMarketplaceSort,
  isJoinBookable,
  isTrialBookable,
  lowestPlan,
  parseMarketplaceCategory,
  parseMarketplaceSort,
  scheduleMatchesFilters,
  searchRelevance,
  seatCopy,
  studioPassesPublicGates,
  toRatingView,
  trainerPassesPublicGates,
  withinHomeSessionWindow,
} from "./marketplace-catalog.query";
import type {
  MarketplaceCatalogFilters,
  MarketplaceCatalogPage,
  MarketplaceClassCard,
  MarketplaceClassDetail,
  MarketplaceStudioCard,
  MarketplaceTrainerCard,
  MarketplaceTrainerDetail,
} from "./marketplace-catalog.types";

const CATALOG_TTL_MS = 30_000;
const POPULARITY_WINDOW_DAYS = 30;

type SettingsRow = {
  publicStudioListing: boolean;
  publicClasses: boolean;
  publicTrainers: boolean;
  publicRatings: boolean;
  bookingTrial: boolean;
  bookingEnrollment: boolean;
  bookingPrivate: boolean;
  bookingFloorHire: boolean;
};

type BranchRow = {
  id: string;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  coverMedia: { objectKey: string } | null;
};

type TrainerPiiRow = {
  id: string;
  publicSlug: string | null;
  photoUrl: string | null;
  styles: string[];
  active: boolean;
  studioId: string | null;
  trainerRatingAvg: number | null;
  trainerRatingCount: number;
  encryptedKey: string;
  piiCiphertext: string;
  piiIv: string;
  trainerCategories: Array<{ category: string }>;
  marketplaceRatings: Array<{ rating: number }>;
};

type BatchRow = {
  id: string;
  name: string;
  slug: string | null;
  active: boolean;
  coverImageUrl: string | null;
  marketplaceCategory: string;
  classLevel: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | null;
  classAudience: "KIDS" | "ADULTS" | "BOTH";
  category: "KIDS" | "ADULTS";
  danceCategories: unknown;
  scheduleJson: unknown;
  capacity: number;
  branchId: string;
  branch: BranchRow;
  summary: { availableSeats: number } | null;
  plans: Array<{
    subscription: {
      price: { toString(): string } | number;
      billingCadence: BillingCadence;
      active: boolean;
    };
  }>;
  trainers: Array<{ trainer: TrainerPiiRow }>;
  sessions: Array<{
    id: string;
    startsAt: Date;
    endsAt: Date;
    status: SessionStatus;
  }>;
};

type StudioRow = {
  id: string;
  slug: string;
  name: string;
  address: string | null;
  heroDesktopUrl: string | null;
  heroMobileUrl: string | null;
  primaryCategory: string;
  settings: SettingsRow | null;
  marketplaceCategories: Array<{ category: string }>;
  marketplaceRatings: Array<{ rating: number }>;
  branches: BranchRow[];
  batches: BatchRow[];
  trainerLinks: Array<{ trainer: TrainerPiiRow }>;
};

type Popularity = {
  batch: Map<string, number>;
  studio: Map<string, number>;
  trainer: Map<string, number>;
};

type CatalogSnapshot = {
  at: number;
  category: PublicMarketplaceCategory;
  studios: StudioRow[];
  independents: TrainerPiiRow[];
  popularity: Popularity;
};

const DEFAULT_SETTINGS: SettingsRow = {
  publicStudioListing: true,
  publicClasses: true,
  publicTrainers: true,
  publicRatings: true,
  bookingTrial: true,
  bookingEnrollment: true,
  bookingPrivate: false,
  bookingFloorHire: false,
};

function priceNumber(value: { toString(): string } | number): number {
  return typeof value === "number" ? value : Number(value.toString());
}

function settingsOf(studio: StudioRow): SettingsRow {
  return studio.settings ?? DEFAULT_SETTINGS;
}

function hasSchedule(batch: BatchRow): boolean {
  return Boolean(batchScheduleLabel(batch.scheduleJson) || batch.sessions[0]);
}

function nextSession(batch: BatchRow, now = new Date()) {
  return (
    batch.sessions
      .filter(
        (session) =>
          session.status === SessionStatus.SCHEDULED &&
          session.startsAt.getTime() > now.getTime(),
      )
      .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())[0] ?? null
  );
}

function availableSeatsOf(batch: BatchRow): number {
  return batch.summary?.availableSeats ?? batch.capacity;
}

function planOf(batch: BatchRow) {
  return lowestPlan(
    batch.plans.map((plan) => ({
      active: plan.subscription.active,
      price: priceNumber(plan.subscription.price),
      cadence: plan.subscription.billingCadence,
    })),
  );
}

function ratingFromRows(
  rows: Array<{ rating: number }>,
  publicRatings: boolean,
) {
  if (!publicRatings || rows.length === 0) {
    return toRatingView(null, 0);
  }
  const count = rows.length;
  const avg =
    Math.round(
      (rows.reduce((sum, row) => sum + row.rating, 0) / count) * 10,
    ) / 10;
  return toRatingView(avg, count);
}

function locateStudio(studio: StudioRow) {
  const addresses = [
    studio.address,
    ...studio.branches.map((branch) => branch.address),
  ];
  const city = matchCityFromAddress(...addresses);
  const point = studio.branches.find(
    (branch) => branch.latitude != null && branch.longitude != null,
  );
  const locality = matchLocality({
    addresses,
    latitude: point?.latitude ?? null,
    longitude: point?.longitude ?? null,
  });
  return { city, locality };
}

function studioCover(studio: StudioRow) {
  return {
    heroDesktopUrl: studio.heroDesktopUrl,
    heroMobileUrl: studio.heroMobileUrl,
    branchCoverUrl:
      studio.branches.find((branch) => branch.coverMedia?.objectKey)?.coverMedia
        ?.objectKey ?? null,
  };
}

function trainerName(
  crypto: UserCryptoService,
  trainer: TrainerPiiRow,
): string {
  try {
    return crypto.decryptUser(trainer).name.trim() || "Trainer";
  } catch {
    return "Trainer";
  }
}

@Injectable()
export class MarketplaceCatalogService {
  private snapshot: CatalogSnapshot | null = null;

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(MediaService) private readonly media: MediaService,
    @Inject(UserCryptoService) private readonly crypto: UserCryptoService,
  ) {}

  normalizeFilters(
    raw: MarketplaceCatalogFilters & { category?: string; city?: string },
  ): MarketplaceCatalogFilters {
    const paint = marketplaceFirstPaint();
    return {
      ...raw,
      category: parseMarketplaceCategory(raw.category ?? paint.category),
      city: (raw.city ?? paint.city).trim().toLowerCase() || paint.city,
      q: raw.q?.trim() || undefined,
      style: raw.style?.trim() || undefined,
      locality: raw.locality?.trim().toLowerCase() || undefined,
    };
  }

  async listClasses(
    raw: MarketplaceCatalogFilters,
  ): Promise<MarketplaceCatalogPage<MarketplaceClassCard>> {
    const filters = this.normalizeFilters(raw);
    const { classes, studios, trainers } = await this.collect(filters);
    const sort = effectiveMarketplaceSort(
      parseMarketplaceSort(filters.sort, filters.q),
      filters,
    );
    const ranked = [...classes].sort((left, right) =>
      compareCatalogItems(left.sort, right.sort, sort),
    );
    const items = ranked
      .slice(0, catalogLimit(filters.limit))
      .map((row) => row.card);
    return {
      tab: "classes",
      category: filters.category,
      city: filters.city,
      sort,
      empty: catalogEmpty(
        items.length,
        filters,
        "classes",
        studios.length + trainers.length,
        categoryLabel(filters.category),
        findCityById(filters.city)?.label ?? filters.city,
      ),
      items,
    };
  }

  async listStudios(
    raw: MarketplaceCatalogFilters,
  ): Promise<MarketplaceCatalogPage<MarketplaceStudioCard>> {
    const filters = this.normalizeFilters(raw);
    const { classes, studios, trainers } = await this.collect(filters);
    const sort = effectiveMarketplaceSort(
      parseMarketplaceSort(filters.sort, filters.q),
      filters,
    );
    const ranked = [...studios].sort((left, right) =>
      compareCatalogItems(left.sort, right.sort, sort),
    );
    const items = ranked
      .slice(0, catalogLimit(filters.limit))
      .map((row) => row.card);
    return {
      tab: "studios",
      category: filters.category,
      city: filters.city,
      sort,
      empty: catalogEmpty(
        items.length,
        filters,
        "studios",
        classes.length + trainers.length,
        categoryLabel(filters.category),
        findCityById(filters.city)?.label ?? filters.city,
      ),
      items,
    };
  }

  async listTrainers(
    raw: MarketplaceCatalogFilters,
  ): Promise<MarketplaceCatalogPage<MarketplaceTrainerCard>> {
    const filters = this.normalizeFilters(raw);
    const { classes, studios, trainers } = await this.collect(filters);
    const sort = effectiveMarketplaceSort(
      parseMarketplaceSort(filters.sort, filters.q),
      filters,
    );
    const ranked = [...trainers].sort((left, right) =>
      compareCatalogItems(left.sort, right.sort, sort),
    );
    const items = ranked
      .slice(0, catalogLimit(filters.limit))
      .map((row) => row.card);
    return {
      tab: "trainers",
      category: filters.category,
      city: filters.city,
      sort,
      empty: catalogEmpty(
        items.length,
        filters,
        "trainers",
        classes.length + studios.length,
        categoryLabel(filters.category),
        findCityById(filters.city)?.label ?? filters.city,
      ),
      items,
    };
  }

  async getClass(idOrSlug: string): Promise<MarketplaceClassDetail> {
    const now = new Date();
    const batch = await this.prisma.batch.findFirst({
      where: {
        active: true,
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
        studio: { status: StudioStatus.ACTIVE },
      },
      select: this.detailBatchSelect(),
    });
    if (!batch) throw new NotFoundException("Class not found");

    const studio = batch.studio;
    if (isTestStudio(studio)) throw new NotFoundException("Class not found");
    const settings = studio.settings ?? DEFAULT_SETTINGS;
    if (
      !classPassesPublicGates({
        coverImageUrl: batch.coverImageUrl,
        studioActive: true,
        publicClasses: settings.publicClasses,
        hasBranch: Boolean(batch.branch),
        hasSchedule: hasSchedule(batch),
        testStudio: false,
      })
    ) {
      throw new NotFoundException("Class not found");
    }

    const filters: MarketplaceCatalogFilters = {
      category: parseMarketplaceCategory(batch.marketplaceCategory),
      city:
        matchCityFromAddress(
          studio.address,
          batch.branch.address,
          ...studio.branches.map((branch) => branch.address),
        )?.id ?? marketplaceFirstPaint().city,
    };
    const card = await this.toClassCard(
      batch,
      { ...studio, batches: [batch], trainerLinks: [] },
      filters,
      { batch: new Map(), studio: new Map(), trainer: new Map() },
      now,
      { requireHomeWindow: false },
    );
    if (!card) throw new NotFoundException("Class not found");

    const upcoming = batch.sessions
      .filter(
        (session) =>
          session.status === SessionStatus.SCHEDULED &&
          session.startsAt.getTime() > now.getTime(),
      )
      .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())
      .slice(0, 12)
      .map((session) => ({
        sessionId: session.id,
        startsAt: session.startsAt.toISOString(),
        endsAt: session.endsAt.toISOString(),
      }));

    const trainers = await Promise.all(
      batch.trainers
        .filter((row) => row.trainer.active)
        .map(async (row) => ({
          id: row.trainer.id,
          name: trainerName(this.crypto, row.trainer),
          photoUrl: await this.media.signReadUrl(row.trainer.photoUrl),
        })),
    );

    return {
      ...card.card,
      studioSlug: studio.slug,
      branchId: batch.branch.id,
      branchName: batch.branch.name,
      trainers,
      upcomingSessions: upcoming,
      canPrivate: settings.bookingPrivate,
      canFloorHire: settings.bookingFloorHire,
    };
  }

  async getTrainer(idOrSlug: string): Promise<MarketplaceTrainerDetail> {
    const trainer = await this.prisma.user.findFirst({
      where: {
        role: UserRole.TRAINER,
        active: true,
        OR: [{ id: idOrSlug }, { publicSlug: idOrSlug }],
      },
      select: this.trainerSelect(),
    });
    if (!trainer) throw new NotFoundException("Trainer not found");

    const snapshot = await this.loadSnapshot(
      parseMarketplaceCategory(
        trainer.trainerCategories[0]?.category ??
          marketplaceFirstPaint().category,
      ),
    );
    const filters: MarketplaceCatalogFilters = {
      category: parseMarketplaceCategory(
        trainer.trainerCategories[0]?.category ??
          marketplaceFirstPaint().category,
      ),
      city: marketplaceFirstPaint().city,
    };
    const mapped = await this.toTrainerCard(
      trainer,
      snapshot.studios,
      filters,
      snapshot.popularity,
      new Date(),
      { ignoreCity: true },
    );
    if (!mapped) throw new NotFoundException("Trainer not found");

    const taught = snapshot.studios.flatMap((studio) =>
      studio.batches
        .filter((batch) =>
          batch.trainers.some((row) => row.trainer.id === trainer.id),
        )
        .map((batch) => ({
          id: batch.id,
          slug: batch.slug ?? batch.id,
          name: batch.name,
          studioName: studio.name,
        })),
    );
    const studios = snapshot.studios
      .filter((studio) =>
        studio.trainerLinks.some((link) => link.trainer.id === trainer.id),
      )
      .filter((studio) => settingsOf(studio).publicTrainers)
      .map((studio) => ({
        id: studio.id,
        slug: studio.slug,
        name: studio.name,
        canPrivate: settingsOf(studio).bookingPrivate,
      }));

    let bio: string | null = null;
    try {
      bio = this.crypto.decryptUser(trainer).bio;
    } catch {
      bio = null;
    }

    return {
      ...mapped.card,
      bio,
      styles: uniqueCanonicalStyleNames(trainer.styles),
      studios,
      classes: taught,
    };
  }

  private async collect(filters: MarketplaceCatalogFilters) {
    const now = new Date();
    const snapshot = await this.loadSnapshot(filters.category);
    const classes: Array<{
      card: MarketplaceClassCard;
      sort: Parameters<typeof compareCatalogItems>[0];
    }> = [];
    const studios: Array<{
      card: MarketplaceStudioCard;
      sort: Parameters<typeof compareCatalogItems>[0];
    }> = [];
    const trainers = new Map<
      string,
      {
        card: MarketplaceTrainerCard;
        sort: Parameters<typeof compareCatalogItems>[0];
      }
    >();

    for (const studio of snapshot.studios) {
      const studioCard = await this.toStudioCard(
        studio,
        filters,
        snapshot.popularity,
        now,
      );
      if (studioCard) studios.push(studioCard);

      for (const batch of studio.batches) {
        const classCard = await this.toClassCard(
          batch,
          studio,
          filters,
          snapshot.popularity,
          now,
        );
        if (classCard) classes.push(classCard);
      }

      for (const link of studio.trainerLinks) {
        const trainerCard = await this.toTrainerCard(
          link.trainer,
          snapshot.studios,
          filters,
          snapshot.popularity,
          now,
        );
        if (trainerCard) trainers.set(link.trainer.id, trainerCard);
      }
    }

    for (const trainer of snapshot.independents) {
      const trainerCard = await this.toTrainerCard(
        trainer,
        snapshot.studios,
        filters,
        snapshot.popularity,
        now,
      );
      if (trainerCard) trainers.set(trainer.id, trainerCard);
    }

    return { classes, studios, trainers: [...trainers.values()] };
  }

  private async toClassCard(
    batch: BatchRow,
    studio: StudioRow,
    filters: MarketplaceCatalogFilters,
    popularity: Popularity,
    now: Date,
    options?: { requireHomeWindow?: boolean },
  ) {
    if (batch.marketplaceCategory !== filters.category) return null;
    if (!audienceMatches(batch.classAudience, filters.audience)) return null;
    if (filters.level && batch.classLevel !== filters.level) return null;
    if (!scheduleMatchesFilters(batch.scheduleJson, filters)) return null;

    const settings = settingsOf(studio);
    const next = nextSession(batch, now);
    const requireWindow = options?.requireHomeWindow ?? true;
    if (
      !classPassesPublicGates({
        coverImageUrl: batch.coverImageUrl,
        studioActive: true,
        publicClasses: settings.publicClasses,
        hasBranch: Boolean(batch.branch),
        hasSchedule: hasSchedule(batch),
        testStudio: isTestStudio(studio),
      })
    ) {
      return null;
    }
    if (requireWindow && !withinHomeSessionWindow(next?.startsAt ?? null, now)) {
      return null;
    }

    const { city, locality } = locateStudio({
      ...studio,
      branches: [batch.branch, ...studio.branches],
    });
    if (filters.city && city?.id !== filters.city) return null;
    if (filters.locality) {
      const wanted = findLocalityById(filters.locality);
      if (!wanted || locality?.id !== wanted.id) return null;
    }

    const styles = uniqueCanonicalStyleNames(
      stylesFromDanceCategories(batch.danceCategories),
    );
    if (filters.style && !stylesMatchQuery(styles, filters.style)) return null;

    const origin =
      filters.lat != null && filters.lng != null
        ? { lat: filters.lat, lng: filters.lng }
        : null;
    const distance = origin
      ? nearestDistanceKm(origin, [batch.branch, ...studio.branches])
      : null;
    if (filters.maxKm != null && origin) {
      if (distance == null || distance > filters.maxKm) return null;
    }

    const plan = planOf(batch);
    if (filters.maxPrice != null) {
      if (plan == null || plan.price > filters.maxPrice) return null;
    }

    const trainerNames = batch.trainers
      .filter((row) => row.trainer.active)
      .map((row) => trainerName(this.crypto, row.trainer));
    const search = searchRelevance(
      {
        names: [batch.name],
        styles,
        related: [
          studio.name,
          ...trainerNames,
          locality?.label ?? "",
          batch.branch.address,
        ],
      },
      filters.q ?? "",
    );
    if (filters.q && !search.matched) return null;

    const seats = availableSeatsOf(batch);
    const canTrial = isTrialBookable({
      bookingTrial: settings.bookingTrial,
      hasFutureSession: Boolean(next),
    });
    const canEnroll = isJoinBookable({
      availableSeats: seats,
      bookingEnrollment: settings.bookingEnrollment,
      hasPublicPlan: plan != null,
    });
    const firstTrainer = batch.trainers.find((row) => row.trainer.active);

    const card: MarketplaceClassCard = {
      id: batch.id,
      slug: batch.slug ?? batch.id,
      name: batch.name,
      category: parseMarketplaceCategory(batch.marketplaceCategory),
      level: batch.classLevel,
      audience: batch.classAudience,
      studioId: studio.id,
      studioSlug: studio.slug,
      studioName: studio.name,
      trainerId: firstTrainer?.trainer.id ?? null,
      trainerName: firstTrainer
        ? trainerName(this.crypto, firstTrainer.trainer)
        : null,
      locality: locality?.label ?? null,
      localityId: locality?.id ?? null,
      city: city?.label ?? null,
      cityId: city?.id ?? null,
      distanceKm: distance == null ? null : roundDistanceKm(distance),
      scheduleLabel: batchScheduleLabel(batch.scheduleJson),
      nextSessionAt: next?.startsAt.toISOString() ?? null,
      availableSeats: seats,
      seatLabel: seatCopy(seats),
      priceFrom: plan?.price ?? null,
      priceCadence: plan?.cadence ?? null,
      coverImageUrl: await this.media.signReadUrl(batch.coverImageUrl),
      styles,
      studioRating: ratingFromRows(
        studio.marketplaceRatings,
        settings.publicRatings,
      ),
      trainerRating: ratingFromRows(
        firstTrainer?.trainer.marketplaceRatings ?? [],
        settings.publicRatings,
      ),
      canTrial,
      canEnroll,
      viewerEnrolled: null,
      viewerTrialBooked: null,
    };

    return {
      card,
      sort: {
        bookable: canTrial || canEnroll,
        distanceKm: card.distanceKm,
        nextAt: next?.startsAt.getTime() ?? null,
        priceFrom: card.priceFrom,
        ratingAvg: card.studioRating.visible ? card.studioRating.avg : null,
        ratingCount: card.studioRating.visible ? card.studioRating.count : 0,
        popularity: popularity.batch.get(batch.id) ?? 0,
        name: batch.name,
        searchScore: search.score,
      },
    };
  }

  private async toStudioCard(
    studio: StudioRow,
    filters: MarketplaceCatalogFilters,
    popularity: Popularity,
    now: Date,
  ) {
    if (isTestStudio(studio)) return null;
    const settings = settingsOf(studio);
    const categoryBatches = studio.batches.filter(
      (batch) => batch.marketplaceCategory === filters.category && batch.active,
    );
    const offersCategory =
      studio.marketplaceCategories.some(
        (row) => row.category === filters.category,
      ) || categoryBatches.length > 0;
    const cover = studioCover(studio);
    if (
      !studioPassesPublicGates({
        studioActive: true,
        publicStudioListing: settings.publicStudioListing,
        testStudio: false,
        ...cover,
        inventoryInCategory: offersCategory,
      })
    ) {
      return null;
    }

    const { city, locality } = locateStudio(studio);
    if (filters.city && city?.id !== filters.city) return null;
    if (filters.locality) {
      const wanted = findLocalityById(filters.locality);
      if (!wanted || locality?.id !== wanted.id) return null;
    }
    if (
      filters.audience &&
      !categoryBatches.some((batch) =>
        audienceMatches(batch.classAudience, filters.audience),
      )
    ) {
      return null;
    }
    if (
      filters.level &&
      !categoryBatches.some((batch) => batch.classLevel === filters.level)
    ) {
      return null;
    }
    if (
      !categoryBatches.some((batch) =>
        scheduleMatchesFilters(batch.scheduleJson, filters),
      ) &&
      (filters.days || filters.time)
    ) {
      return null;
    }

    const styles = uniqueCanonicalStyleNames(
      categoryBatches.flatMap((batch) =>
        stylesFromDanceCategories(batch.danceCategories),
      ),
    );
    if (filters.style && !stylesMatchQuery(styles, filters.style)) return null;

    const origin =
      filters.lat != null && filters.lng != null
        ? { lat: filters.lat, lng: filters.lng }
        : null;
    const distance = origin
      ? nearestDistanceKm(origin, studio.branches)
      : null;
    if (filters.maxKm != null && origin) {
      if (distance == null || distance > filters.maxKm) return null;
    }

    const plan = lowestPlan(
      categoryBatches.flatMap((batch) =>
        batch.plans.map((row) => ({
          active: row.subscription.active,
          price: priceNumber(row.subscription.price),
          cadence: row.subscription.billingCadence,
        })),
      ),
    );
    if (filters.maxPrice != null) {
      if (plan == null || plan.price > filters.maxPrice) return null;
    }

    const trainerNames = studio.trainerLinks
      .filter((link) => link.trainer.active)
      .map((link) => trainerName(this.crypto, link.trainer));
    const search = searchRelevance(
      {
        names: [studio.name],
        styles,
        related: [locality?.label ?? "", studio.address ?? "", ...trainerNames],
      },
      filters.q ?? "",
    );
    if (filters.q && !search.matched) return null;

    const next = categoryBatches
      .map((batch) => nextSession(batch, now))
      .filter((session): session is NonNullable<typeof session> =>
        Boolean(session),
      )
      .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())[0];

    const canTrial = categoryBatches.some((batch) =>
      isTrialBookable({
        bookingTrial: settings.bookingTrial,
        hasFutureSession: Boolean(nextSession(batch, now)),
      }),
    );
    const canEnroll = categoryBatches.some((batch) =>
      isJoinBookable({
        availableSeats: availableSeatsOf(batch),
        bookingEnrollment: settings.bookingEnrollment,
        hasPublicPlan: planOf(batch) != null,
      }),
    );
    const audiences = new Set(categoryBatches.map((batch) => batch.classAudience));
    const audience =
      audiences.size === 0
        ? null
        : audiences.has("BOTH") ||
            (audiences.has("KIDS") && audiences.has("ADULTS"))
          ? "BOTH"
          : ([...audiences][0] ?? null);

    const card: MarketplaceStudioCard = {
      id: studio.id,
      slug: studio.slug,
      name: studio.name,
      primaryCategory: parseMarketplaceCategory(
        studio.primaryCategory || filters.category,
      ),
      categories: [
        ...new Set(
          studio.marketplaceCategories.map((row) =>
            parseMarketplaceCategory(row.category),
          ),
        ),
      ],
      locality: locality?.label ?? null,
      localityId: locality?.id ?? null,
      city: city?.label ?? null,
      cityId: city?.id ?? null,
      distanceKm: distance == null ? null : roundDistanceKm(distance),
      coverImageUrl: await this.media.signReadUrl(
        cover.heroDesktopUrl || cover.heroMobileUrl || cover.branchCoverUrl,
      ),
      rating: ratingFromRows(studio.marketplaceRatings, settings.publicRatings),
      audience,
      priceFrom: plan?.price ?? null,
      priceCadence: plan?.cadence ?? null,
      nextTrialAt: next?.startsAt.toISOString() ?? null,
      classCount: categoryBatches.length,
      styles,
      canTrial,
      canEnroll,
      canPrivate: settings.bookingPrivate,
      canFloorHire: settings.bookingFloorHire,
    };

    return {
      card,
      sort: {
        bookable: canTrial || canEnroll || settings.bookingPrivate,
        distanceKm: card.distanceKm,
        nextAt: next?.startsAt.getTime() ?? null,
        priceFrom: card.priceFrom,
        ratingAvg: card.rating.visible ? card.rating.avg : null,
        ratingCount: card.rating.visible ? card.rating.count : 0,
        popularity: popularity.studio.get(studio.id) ?? 0,
        name: studio.name,
        searchScore: search.score,
      },
    };
  }

  private async toTrainerCard(
    trainer: TrainerPiiRow,
    studios: StudioRow[],
    filters: MarketplaceCatalogFilters,
    popularity: Popularity,
    now: Date,
    options?: { ignoreCity?: boolean },
  ) {
    if (!trainer.active) return null;
    const listedStudios = studios.filter(
      (studio) =>
        !isTestStudio(studio) &&
        settingsOf(studio).publicTrainers &&
        (studio.trainerLinks.some((link) => link.trainer.id === trainer.id) ||
          trainer.studioId === studio.id),
    );
    const independent = listedStudios.length === 0 && !trainer.studioId;
    const categories = new Set([
      ...trainer.trainerCategories.map((row) => row.category),
      ...studios.flatMap((studio) =>
        studio.batches
          .filter((batch) =>
            batch.trainers.some((row) => row.trainer.id === trainer.id),
          )
          .map((batch) => batch.marketplaceCategory),
      ),
    ]);
    if (
      !trainerPassesPublicGates({
        photoUrl: trainer.photoUrl,
        hasCategory: categories.has(filters.category),
        listedAtPublicStudio: listedStudios.length > 0,
        independent,
      })
    ) {
      return null;
    }

    const taught = studios.flatMap((studio) =>
      studio.batches.filter((batch) =>
        batch.trainers.some((row) => row.trainer.id === trainer.id),
      ),
    );
    if (filters.audience) {
      const matchesAudience =
        taught.length === 0 ||
        taught.some((batch) =>
          audienceMatches(batch.classAudience, filters.audience),
        );
      if (!matchesAudience) return null;
    }
    if (filters.level && !taught.some((batch) => batch.classLevel === filters.level)) {
      if (taught.length > 0) return null;
    }
    if (
      (filters.days || filters.time) &&
      taught.length > 0 &&
      !taught.some((batch) => scheduleMatchesFilters(batch.scheduleJson, filters))
    ) {
      return null;
    }

    const home = listedStudios[0];
    const located = home ? locateStudio(home) : { city: null, locality: null };
    if (!options?.ignoreCity && filters.city) {
      if (located.city) {
        if (located.city.id !== filters.city) return null;
      } else if (!independent || filters.city !== marketplaceFirstPaint().city) {
        return null;
      }
    }
    if (filters.locality) {
      const wanted = findLocalityById(filters.locality);
      if (!wanted || located.locality?.id !== wanted.id) return null;
    }

    const origin =
      filters.lat != null && filters.lng != null
        ? { lat: filters.lat, lng: filters.lng }
        : null;
    const distance = origin && home
      ? nearestDistanceKm(origin, home.branches)
      : null;
    if (filters.maxKm != null && origin) {
      if (distance == null || distance > filters.maxKm) return null;
    }

    const styles = uniqueCanonicalStyleNames([
      ...trainer.styles,
      ...taught.flatMap((batch) =>
        stylesFromDanceCategories(batch.danceCategories),
      ),
    ]);
    if (filters.style && !stylesMatchQuery(styles, filters.style)) return null;

    const name = trainerName(this.crypto, trainer);
    const search = searchRelevance(
      {
        names: [name],
        styles,
        related: [
          ...listedStudios.map((studio) => studio.name),
          located.locality?.label ?? "",
        ],
      },
      filters.q ?? "",
    );
    if (filters.q && !search.matched) return null;

    const next = taught
      .map((batch) => nextSession(batch, now))
      .filter((session): session is NonNullable<typeof session> =>
        Boolean(session),
      )
      .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())[0];
    const canTrial = taught.some((batch) => {
      const studio = studios.find((row) =>
        row.batches.some((item) => item.id === batch.id),
      );
      if (!studio) return false;
      return isTrialBookable({
        bookingTrial: settingsOf(studio).bookingTrial,
        hasFutureSession: Boolean(nextSession(batch, now)),
      });
    });
    const canPrivate = listedStudios.some(
      (studio) =>
        settingsOf(studio).bookingPrivate && studio.branches.length > 0,
    );
    const publicRatings = listedStudios.every((studio) =>
      settingsOf(studio).publicRatings,
    );
    const rating = ratingFromRows(
      trainer.marketplaceRatings,
      independent || publicRatings,
    );

    const card: MarketplaceTrainerCard = {
      id: trainer.id,
      slug: trainer.publicSlug,
      name,
      categories: [...categories].map((item) => parseMarketplaceCategory(item)),
      level: null,
      studioNames: listedStudios.map((studio) => studio.name),
      locality: located.locality?.label ?? null,
      city: located.city?.label ?? null,
      cityId: located.city?.id ?? null,
      distanceKm: distance == null ? null : roundDistanceKm(distance),
      nextClassAt: next?.startsAt.toISOString() ?? null,
      photoUrl: await this.media.signReadUrl(trainer.photoUrl),
      rating,
      canTrial,
      canPrivate,
    };

    return {
      card,
      sort: {
        bookable: canTrial || canPrivate,
        distanceKm: card.distanceKm,
        nextAt: next?.startsAt.getTime() ?? null,
        priceFrom: null,
        ratingAvg: rating.visible ? rating.avg : null,
        ratingCount: rating.visible ? rating.count : 0,
        popularity: popularity.trainer.get(trainer.id) ?? 0,
        name,
        searchScore: search.score,
      },
    };
  }

  private async loadSnapshot(
    category: PublicMarketplaceCategory,
  ): Promise<CatalogSnapshot> {
    if (
      this.snapshot &&
      this.snapshot.category === category &&
      Date.now() - this.snapshot.at < CATALOG_TTL_MS
    ) {
      return this.snapshot;
    }

    const horizon = new Date(
      Date.now() + 35 * 24 * 60 * 60 * 1000,
    );
    const popularitySince = new Date(
      Date.now() - POPULARITY_WINDOW_DAYS * 24 * 60 * 60 * 1000,
    );

    const [studios, independents, bookings] = await Promise.all([
      this.prisma.studio.findMany({
        where: { status: StudioStatus.ACTIVE },
        orderBy: { name: "asc" },
        select: {
          id: true,
          slug: true,
          name: true,
          address: true,
          heroDesktopUrl: true,
          heroMobileUrl: true,
          primaryCategory: true,
          settings: {
            select: {
              publicStudioListing: true,
              publicClasses: true,
              publicTrainers: true,
              publicRatings: true,
              bookingTrial: true,
              bookingEnrollment: true,
              bookingPrivate: true,
              bookingFloorHire: true,
            },
          },
          marketplaceCategories: { select: { category: true } },
          marketplaceRatings: {
            where: { category: category as MarketplaceCategory },
            select: { rating: true },
          },
          branches: {
            select: {
              id: true,
              name: true,
              address: true,
              latitude: true,
              longitude: true,
              coverMedia: { select: { objectKey: true } },
            },
          },
          batches: {
            where: { active: true },
            select: this.listBatchSelect(horizon),
          },
          trainerLinks: {
            select: { trainer: { select: this.trainerSelect(category) } },
          },
        },
      }),
      this.prisma.user.findMany({
        where: {
          role: UserRole.TRAINER,
          active: true,
          studioId: null,
          trainedStudios: { none: {} },
          trainerCategories: {
            some: { category: category as MarketplaceCategory },
          },
        },
        select: this.trainerSelect(category),
      }),
      this.prisma.booking.findMany({
        where: {
          status: { in: [BookingStatus.CONFIRMED, BookingStatus.COMPLETED] },
          startsAt: { gte: popularitySince },
        },
        select: { batchId: true, studioId: true, trainerId: true },
      }),
    ]);

    const popularity: Popularity = {
      batch: new Map(),
      studio: new Map(),
      trainer: new Map(),
    };
    for (const booking of bookings) {
      if (booking.batchId) {
        popularity.batch.set(
          booking.batchId,
          (popularity.batch.get(booking.batchId) ?? 0) + 1,
        );
      }
      popularity.studio.set(
        booking.studioId,
        (popularity.studio.get(booking.studioId) ?? 0) + 1,
      );
      if (booking.trainerId) {
        popularity.trainer.set(
          booking.trainerId,
          (popularity.trainer.get(booking.trainerId) ?? 0) + 1,
        );
      }
    }

    this.snapshot = {
      at: Date.now(),
      category,
      studios: studios as unknown as StudioRow[],
      independents: independents as unknown as TrainerPiiRow[],
      popularity,
    };
    return this.snapshot;
  }

  private listBatchSelect(horizon: Date) {
    return {
      id: true,
      name: true,
      slug: true,
      active: true,
      coverImageUrl: true,
      marketplaceCategory: true,
      classLevel: true,
      classAudience: true,
      category: true,
      danceCategories: true,
      scheduleJson: true,
      capacity: true,
      branchId: true,
      branch: {
        select: {
          id: true,
          name: true,
          address: true,
          latitude: true,
          longitude: true,
          coverMedia: { select: { objectKey: true } },
        },
      },
      summary: { select: { availableSeats: true } },
      plans: {
        select: {
          subscription: {
            select: { price: true, billingCadence: true, active: true },
          },
        },
      },
      trainers: {
        select: { trainer: { select: this.trainerSelect() } },
      },
      sessions: {
        where: {
          status: SessionStatus.SCHEDULED,
          startsAt: { gt: new Date(), lte: horizon },
        },
        orderBy: { startsAt: "asc" as const },
        take: 8,
        select: { id: true, startsAt: true, endsAt: true, status: true },
      },
    };
  }

  private detailBatchSelect() {
    return {
      ...this.listBatchSelect(
        new Date(Date.now() + 35 * 24 * 60 * 60 * 1000),
      ),
      sessions: {
        where: {
          status: SessionStatus.SCHEDULED,
          startsAt: { gt: new Date() },
        },
        orderBy: { startsAt: "asc" as const },
        take: 16,
        select: { id: true, startsAt: true, endsAt: true, status: true },
      },
      studio: {
        select: {
          id: true,
          slug: true,
          name: true,
          address: true,
          heroDesktopUrl: true,
          heroMobileUrl: true,
          primaryCategory: true,
          settings: {
            select: {
              publicStudioListing: true,
              publicClasses: true,
              publicTrainers: true,
              publicRatings: true,
              bookingTrial: true,
              bookingEnrollment: true,
              bookingPrivate: true,
              bookingFloorHire: true,
            },
          },
          marketplaceCategories: { select: { category: true } },
          marketplaceRatings: { select: { rating: true } },
          branches: {
            select: {
              id: true,
              name: true,
              address: true,
              latitude: true,
              longitude: true,
              coverMedia: { select: { objectKey: true } },
            },
          },
        },
      },
    };
  }

  private trainerSelect(category?: PublicMarketplaceCategory) {
    return {
      id: true,
      publicSlug: true,
      photoUrl: true,
      styles: true,
      active: true,
      studioId: true,
      trainerRatingAvg: true,
      trainerRatingCount: true,
      ...userPiiSelect,
      trainerCategories: { select: { category: true } },
      marketplaceRatings: {
        where: category
          ? { category: category as MarketplaceCategory }
          : undefined,
        select: { rating: true },
      },
    } as const;
  }
}
