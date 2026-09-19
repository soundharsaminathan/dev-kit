import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import {
  type BatchCategory,
  type BillingCadence,
  SessionStatus,
  StudioStatus,
  UserRole,
} from "@prisma/client";
import { MediaService } from "../media/media.service";
import { PrismaService } from "../prisma/prisma.service";
import { isTestStudio } from "../studios/test-studio";
import { UserCryptoService, userPiiSelect } from "../users/user-crypto.service";
import {
  categoriesFromEntries,
  type DanceCategoryEntry,
  DISCOVER_CATEGORIES,
  type DiscoverCategoryId,
  danceCategoryEntries,
  isValidCategoryId,
  resolveStyleEntry,
  stylesFromDanceCategories,
} from "./discover.categories";
import {
  DISCOVER_CITIES,
  findCityById,
  isLiveCity,
  matchCityFromAddress,
} from "./discover.cities";
import { nearestDistanceKm, roundDistanceKm } from "./discover.geo";
import {
  CHENNAI_LOCALITIES,
  findLocalityById,
  matchLocality,
  stylesMatchQuery,
} from "./discover.localities";
import {
  batchScheduleLabel,
  batchTimingLabel,
  dayBandsFromSchedule,
  timeBandsFromSchedule,
} from "./discover.schedule";

export type DiscoverStudioFilters = {
  q?: string;
  city?: string;
  category?: string;
  style?: string;
  locality?: string;
  audience?: "KIDS" | "ADULTS";
  days?: "weekday" | "weekend";
  time?: "morning" | "evening";
  lat?: number;
  lng?: number;
  maxKm?: number;
  maxPrice?: number;
  limit?: number;
};

export type DiscoverStudioCard = {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  cityId: string | null;
  locality: string | null;
  localityId: string | null;
  styles: string[];
  categories: DiscoverCategoryId[];
  imageUrl: string | null;
  ratingAvg: number | null;
  ratingCount: number;
  distanceKm: number | null;
  batchCount: number;
  timingLabel: string | null;
  priceFrom: number | null;
  priceCadence: BillingCadence | null;
};

export type DiscoverBatchTrainer = {
  id: string;
  name: string;
  photoUrl: string | null;
};

export type DiscoverBatchSummary = {
  id: string;
  name: string;
  category: BatchCategory;
  styles: string[];
  scheduleLabel: string | null;
  timingLabel: string | null;
  ratingAvg: number | null;
  ratingCount: number;
  priceFrom: number | null;
  priceCadence: BillingCadence | null;
  coverImageUrl: string | null;
  trainers: DiscoverBatchTrainer[];
};

export type DiscoverTrainer = {
  id: string;
  name: string;
  photoUrl: string | null;
  bio: string | null;
  styles: string[];
  instagramUrl: string | null;
};

export type DiscoverGalleryItem = {
  url: string;
  caption: string | null;
};

export type DiscoverBranchVisit = {
  id: string;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  amenities: string[];
  openingHours: unknown;
  pricingBlurb: string | null;
  description: string | null;
  coverUrl: string | null;
};

export type DiscoverFaq = {
  id: string;
  question: string;
  answer: string;
  sortOrder: number;
};

export type DiscoverTestimonial = {
  id: string;
  quote: string;
  authorName: string;
  rating: number | null;
  sortOrder: number;
};

export type DiscoverTrialSlot = {
  sessionId: string;
  batchId: string;
  batchName: string;
  audience: BatchCategory;
  styleBadge: string | null;
  startsAt: string;
  endsAt: string;
};

export type DiscoverStudioDetail = DiscoverStudioCard & {
  address: string | null;
  contact: string | null;
  logoUrl: string | null;
  heroDesktopUrl: string | null;
  heroMobileUrl: string | null;
  tagline: string | null;
  about: string | null;
  foundedYear: number | null;
  email: string | null;
  whatsapp: string | null;
  instagramUrl: string | null;
  youtubeUrl: string | null;
  websiteUrl: string | null;
  whatToBring: string | null;
  trialBlurb: string | null;
  photos: string[];
  trainers: DiscoverTrainer[];
  branches: DiscoverBranchVisit[];
  gallery: DiscoverGalleryItem[];
  faqs: DiscoverFaq[];
  testimonials: DiscoverTestimonial[];
  batches: DiscoverBatchSummary[];
  nextTrialSlot: DiscoverTrialSlot | null;
};

type StudioRow = {
  id: string;
  slug: string;
  name: string;
  address: string | null;
  contact: string | null;
  logoUrl: string | null;
  heroMobileUrl: string | null;
  heroDesktopUrl: string | null;
  photos: string[];
  branches: Array<{
    address: string;
    latitude: number | null;
    longitude: number | null;
    coverMedia: { objectKey: string } | null;
    media: Array<{ objectKey: string }>;
  }>;
  batches: Array<{
    id: string;
    name: string;
    category: BatchCategory;
    danceCategories: unknown;
    scheduleJson: unknown;
    active: boolean;
    ratingAvg: number | null;
    ratingCount: number;
    coverImageUrl: string | null;
    plans: Array<{
      subscription: {
        price: { toString(): string } | number;
        billingCadence: BillingCadence;
        active: boolean;
      };
    }>;
  }>;
};

const DEFAULT_LIMIT = 24;
const MAX_LIMIT = 48;
const CATALOG_TTL_MS = 30_000;
const TRIAL_HORIZON_DAYS = 35;

function priceNumber(value: { toString(): string } | number): number {
  return typeof value === "number" ? value : Number(value.toString());
}

function minActivePlan(plans: StudioRow["batches"][number]["plans"]): {
  price: number;
  cadence: BillingCadence;
} | null {
  let best: { price: number; cadence: BillingCadence } | null = null;
  for (const plan of plans) {
    if (!plan.subscription.active) continue;
    const price = priceNumber(plan.subscription.price);
    if (!Number.isFinite(price)) continue;
    if (!best || price < best.price) {
      best = { price, cadence: plan.subscription.billingCadence };
    }
  }
  return best;
}

function weightedRating(
  batches: Array<{ ratingAvg: number | null; ratingCount: number }>,
): { avg: number | null; count: number } {
  let weighted = 0;
  let count = 0;
  for (const batch of batches) {
    if (batch.ratingCount <= 0 || batch.ratingAvg == null) continue;
    weighted += batch.ratingAvg * batch.ratingCount;
    count += batch.ratingCount;
  }
  if (count === 0) return { avg: null, count: 0 };
  return { avg: Math.round((weighted / count) * 10) / 10, count };
}

function studioStyleEntries(
  batches: StudioRow["batches"],
): DanceCategoryEntry[] {
  const entries: DanceCategoryEntry[] = [];
  for (const batch of batches) {
    entries.push(...danceCategoryEntries(batch.danceCategories));
  }
  return entries;
}

function uniqueStyleNames(entries: DanceCategoryEntry[]): string[] {
  const seen = new Set<string>();
  const styles: string[] = [];
  for (const entry of entries) {
    const key = entry.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    styles.push(entry.name);
  }
  return styles;
}

function studioStyles(batches: StudioRow["batches"]): string[] {
  return uniqueStyleNames(studioStyleEntries(batches));
}

function studioCategories(batches: StudioRow["batches"]): DiscoverCategoryId[] {
  return categoriesFromEntries(studioStyleEntries(batches));
}

function studioTiming(batches: StudioRow["batches"]): {
  morning: boolean;
  evening: boolean;
  weekday: boolean;
  weekend: boolean;
} {
  let morning = false;
  let evening = false;
  let weekday = false;
  let weekend = false;
  for (const batch of batches) {
    const time = timeBandsFromSchedule(batch.scheduleJson);
    const days = dayBandsFromSchedule(batch.scheduleJson);
    morning ||= time.morning;
    evening ||= time.evening;
    weekday ||= days.weekday;
    weekend ||= days.weekend;
  }
  return { morning, evening, weekday, weekend };
}

function studioMinPrice(batches: StudioRow["batches"]): {
  price: number;
  cadence: BillingCadence;
} | null {
  let best: { price: number; cadence: BillingCadence } | null = null;
  for (const batch of batches) {
    const plan = minActivePlan(batch.plans);
    if (!plan) continue;
    if (!best || plan.price < best.price) best = plan;
  }
  return best;
}

function studioLocality(studio: StudioRow) {
  const firstPoint = studio.branches.find(
    (branch) => branch.latitude != null && branch.longitude != null,
  );
  return matchLocality({
    addresses: [
      studio.address,
      ...studio.branches.map((branch) => branch.address),
    ],
    latitude: firstPoint?.latitude ?? null,
    longitude: firstPoint?.longitude ?? null,
  });
}

function pickImageKey(studio: StudioRow): string | null {
  return (
    studio.heroDesktopUrl ||
    studio.heroMobileUrl ||
    studio.logoUrl ||
    studio.branches[0]?.coverMedia?.objectKey ||
    studio.branches[0]?.media[0]?.objectKey ||
    studio.batches.find((batch) => batch.coverImageUrl)?.coverImageUrl ||
    studio.photos[0] ||
    null
  );
}

function matchesText(studio: StudioRow, styles: string[], q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  if (studio.name.toLowerCase().includes(needle)) return true;
  if (studio.address?.toLowerCase().includes(needle)) return true;
  if (styles.some((style) => style.toLowerCase().includes(needle))) return true;
  for (const batch of studio.batches) {
    if (batch.name.toLowerCase().includes(needle)) return true;
  }
  return false;
}

@Injectable()
export class DiscoverService {
  private catalog: { at: number; rows: StudioRow[] } | null = null;

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(MediaService) private readonly media: MediaService,
    @Inject(UserCryptoService) private readonly crypto: UserCryptoService,
  ) {}

  private async loadActiveStudios(): Promise<StudioRow[]> {
    if (this.catalog && Date.now() - this.catalog.at < CATALOG_TTL_MS) {
      return this.catalog.rows;
    }

    const studios = await this.prisma.studio.findMany({
      where: { status: StudioStatus.ACTIVE },
      orderBy: { name: "asc" },
      select: {
        id: true,
        slug: true,
        name: true,
        address: true,
        contact: true,
        logoUrl: true,
        heroMobileUrl: true,
        heroDesktopUrl: true,
        photos: true,
        branches: {
          select: {
            address: true,
            latitude: true,
            longitude: true,
            coverMedia: { select: { objectKey: true } },
            media: {
              where: { archivedAt: null },
              orderBy: { sortOrder: "asc" },
              take: 1,
              select: { objectKey: true },
            },
          },
        },
        batches: {
          where: { active: true },
          select: {
            id: true,
            name: true,
            category: true,
            danceCategories: true,
            scheduleJson: true,
            active: true,
            ratingAvg: true,
            ratingCount: true,
            coverImageUrl: true,
            plans: {
              select: {
                subscription: {
                  select: {
                    price: true,
                    billingCadence: true,
                    active: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const rows = studios.filter((studio) => !isTestStudio(studio));
    this.catalog = { at: Date.now(), rows };
    return rows;
  }

  private async toCard(
    studio: StudioRow,
    origin?: { lat: number; lng: number },
  ): Promise<DiscoverStudioCard> {
    const activeBatches = studio.batches.filter((batch) => batch.active);
    const styles = studioStyles(activeBatches);
    const categories = studioCategories(activeBatches);
    const city = matchCityFromAddress(
      studio.address,
      ...studio.branches.map((branch) => branch.address),
    );
    const locality = studioLocality(studio);
    const rating = weightedRating(activeBatches);
    const timing = studioTiming(activeBatches);
    const price = studioMinPrice(activeBatches);
    const imageKey = pickImageKey(studio);
    const distance =
      origin != null ? nearestDistanceKm(origin, studio.branches) : null;

    return {
      id: studio.id,
      slug: studio.slug,
      name: studio.name,
      city: city?.label ?? null,
      cityId: city?.id ?? null,
      locality: locality?.label ?? null,
      localityId: locality?.id ?? null,
      styles,
      categories,
      imageUrl: await this.media.signReadUrl(imageKey),
      ratingAvg: rating.avg,
      ratingCount: rating.count,
      distanceKm: distance == null ? null : roundDistanceKm(distance),
      batchCount: activeBatches.length,
      timingLabel: batchTimingLabel(timing),
      priceFrom: price?.price ?? null,
      priceCadence: price?.cadence ?? null,
    };
  }

  private filterStudios(
    studios: StudioRow[],
    filters: DiscoverStudioFilters,
  ): StudioRow[] {
    const origin =
      filters.lat != null && filters.lng != null
        ? { lat: filters.lat, lng: filters.lng }
        : undefined;
    const cityFilter = filters.city ? findCityById(filters.city) : null;
    if (filters.city && !cityFilter) {
      return [];
    }
    const categoryFilter =
      filters.category && isValidCategoryId(filters.category)
        ? filters.category
        : null;
    const localityFilter = filters.locality
      ? findLocalityById(filters.locality)
      : null;
    if (filters.locality && !localityFilter) {
      return [];
    }

    return studios.filter((studio) => {
      const activeBatches = studio.batches.filter((batch) => batch.active);
      const styles = studioStyles(activeBatches);
      const categories = studioCategories(activeBatches);
      const city = matchCityFromAddress(
        studio.address,
        ...studio.branches.map((branch) => branch.address),
      );
      const locality = studioLocality(studio);
      const timing = studioTiming(activeBatches);
      const price = studioMinPrice(activeBatches);

      if (filters.q && !matchesText(studio, styles, filters.q)) return false;
      if (filters.style && !stylesMatchQuery(styles, filters.style)) {
        return false;
      }
      if (cityFilter && city?.id !== cityFilter.id) return false;
      if (localityFilter && locality?.id !== localityFilter.id) return false;
      if (categoryFilter && !categories.includes(categoryFilter)) return false;
      if (filters.audience) {
        const hasAudience = activeBatches.some(
          (batch) => batch.category === filters.audience,
        );
        if (!hasAudience) return false;
      }
      if (filters.days === "weekday" && !timing.weekday) return false;
      if (filters.days === "weekend" && !timing.weekend) return false;
      if (filters.time === "morning" && !timing.morning) return false;
      if (filters.time === "evening" && !timing.evening) return false;
      if (filters.maxPrice != null) {
        if (price == null || price.price > filters.maxPrice) return false;
      }
      if (origin && filters.maxKm != null) {
        const distance = nearestDistanceKm(origin, studio.branches);
        if (distance == null || distance > filters.maxKm) return false;
      }
      return true;
    });
  }

  async listStudios(
    filters: DiscoverStudioFilters = {},
  ): Promise<DiscoverStudioCard[]> {
    const studios = await this.loadActiveStudios();
    const filtered = this.filterStudios(studios, filters);
    const origin =
      filters.lat != null && filters.lng != null
        ? { lat: filters.lat, lng: filters.lng }
        : undefined;

    let cards = await Promise.all(
      filtered.map((studio) => this.toCard(studio, origin)),
    );

    if (origin) {
      cards = cards.sort((a, b) => {
        if (a.distanceKm == null && b.distanceKm == null) {
          return a.name.localeCompare(b.name);
        }
        if (a.distanceKm == null) return 1;
        if (b.distanceKm == null) return -1;
        return a.distanceKm - b.distanceKm;
      });
    }

    const limit = Math.min(
      Math.max(filters.limit ?? DEFAULT_LIMIT, 1),
      MAX_LIMIT,
    );
    return cards.slice(0, limit);
  }

  async getStudio(idOrSlug: string): Promise<DiscoverStudioDetail> {
    const studio = await this.prisma.studio.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
        status: StudioStatus.ACTIVE,
      },
      select: {
        id: true,
        slug: true,
        name: true,
        address: true,
        contact: true,
        logoUrl: true,
        heroMobileUrl: true,
        heroDesktopUrl: true,
        photos: true,
        tagline: true,
        about: true,
        foundedYear: true,
        email: true,
        whatsapp: true,
        instagramUrl: true,
        youtubeUrl: true,
        websiteUrl: true,
        whatToBring: true,
        trialBlurb: true,
        branches: {
          orderBy: { name: "asc" },
          select: {
            id: true,
            name: true,
            address: true,
            latitude: true,
            longitude: true,
            amenities: true,
            openingHours: true,
            pricingBlurb: true,
            description: true,
            coverMedia: { select: { objectKey: true } },
            media: {
              where: { archivedAt: null },
              orderBy: { sortOrder: "asc" },
              take: 8,
              select: { objectKey: true, caption: true },
            },
            faqs: {
              orderBy: { sortOrder: "asc" },
              take: 8,
              select: {
                id: true,
                question: true,
                answer: true,
                sortOrder: true,
              },
            },
            testimonials: {
              orderBy: { sortOrder: "asc" },
              take: 8,
              select: {
                id: true,
                quote: true,
                authorName: true,
                rating: true,
                sortOrder: true,
              },
            },
          },
        },
        batches: {
          where: { active: true },
          select: {
            id: true,
            name: true,
            category: true,
            danceCategories: true,
            scheduleJson: true,
            active: true,
            ratingAvg: true,
            ratingCount: true,
            coverImageUrl: true,
            plans: {
              select: {
                subscription: {
                  select: {
                    price: true,
                    billingCadence: true,
                    active: true,
                  },
                },
              },
            },
            trainers: {
              orderBy: { sortOrder: "asc" },
              select: {
                trainer: {
                  select: {
                    id: true,
                    photoUrl: true,
                    styles: true,
                    active: true,
                    ...userPiiSelect,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!studio || isTestStudio(studio)) {
      throw new NotFoundException("Studio not found");
    }

    const card = await this.toCard({
      id: studio.id,
      slug: studio.slug,
      name: studio.name,
      address: studio.address,
      contact: studio.contact,
      logoUrl: studio.logoUrl,
      heroMobileUrl: studio.heroMobileUrl,
      heroDesktopUrl: studio.heroDesktopUrl,
      photos: studio.photos,
      branches: studio.branches.map((branch) => ({
        address: branch.address,
        latitude: branch.latitude,
        longitude: branch.longitude,
        coverMedia: branch.coverMedia,
        media: branch.media.map((item) => ({ objectKey: item.objectKey })),
      })),
      batches: studio.batches,
    });

    const trainerMap = new Map<string, DiscoverTrainer>();
    const batches: DiscoverBatchSummary[] = await Promise.all(
      studio.batches.map(async (batch) => {
        const styles = stylesFromDanceCategories(batch.danceCategories);
        const timing = timeBandsFromSchedule(batch.scheduleJson);
        const plan = minActivePlan(batch.plans);
        const ratingCount = batch.ratingCount;
        const batchTrainers: DiscoverBatchTrainer[] = [];

        for (const row of batch.trainers) {
          if (!row.trainer.active) continue;
          const trainer = this.crypto.decryptUser(row.trainer);
          const publicTrainer = toPublicTrainer(trainer);
          if (!trainerMap.has(publicTrainer.id)) {
            trainerMap.set(publicTrainer.id, publicTrainer);
          }
          batchTrainers.push({
            id: publicTrainer.id,
            name: publicTrainer.name,
            photoUrl: publicTrainer.photoUrl,
          });
        }

        return {
          id: batch.id,
          name: batch.name,
          category: batch.category,
          styles,
          scheduleLabel: batchScheduleLabel(batch.scheduleJson),
          timingLabel: batchTimingLabel(timing),
          ratingAvg:
            ratingCount > 0 && batch.ratingAvg != null ? batch.ratingAvg : null,
          ratingCount,
          priceFrom: plan?.price ?? null,
          priceCadence: plan?.cadence ?? null,
          coverImageUrl: await this.media.signReadUrl(batch.coverImageUrl),
          trainers: await Promise.all(
            batchTrainers.map(async (trainer) => ({
              ...trainer,
              photoUrl: await this.media.signReadUrl(trainer.photoUrl),
            })),
          ),
        };
      }),
    );

    const trainers = await Promise.all(
      [...trainerMap.values()].map(async (trainer) => ({
        ...trainer,
        photoUrl: await this.media.signReadUrl(trainer.photoUrl),
      })),
    );

    const photos = await this.media.signReadUrls(studio.photos);
    const gallery: DiscoverGalleryItem[] = [
      ...photos.map((url) => ({ url, caption: null })),
    ];
    for (const branch of studio.branches) {
      for (const item of branch.media) {
        const url = await this.media.signReadUrl(item.objectKey);
        if (url) gallery.push({ url, caption: item.caption });
      }
    }

    const branches: DiscoverBranchVisit[] = await Promise.all(
      studio.branches.map(async (branch) => ({
        id: branch.id,
        name: branch.name,
        address: branch.address,
        latitude: branch.latitude,
        longitude: branch.longitude,
        amenities: branch.amenities,
        openingHours: branch.openingHours,
        pricingBlurb: branch.pricingBlurb,
        description: branch.description,
        coverUrl: await this.media.signReadUrl(
          branch.coverMedia?.objectKey ?? branch.media[0]?.objectKey ?? null,
        ),
      })),
    );

    const faqs = studio.branches.flatMap((branch) => branch.faqs).slice(0, 12);
    const testimonials = studio.branches
      .flatMap((branch) => branch.testimonials)
      .slice(0, 12);

    const nextTrialSlot = await this.nextPublicTrialSlot(studio.id);

    return {
      ...card,
      address: studio.address,
      contact: studio.contact,
      logoUrl: await this.media.signReadUrl(studio.logoUrl),
      heroDesktopUrl: await this.media.signReadUrl(studio.heroDesktopUrl),
      heroMobileUrl: await this.media.signReadUrl(studio.heroMobileUrl),
      tagline: studio.tagline,
      about: studio.about,
      foundedYear: studio.foundedYear,
      email: studio.email,
      whatsapp: studio.whatsapp,
      instagramUrl: studio.instagramUrl,
      youtubeUrl: studio.youtubeUrl,
      websiteUrl: studio.websiteUrl,
      whatToBring: studio.whatToBring,
      trialBlurb: studio.trialBlurb,
      photos,
      trainers,
      branches,
      gallery: gallery.slice(0, 12),
      faqs,
      testimonials,
      batches,
      nextTrialSlot,
    };
  }

  async listCities() {
    const studios = await this.loadActiveStudios();
    const counts = new Map<string, number>();

    for (const studio of studios) {
      const city = matchCityFromAddress(
        studio.address,
        ...studio.branches.map((branch) => branch.address),
      );
      if (!city) continue;
      counts.set(city.id, (counts.get(city.id) ?? 0) + 1);
    }

    return DISCOVER_CITIES.map((city) => ({
      id: city.id,
      label: city.label,
      studioCount: counts.get(city.id) ?? 0,
    }));
  }

  async listCategories() {
    const studios = await this.loadActiveStudios();
    const counts = new Map<DiscoverCategoryId, number>();

    for (const studio of studios) {
      const categories = studioCategories(
        studio.batches.filter((b) => b.active),
      );
      for (const category of categories) {
        counts.set(category, (counts.get(category) ?? 0) + 1);
      }
    }

    return DISCOVER_CATEGORIES.map((category) => ({
      id: category.id,
      label: category.label,
      studioCount: counts.get(category.id) ?? 0,
    }));
  }

  async getStats() {
    const studios = await this.loadActiveStudios();
    const studioIds = studios.map((studio) => studio.id);
    const classes = studios.reduce(
      (sum, studio) =>
        sum + studio.batches.filter((batch) => batch.active).length,
      0,
    );

    let learners = 0;
    if (studioIds.length > 0) {
      learners = await this.prisma.user.count({
        where: {
          studioId: { in: studioIds },
          role: { in: [UserRole.STUDENT, UserRole.PARENT] },
          active: true,
        },
      });
    }

    return {
      studios: studios.length,
      classes,
      learners,
    };
  }

  async listLanding(cityId = "chennai") {
    const city = findCityById(cityId) ?? findCityById("chennai");
    const resolvedCityId = city?.id ?? "chennai";
    const available = isLiveCity(resolvedCityId);
    const studios = available
      ? await this.listStudios({
          city: resolvedCityId,
          category: "dance",
          limit: 8,
        })
      : [];
    const catalog = await this.loadActiveStudios();
    const styleCounts = new Map<string, { label: string; count: number }>();
    const areaCounts = new Map<string, number>();

    for (const studio of catalog) {
      const studioCity = matchCityFromAddress(
        studio.address,
        ...studio.branches.map((branch) => branch.address),
      );
      if (studioCity?.id !== resolvedCityId) continue;
      const styleEntries = studioStyleEntries(
        studio.batches.filter((batch) => batch.active),
      );
      const styles = uniqueStyleNames(styleEntries);
      const categories = categoriesFromEntries(styleEntries);
      if (!categories.includes("dance")) continue;
      for (const style of styles) {
        if (resolveStyleEntry({ name: style }).categoryId === "dance") {
          const key = style.toLowerCase();
          const current = styleCounts.get(key);
          if (current) current.count += 1;
          else styleCounts.set(key, { label: style, count: 1 });
        }
      }
      const locality = studioLocality(studio);
      if (locality) {
        areaCounts.set(locality.id, (areaCounts.get(locality.id) ?? 0) + 1);
      }
    }

    const citiesWithCounts = await this.listCities();
    const cityCountById = new Map(
      citiesWithCounts.map((item) => [item.id, item.studioCount]),
    );

    return {
      city: {
        id: resolvedCityId,
        label: city?.label ?? "Chennai",
        available,
      },
      cities: DISCOVER_CITIES.map((item) => ({
        id: item.id,
        label: item.label,
        studioCount: cityCountById.get(item.id) ?? 0,
        available: isLiveCity(item.id),
      })),
      styles: [...styleCounts.values()]
        .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
        .map((item) => ({
          id: item.label.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          label: item.label,
          studioCount: item.count,
        })),
      areas:
        resolvedCityId === "chennai"
          ? CHENNAI_LOCALITIES.filter(
              (locality) =>
                locality.popular || (areaCounts.get(locality.id) ?? 0) > 0,
            ).map((locality) => ({
              id: locality.id,
              label: locality.label,
              studioCount: areaCounts.get(locality.id) ?? 0,
              popular: Boolean(locality.popular),
            }))
          : [],
      studios,
    };
  }

  async listPublicTrialSlots(idOrSlug: string) {
    const studio = await this.prisma.studio.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
        status: StudioStatus.ACTIVE,
      },
      select: { id: true, slug: true, name: true },
    });
    if (!studio || isTestStudio(studio)) {
      throw new NotFoundException("Studio not found");
    }

    return this.loadPublicTrialSlots(studio.id, 24);
  }

  private async nextPublicTrialSlot(
    studioId: string,
  ): Promise<DiscoverTrialSlot | null> {
    const slots = await this.loadPublicTrialSlots(studioId, 1);
    return slots[0] ?? null;
  }

  private async loadPublicTrialSlots(
    studioId: string,
    take: number,
  ): Promise<DiscoverTrialSlot[]> {
    const now = new Date();
    const horizon = new Date(
      now.getTime() + TRIAL_HORIZON_DAYS * 24 * 60 * 60 * 1000,
    );
    const sessions = await this.prisma.session.findMany({
      where: {
        status: SessionStatus.SCHEDULED,
        startsAt: { gte: now, lte: horizon },
        batch: { studioId, active: true },
      },
      orderBy: { startsAt: "asc" },
      take,
      select: {
        id: true,
        batchId: true,
        startsAt: true,
        endsAt: true,
        batch: {
          select: {
            name: true,
            category: true,
            danceCategories: true,
          },
        },
      },
    });

    return sessions.map((session) => ({
      sessionId: session.id,
      batchId: session.batchId,
      batchName: session.batch.name,
      audience: session.batch.category,
      styleBadge: firstStyleName(session.batch.danceCategories),
      startsAt: session.startsAt.toISOString(),
      endsAt: session.endsAt.toISOString(),
    }));
  }
}

function toPublicTrainer(user: {
  id: string;
  name: string;
  photoUrl?: string | null;
  bio?: string | null;
  styles: string[];
  instagramUrl?: string | null;
}): DiscoverTrainer {
  return {
    id: user.id,
    name: user.name,
    photoUrl: user.photoUrl ?? null,
    bio: user.bio ?? null,
    styles: user.styles,
    instagramUrl: user.instagramUrl ?? null,
  };
}

function firstStyleName(danceCategories: unknown): string | null {
  const styles = stylesFromDanceCategories(danceCategories);
  return styles[0] ?? null;
}
