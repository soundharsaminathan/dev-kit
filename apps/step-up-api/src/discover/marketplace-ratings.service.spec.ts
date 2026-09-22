import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { UserRole } from "../generated/prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MarketplaceRatingsService } from "./marketplace-ratings.service";

const student = {
  id: "student-1",
  role: UserRole.STUDENT,
} as const;

describe("MarketplaceRatingsService", () => {
  const prisma = {
    parentChild: { findMany: vi.fn() },
    attendance: { findMany: vi.fn() },
    booking: { findMany: vi.fn() },
    marketplaceRating: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      aggregate: vi.fn(),
    },
    studio: { update: vi.fn() },
    user: { findUnique: vi.fn(), update: vi.fn() },
  };
  const crypto = {
    decryptUser: (user: { name?: string }) => ({ name: user.name ?? "Asha" }),
  };
  let service: MarketplaceRatingsService;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma.attendance.findMany.mockResolvedValue([]);
    prisma.booking.findMany.mockResolvedValue([]);
    prisma.marketplaceRating.findUnique.mockResolvedValue(null);
    prisma.marketplaceRating.findMany.mockResolvedValue([]);
    prisma.marketplaceRating.aggregate.mockResolvedValue({
      _avg: { rating: 5 },
      _count: { rating: 1 },
    });
    service = new MarketplaceRatingsService(
      prisma as never,
      crypto as never,
    );
  });

  it("rejects rating a studio the student never attended", async () => {
    await expect(
      service.create(student as never, {
        studentId: "student-1",
        target: "STUDIO",
        studioId: "studio-1",
        category: "DANCE",
        rating: 5,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.marketplaceRating.create).not.toHaveBeenCalled();
  });

  it("rejects staff from rating", async () => {
    await expect(
      service.create({ id: "owner-1", role: UserRole.OWNER } as never, {
        studentId: "owner-1",
        target: "STUDIO",
        studioId: "studio-1",
        category: "DANCE",
        rating: 5,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("writes a Dance class rating without touching Fitness", async () => {
    const startsAt = new Date("2026-09-18T10:00:00.000Z");
    prisma.attendance.findMany.mockResolvedValue([
      {
        sessionId: "session-1",
        session: {
          startsAt,
          batch: {
            id: "batch-1",
            name: "Hip hop",
            studioId: "studio-1",
            studio: { name: "E-Grade" },
            trainers: [{ trainerId: "trainer-1" }],
            enrollments: [{ status: "ACTIVE", endedAt: null }],
          },
        },
      },
    ]);
    prisma.marketplaceRating.create.mockResolvedValue({
      id: "rate-1",
      target: "STUDIO",
      studioId: "studio-1",
      trainerId: null,
      category: "DANCE",
      rating: 5,
      source: "CLASS",
    });

    const created = await service.create(student as never, {
      studentId: "student-1",
      target: "STUDIO",
      studioId: "studio-1",
      category: "DANCE",
      rating: 5,
    });

    expect(created.source).toBe("CLASS");
    expect(prisma.marketplaceRating.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        category: "DANCE",
        uniqueKey: "student-1:STUDIO:studio-1:DANCE",
        source: "CLASS",
      }),
    });
    expect(prisma.marketplaceRating.aggregate).toHaveBeenCalledWith({
      where: expect.objectContaining({
        studioId: "studio-1",
        category: "DANCE",
      }),
      _avg: { rating: true },
      _count: { rating: true },
    });
  });

  it("does not let a Fitness visit rate a Dance studio", async () => {
    prisma.attendance.findMany.mockResolvedValue([]);
    prisma.booking.findMany.mockResolvedValue([]);
    await expect(
      service.create(student as never, {
        studentId: "student-1",
        target: "STUDIO",
        studioId: "studio-1",
        category: "DANCE",
        rating: 4,
      }),
    ).rejects.toMatchObject({ message: "You can only rate a studio you attended" });
  });
});
