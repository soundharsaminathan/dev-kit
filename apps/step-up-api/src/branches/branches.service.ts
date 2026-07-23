import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  BranchMediaCategory,
  BranchMediaKind,
  Prisma,
  UserRole,
} from "@prisma/client";
import { MediaService } from "../media/media.service";
import { PrismaService } from "../prisma/prisma.service";
import type { DecryptedUser } from "../users/user-crypto.service";
import { UserCryptoService } from "../users/user-crypto.service";

export const MAX_ACTIVE_IMAGES = 24;
export const MAX_ACTIVE_VIDEOS = 6;

const MEDIA_INCLUDE = {
  orderBy: { sortOrder: "asc" as const },
} as const;

const BRANCH_LIST_INCLUDE = {
  coverMedia: true,
  media: {
    where: { archivedAt: null },
    orderBy: { sortOrder: "asc" as const },
    take: 1,
  },
  _count: { select: { batches: true } },
} as const;

const BRANCH_DETAIL_INCLUDE = {
  coverMedia: true,
  media: {
    where: { archivedAt: null },
    ...MEDIA_INCLUDE,
  },
  faqs: { orderBy: { sortOrder: "asc" as const } },
  testimonials: { orderBy: { sortOrder: "asc" as const } },
  _count: { select: { batches: true } },
} as const;

type OpeningHoursDay = {
  day: number;
  closed?: boolean;
  open?: string;
  close?: string;
};

type OpeningHours = {
  timezone?: string;
  days?: OpeningHoursDay[];
  notes?: string;
};

@Injectable()
export class BranchesService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(MediaService) private readonly media: MediaService,
    @Inject(UserCryptoService) private readonly crypto: UserCryptoService,
  ) {}

  private assertStudioAccess(user: DecryptedUser, studioId: string) {
    if (user.studioId !== studioId) {
      throw new ForbiddenException(
        "You can only access branches for your studio",
      );
    }
  }

  private assertStaff(user: DecryptedUser) {
    if (user.role !== UserRole.OWNER && user.role !== UserRole.STAFF) {
      throw new ForbiddenException("Only studio staff can manage branches");
    }
  }

  private validateCoordinates(
    latitude?: number | null,
    longitude?: number | null,
  ) {
    const hasLat = latitude !== undefined && latitude !== null;
    const hasLng = longitude !== undefined && longitude !== null;

    if (hasLat !== hasLng) {
      throw new BadRequestException(
        "Latitude and longitude must be provided together",
      );
    }

    if (hasLat && (latitude! < -90 || latitude! > 90)) {
      throw new BadRequestException("Latitude must be between -90 and 90");
    }

    if (hasLng && (longitude! < -180 || longitude! > 180)) {
      throw new BadRequestException("Longitude must be between -180 and 180");
    }
  }

  private normalizeObjectKey(value: string) {
    const key = this.media.resolveObjectKey(value.trim()) ?? value.trim();
    if (!key) {
      throw new BadRequestException("Media object key is required");
    }
    return key;
  }

  private kindFromContentHint(kind?: BranchMediaKind, objectKey?: string) {
    if (kind) {
      return kind;
    }
    const lower = (objectKey ?? "").toLowerCase();
    if (/\.(mp4|webm)(\?|$)/.test(lower)) {
      return BranchMediaKind.VIDEO;
    }
    return BranchMediaKind.IMAGE;
  }

  private async assertMediaCaps(
    branchId: string,
    adding: { kind: BranchMediaKind }[],
    excludeIds: string[] = [],
  ) {
    const active = await this.prisma.branchMedia.findMany({
      where: {
        branchId,
        archivedAt: null,
        ...(excludeIds.length > 0 ? { id: { notIn: excludeIds } } : {}),
      },
      select: { kind: true },
    });

    let images = active.filter((m) => m.kind === BranchMediaKind.IMAGE).length;
    let videos = active.filter((m) => m.kind === BranchMediaKind.VIDEO).length;

    for (const item of adding) {
      if (item.kind === BranchMediaKind.IMAGE) {
        images += 1;
      } else if (item.kind === BranchMediaKind.VIDEO) {
        videos += 1;
      }
    }

    if (images > MAX_ACTIVE_IMAGES) {
      throw new BadRequestException(
        `A branch can have at most ${MAX_ACTIVE_IMAGES} active images`,
      );
    }
    if (videos > MAX_ACTIVE_VIDEOS) {
      throw new BadRequestException(
        `A branch can have at most ${MAX_ACTIVE_VIDEOS} active videos`,
      );
    }
  }

  private async presentMedia<
    T extends {
      id: string;
      objectKey: string;
      kind: BranchMediaKind;
      category: BranchMediaCategory;
      caption: string | null;
      altText: string | null;
      sortOrder: number;
      metadata: Prisma.JsonValue | null;
      archivedAt: Date | null;
      createdAt: Date;
      updatedAt: Date;
    },
  >(item: T) {
    return {
      id: item.id,
      kind: item.kind,
      category: item.category,
      objectKey: item.objectKey,
      url: (await this.media.signReadUrl(item.objectKey)) ?? item.objectKey,
      caption: item.caption,
      altText: item.altText,
      sortOrder: item.sortOrder,
      metadata: item.metadata,
      archivedAt: item.archivedAt,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  private async presentBranch<
    T extends {
      id: string;
      studioId: string;
      name: string;
      address: string;
      latitude: number | null;
      longitude: number | null;
      description: string | null;
      coverMediaId: string | null;
      amenities: string[];
      openingHours: Prisma.JsonValue | null;
      pricingBlurb: string | null;
      createdAt: Date;
      updatedAt: Date;
      coverMedia?: {
        id: string;
        objectKey: string;
        kind: BranchMediaKind;
        category: BranchMediaCategory;
        caption: string | null;
        altText: string | null;
        sortOrder: number;
        metadata: Prisma.JsonValue | null;
        archivedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
      } | null;
      media?: Array<{
        id: string;
        objectKey: string;
        kind: BranchMediaKind;
        category: BranchMediaCategory;
        caption: string | null;
        altText: string | null;
        sortOrder: number;
        metadata: Prisma.JsonValue | null;
        archivedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
      }>;
      faqs?: Array<{
        id: string;
        question: string;
        answer: string;
        sortOrder: number;
      }>;
      testimonials?: Array<{
        id: string;
        quote: string;
        authorName: string;
        rating: number | null;
        sortOrder: number;
      }>;
      _count?: { batches: number };
    },
  >(branch: T) {
    const media = branch.media
      ? await Promise.all(branch.media.map((item) => this.presentMedia(item)))
      : undefined;
    const coverMedia = branch.coverMedia
      ? await this.presentMedia(branch.coverMedia)
      : (media?.[0] ?? null);

    return {
      id: branch.id,
      studioId: branch.studioId,
      name: branch.name,
      address: branch.address,
      latitude: branch.latitude,
      longitude: branch.longitude,
      description: branch.description,
      coverMediaId: branch.coverMediaId ?? coverMedia?.id ?? null,
      coverMedia,
      amenities: branch.amenities,
      openingHours: branch.openingHours,
      pricingBlurb: branch.pricingBlurb,
      createdAt: branch.createdAt,
      updatedAt: branch.updatedAt,
      media,
      faqs: branch.faqs,
      testimonials: branch.testimonials,
      _count: branch._count,
    };
  }

  async listByStudio(studioId: string, user: DecryptedUser) {
    this.assertStudioAccess(user, studioId);
    const branches = await this.prisma.studioBranch.findMany({
      where: { studioId },
      orderBy: { name: "asc" },
      include: BRANCH_LIST_INCLUDE,
    });
    return Promise.all(branches.map((branch) => this.presentBranch(branch)));
  }

  async getById(id: string, user: DecryptedUser, includeArchived = false) {
    const branch = await this.prisma.studioBranch.findUnique({
      where: { id },
      include: {
        coverMedia: true,
        media: {
          where: includeArchived ? undefined : { archivedAt: null },
          ...MEDIA_INCLUDE,
        },
        faqs: { orderBy: { sortOrder: "asc" } },
        testimonials: { orderBy: { sortOrder: "asc" } },
        _count: { select: { batches: true } },
      },
    });

    if (!branch) {
      throw new NotFoundException("Branch not found");
    }

    this.assertStudioAccess(user, branch.studioId);
    return this.presentBranch(branch);
  }

  async getLanding(id: string, user: DecryptedUser) {
    const branch = await this.getById(id, user);

    const [batches, subscriptions] = await Promise.all([
      this.prisma.batch.findMany({
        where: { branchId: id, active: true },
        include: {
          trainers: { include: { trainer: true } },
          _count: { select: { enrollments: true } },
        },
        orderBy: { name: "asc" },
      }),
      this.prisma.subscription.findMany({
        where: { studioId: branch.studioId, active: true },
        orderBy: [{ kind: "asc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          kind: true,
          billingCadence: true,
          price: true,
          adultSeats: true,
          kidSeats: true,
        },
      }),
    ]);

    const trainerMap = new Map<
      string,
      {
        id: string;
        name: string;
        photoUrl: string | null;
        bio: string | null;
        styles: string[];
      }
    >();

    const presentedBatches = batches.map((batch) => {
      for (const row of batch.trainers) {
        const trainer = this.crypto.decryptUser(row.trainer);
        if (!trainerMap.has(trainer.id)) {
          trainerMap.set(trainer.id, {
            id: trainer.id,
            name: trainer.name,
            photoUrl: trainer.photoUrl,
            bio: trainer.bio,
            styles: trainer.styles,
          });
        }
      }

      return {
        id: batch.id,
        name: batch.name,
        category: batch.category,
        scheduleJson: batch.scheduleJson,
        coverImageUrl: batch.coverImageUrl,
        ratingAvg: batch.ratingAvg,
        ratingCount: batch.ratingCount,
        capacity: batch.capacity,
        enrollmentCount: batch._count.enrollments,
      };
    });

    const ratings = batches.filter((b) => b.ratingCount > 0);
    const ratingAvg =
      ratings.length > 0
        ? ratings.reduce(
            (sum, b) => sum + (b.ratingAvg ?? 0) * b.ratingCount,
            0,
          ) / ratings.reduce((sum, b) => sum + b.ratingCount, 0)
        : null;
    const ratingCount = ratings.reduce((sum, b) => sum + b.ratingCount, 0);

    return {
      ...branch,
      ratingAvg,
      ratingCount,
      batches: presentedBatches,
      subscriptions: subscriptions.map((subscription) => ({
        ...subscription,
        price: Number(subscription.price),
      })),
      trainers: [...trainerMap.values()],
    };
  }

  async create(
    user: DecryptedUser,
    data: {
      studioId: string;
      name: string;
      address: string;
      latitude?: number | null;
      longitude?: number | null;
      description?: string | null;
      amenities?: string[];
      openingHours?: OpeningHours | null;
      pricingBlurb?: string | null;
    },
  ) {
    this.assertStaff(user);
    this.assertStudioAccess(user, data.studioId);
    this.validateCoordinates(data.latitude, data.longitude);

    const name = data.name.trim();
    const address = data.address.trim();
    if (!name || !address) {
      throw new BadRequestException("Name and address are required");
    }
    if (data.latitude == null || data.longitude == null) {
      throw new BadRequestException("Place the branch on the map");
    }

    const branch = await this.prisma.studioBranch.create({
      data: {
        studioId: data.studioId,
        name,
        address,
        latitude: data.latitude,
        longitude: data.longitude,
        description: data.description?.trim() || null,
        amenities: data.amenities ?? [],
        openingHours:
          data.openingHours === undefined
            ? undefined
            : (data.openingHours as Prisma.InputJsonValue),
        pricingBlurb: data.pricingBlurb?.trim() || null,
      },
      include: BRANCH_DETAIL_INCLUDE,
    });
    return this.presentBranch(branch);
  }

  async update(
    id: string,
    user: DecryptedUser,
    data: {
      name?: string;
      address?: string;
      latitude?: number | null;
      longitude?: number | null;
      description?: string | null;
      amenities?: string[];
      openingHours?: OpeningHours | null;
      pricingBlurb?: string | null;
    },
  ) {
    this.assertStaff(user);
    const existing = await this.getById(id, user);
    this.validateCoordinates(
      data.latitude !== undefined ? data.latitude : existing.latitude,
      data.longitude !== undefined ? data.longitude : existing.longitude,
    );

    const name = data.name?.trim();
    const address = data.address?.trim();
    if (name !== undefined && !name) {
      throw new BadRequestException("Name is required");
    }
    if (address !== undefined && !address) {
      throw new BadRequestException("Address is required");
    }

    const branch = await this.prisma.studioBranch.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(address !== undefined ? { address } : {}),
        ...(data.latitude !== undefined ? { latitude: data.latitude } : {}),
        ...(data.longitude !== undefined ? { longitude: data.longitude } : {}),
        ...(data.description !== undefined
          ? { description: data.description?.trim() || null }
          : {}),
        ...(data.amenities !== undefined ? { amenities: data.amenities } : {}),
        ...(data.openingHours !== undefined
          ? {
              openingHours:
                data.openingHours === null
                  ? Prisma.DbNull
                  : (data.openingHours as Prisma.InputJsonValue),
            }
          : {}),
        ...(data.pricingBlurb !== undefined
          ? { pricingBlurb: data.pricingBlurb?.trim() || null }
          : {}),
      },
      include: BRANCH_DETAIL_INCLUDE,
    });
    return this.presentBranch(branch);
  }

  async remove(id: string, user: DecryptedUser) {
    this.assertStaff(user);
    const branch = await this.getById(id, user);
    if (branch._count && branch._count.batches > 0) {
      throw new ConflictException(
        "Cannot delete a branch that is used by one or more batches",
      );
    }

    return this.prisma.studioBranch.delete({ where: { id } });
  }

  async addMedia(
    branchId: string,
    user: DecryptedUser,
    items: Array<{
      objectKey: string;
      kind?: BranchMediaKind;
      category?: BranchMediaCategory;
      caption?: string | null;
      altText?: string | null;
    }>,
  ) {
    this.assertStaff(user);
    await this.getById(branchId, user);

    if (!items.length) {
      throw new BadRequestException("At least one media item is required");
    }

    const normalized = items.map((item) => {
      const objectKey = this.normalizeObjectKey(item.objectKey);
      return {
        objectKey,
        kind: this.kindFromContentHint(item.kind, objectKey),
        category: item.category ?? BranchMediaCategory.STUDIO,
        caption: item.caption?.trim() || null,
        altText: item.altText?.trim() || null,
      };
    });

    await this.assertMediaCaps(branchId, normalized);

    const maxOrder = await this.prisma.branchMedia.aggregate({
      where: { branchId },
      _max: { sortOrder: true },
    });
    let nextOrder = (maxOrder._max.sortOrder ?? -1) + 1;

    const created = await this.prisma.$transaction(async (tx) => {
      const rows = [];
      for (const item of normalized) {
        const row = await tx.branchMedia.create({
          data: {
            branchId,
            objectKey: item.objectKey,
            kind: item.kind,
            category: item.category,
            caption: item.caption,
            altText: item.altText,
            sortOrder: nextOrder++,
          },
        });
        rows.push(row);
      }

      const branch = await tx.studioBranch.findUnique({
        where: { id: branchId },
        select: { coverMediaId: true },
      });
      if (!branch?.coverMediaId) {
        const firstImage =
          rows.find((r) => r.kind === BranchMediaKind.IMAGE) ?? rows[0];
        if (firstImage) {
          await tx.studioBranch.update({
            where: { id: branchId },
            data: { coverMediaId: firstImage.id },
          });
        }
      }

      return rows;
    });

    return Promise.all(created.map((item) => this.presentMedia(item)));
  }

  async updateMedia(
    branchId: string,
    mediaId: string,
    user: DecryptedUser,
    data: {
      category?: BranchMediaCategory;
      caption?: string | null;
      altText?: string | null;
      archived?: boolean;
    },
  ) {
    this.assertStaff(user);
    await this.getById(branchId, user);

    const existing = await this.prisma.branchMedia.findFirst({
      where: { id: mediaId, branchId },
    });
    if (!existing) {
      throw new NotFoundException("Media not found");
    }

    if (data.archived === false && existing.archivedAt) {
      await this.assertMediaCaps(
        branchId,
        [{ kind: existing.kind }],
        [mediaId],
      );
    }

    const updated = await this.prisma.branchMedia.update({
      where: { id: mediaId },
      data: {
        ...(data.category !== undefined ? { category: data.category } : {}),
        ...(data.caption !== undefined
          ? { caption: data.caption?.trim() || null }
          : {}),
        ...(data.altText !== undefined
          ? { altText: data.altText?.trim() || null }
          : {}),
        ...(data.archived === true
          ? { archivedAt: new Date() }
          : data.archived === false
            ? { archivedAt: null }
            : {}),
      },
    });

    if (data.archived === true) {
      const branch = await this.prisma.studioBranch.findUnique({
        where: { id: branchId },
        select: { coverMediaId: true },
      });
      if (branch?.coverMediaId === mediaId) {
        const nextCover = await this.prisma.branchMedia.findFirst({
          where: {
            branchId,
            archivedAt: null,
            id: { not: mediaId },
            kind: BranchMediaKind.IMAGE,
          },
          orderBy: { sortOrder: "asc" },
        });
        await this.prisma.studioBranch.update({
          where: { id: branchId },
          data: { coverMediaId: nextCover?.id ?? null },
        });
      }
    }

    return this.presentMedia(updated);
  }

  async reorderMedia(
    branchId: string,
    user: DecryptedUser,
    orderedIds: string[],
  ) {
    this.assertStaff(user);
    await this.getById(branchId, user);

    const media = await this.prisma.branchMedia.findMany({
      where: { branchId, archivedAt: null },
      select: { id: true },
    });
    const activeIds = new Set(media.map((m) => m.id));
    if (
      orderedIds.length !== activeIds.size ||
      orderedIds.some((id) => !activeIds.has(id))
    ) {
      throw new BadRequestException(
        "Reorder payload must include every active media item exactly once",
      );
    }

    await this.prisma.$transaction(
      orderedIds.map((id, index) =>
        this.prisma.branchMedia.update({
          where: { id },
          data: { sortOrder: index },
        }),
      ),
    );

    return this.getById(branchId, user);
  }

  async setCover(branchId: string, user: DecryptedUser, mediaId: string) {
    this.assertStaff(user);
    await this.getById(branchId, user);

    const media = await this.prisma.branchMedia.findFirst({
      where: { id: mediaId, branchId, archivedAt: null },
    });
    if (!media) {
      throw new NotFoundException("Media not found");
    }
    if (media.kind !== BranchMediaKind.IMAGE) {
      throw new BadRequestException("Cover must be an image");
    }

    await this.prisma.studioBranch.update({
      where: { id: branchId },
      data: { coverMediaId: mediaId },
    });

    return this.getById(branchId, user);
  }

  async deleteMedia(branchId: string, mediaId: string, user: DecryptedUser) {
    this.assertStaff(user);
    await this.getById(branchId, user);

    const existing = await this.prisma.branchMedia.findFirst({
      where: { id: mediaId, branchId },
    });
    if (!existing) {
      throw new NotFoundException("Media not found");
    }

    const branch = await this.prisma.studioBranch.findUnique({
      where: { id: branchId },
      select: { coverMediaId: true },
    });

    await this.prisma.$transaction(async (tx) => {
      if (branch?.coverMediaId === mediaId) {
        await tx.studioBranch.update({
          where: { id: branchId },
          data: { coverMediaId: null },
        });
      }
      await tx.branchMedia.delete({ where: { id: mediaId } });

      if (branch?.coverMediaId === mediaId) {
        const nextCover = await tx.branchMedia.findFirst({
          where: {
            branchId,
            archivedAt: null,
            kind: BranchMediaKind.IMAGE,
          },
          orderBy: { sortOrder: "asc" },
        });
        if (nextCover) {
          await tx.studioBranch.update({
            where: { id: branchId },
            data: { coverMediaId: nextCover.id },
          });
        }
      }
    });

    return this.getById(branchId, user);
  }

  async replaceFaqs(
    branchId: string,
    user: DecryptedUser,
    faqs: Array<{ question: string; answer: string }>,
  ) {
    this.assertStaff(user);
    await this.getById(branchId, user);

    await this.prisma.$transaction(async (tx) => {
      await tx.branchFaq.deleteMany({ where: { branchId } });
      if (faqs.length > 0) {
        await tx.branchFaq.createMany({
          data: faqs.map((faq, index) => ({
            branchId,
            question: faq.question.trim(),
            answer: faq.answer.trim(),
            sortOrder: index,
          })),
        });
      }
    });

    return this.getById(branchId, user);
  }

  async replaceTestimonials(
    branchId: string,
    user: DecryptedUser,
    testimonials: Array<{
      quote: string;
      authorName: string;
      rating?: number | null;
    }>,
  ) {
    this.assertStaff(user);
    await this.getById(branchId, user);

    for (const item of testimonials) {
      if (
        item.rating != null &&
        (item.rating < 1 || item.rating > 5 || !Number.isInteger(item.rating))
      ) {
        throw new BadRequestException("Rating must be an integer from 1 to 5");
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.branchTestimonial.deleteMany({ where: { branchId } });
      if (testimonials.length > 0) {
        await tx.branchTestimonial.createMany({
          data: testimonials.map((item, index) => ({
            branchId,
            quote: item.quote.trim(),
            authorName: item.authorName.trim(),
            rating: item.rating ?? null,
            sortOrder: index,
          })),
        });
      }
    });

    return this.getById(branchId, user);
  }
}
