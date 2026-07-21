import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from "@nestjs/common";
import { BranchMediaKind, ProfileVisibility, UserRole } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DecryptedUser } from "../users/user-crypto.service";
import { BranchesService } from "./branches.service";

function makeUser(overrides: Partial<DecryptedUser> = {}): DecryptedUser {
  return {
    id: "owner-1",
    firebaseUid: "dev-owner-1",
    email: "owner@stepup.dev",
    name: "Owner",
    phone: null,
    role: UserRole.OWNER,
    bio: null,
    photoUrl: null,
    instagramUrl: null,
    styles: [],
    profileVisibility: ProfileVisibility.PRIVATE,
    studioId: "studio-1",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("BranchesService", () => {
  const prisma = {
    studioBranch: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    branchMedia: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      aggregate: vi.fn(),
    },
    batch: {
      findMany: vi.fn(),
    },
    branchFaq: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    branchTestimonial: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    $transaction: vi.fn(async (arg: unknown) => {
      if (typeof arg === "function") {
        return arg(prisma);
      }
      return Promise.all(arg as Promise<unknown>[]);
    }),
  };

  const media = {
    resolveObjectKey: vi.fn((value: string) => {
      const trimmed = value.trim();
      if (/^(avatars|posts|chat|batches|uploads)\//.test(trimmed)) {
        return trimmed;
      }
      return null;
    }),
    signReadUrl: vi.fn(
      async (value: string | null | undefined) => value ?? null,
    ),
    signReadUrls: vi.fn(async (values: string[]) => values),
  };

  const crypto = {
    decryptUser: vi.fn((user: { id: string; name: string }) => user),
  };

  let service: BranchesService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new BranchesService(
      prisma as never,
      media as never,
      crypto as never,
    );
  });

  it("rejects listing branches for another studio", async () => {
    await expect(
      service.listByStudio("studio-other", makeUser()),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("creates a branch for the user's studio", async () => {
    prisma.studioBranch.create.mockResolvedValue({
      id: "branch-1",
      studioId: "studio-1",
      name: "Main",
      address: "123 Main St",
      latitude: 12.97,
      longitude: 77.59,
      description: null,
      coverMediaId: null,
      amenities: [],
      openingHours: null,
      pricingBlurb: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      coverMedia: null,
      media: [],
      faqs: [],
      testimonials: [],
      _count: { batches: 0 },
    });

    const created = await service.create(makeUser(), {
      studioId: "studio-1",
      name: " Main ",
      address: " 123 Main St ",
      latitude: 12.97,
      longitude: 77.59,
    });

    expect(prisma.studioBranch.create).toHaveBeenCalledWith({
      data: {
        studioId: "studio-1",
        name: "Main",
        address: "123 Main St",
        latitude: 12.97,
        longitude: 77.59,
        description: null,
        amenities: [],
        openingHours: undefined,
        pricingBlurb: null,
      },
      include: expect.any(Object),
    });
    expect(created.id).toBe("branch-1");
  });

  it("rejects incomplete coordinates", async () => {
    await expect(
      service.create(makeUser(), {
        studioId: "studio-1",
        name: "Main",
        address: "123 Main St",
        latitude: 12.97,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("blocks deleting a branch still used by batches", async () => {
    prisma.studioBranch.findUnique.mockResolvedValue({
      id: "branch-1",
      studioId: "studio-1",
      name: "Main",
      address: "123 Main St",
      latitude: 12.97,
      longitude: 77.59,
      description: null,
      coverMediaId: null,
      amenities: [],
      openingHours: null,
      pricingBlurb: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      coverMedia: null,
      media: [],
      faqs: [],
      testimonials: [],
      _count: { batches: 2 },
    });

    await expect(service.remove("branch-1", makeUser())).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(prisma.studioBranch.delete).not.toHaveBeenCalled();
  });

  it("adds media and sets cover when missing", async () => {
    prisma.studioBranch.findUnique
      .mockResolvedValueOnce({
        id: "branch-1",
        studioId: "studio-1",
        name: "Main",
        address: "123 Main St",
        latitude: 12.97,
        longitude: 77.59,
        description: null,
        coverMediaId: null,
        amenities: [],
        openingHours: null,
        pricingBlurb: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        coverMedia: null,
        media: [],
        faqs: [],
        testimonials: [],
        _count: { batches: 0 },
      })
      .mockResolvedValueOnce({ coverMediaId: null });

    prisma.branchMedia.findMany.mockResolvedValue([]);
    prisma.branchMedia.aggregate.mockResolvedValue({
      _max: { sortOrder: -1 },
    });
    prisma.branchMedia.create.mockResolvedValue({
      id: "media-1",
      branchId: "branch-1",
      kind: BranchMediaKind.IMAGE,
      category: "STUDIO",
      objectKey: "uploads/a.jpg",
      caption: null,
      altText: null,
      sortOrder: 0,
      metadata: null,
      archivedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    prisma.studioBranch.update.mockResolvedValue({});

    const result = await service.addMedia("branch-1", makeUser(), [
      { objectKey: "uploads/a.jpg", kind: BranchMediaKind.IMAGE },
    ]);

    expect(result).toHaveLength(1);
    expect(prisma.studioBranch.update).toHaveBeenCalledWith({
      where: { id: "branch-1" },
      data: { coverMediaId: "media-1" },
    });
  });

  it("rejects reordering with incomplete ids", async () => {
    prisma.studioBranch.findUnique.mockResolvedValue({
      id: "branch-1",
      studioId: "studio-1",
      name: "Main",
      address: "123 Main St",
      latitude: 12.97,
      longitude: 77.59,
      description: null,
      coverMediaId: null,
      amenities: [],
      openingHours: null,
      pricingBlurb: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      coverMedia: null,
      media: [],
      faqs: [],
      testimonials: [],
      _count: { batches: 0 },
    });
    prisma.branchMedia.findMany.mockResolvedValue([{ id: "a" }, { id: "b" }]);

    await expect(
      service.reorderMedia("branch-1", makeUser(), ["a"]),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
