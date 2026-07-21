import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { ContestEntryStatus, ContestStatus, UserRole } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ContestsService } from "./contests.service";

describe("ContestsService scoring", () => {
  const prisma = {
    contest: { findUnique: vi.fn() },
    contestEntry: { findUnique: vi.fn() },
    contestScore: {
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
  };

  const crypto = {
    decryptUser: (user: {
      id: string;
      name?: string;
      email?: string;
      role: UserRole;
    }) => ({
      id: user.id,
      name: user.name ?? "Judge",
      email: user.email ?? "judge@stepup.dev",
      role: user.role,
    }),
  };

  let service: ContestsService;

  const trainer = {
    id: "trainer-1",
    role: UserRole.TRAINER,
    studioId: "studio-1",
  };

  const owner = {
    id: "owner-1",
    role: UserRole.OWNER,
    studioId: "studio-1",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ContestsService(prisma as never, crypto as never);
  });

  it("rejects scoring when the user is not an assigned judge", async () => {
    prisma.contestEntry.findUnique.mockResolvedValue({
      id: "entry-1",
      status: ContestEntryStatus.CONFIRMED,
      category: {
        judges: [{ judgeId: "trainer-2" }],
        contest: {
          studioId: "studio-1",
          status: ContestStatus.OPEN,
        },
      },
    });

    await expect(
      service.upsertScore(trainer as never, "entry-1", { score: 88 }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.contestScore.upsert).not.toHaveBeenCalled();
  });

  it("rejects scoring when contest is not open or closed", async () => {
    prisma.contestEntry.findUnique.mockResolvedValue({
      id: "entry-1",
      status: ContestEntryStatus.CONFIRMED,
      category: {
        judges: [{ judgeId: "trainer-1" }],
        contest: {
          studioId: "studio-1",
          status: ContestStatus.DRAFT,
        },
      },
    });

    await expect(
      service.upsertScore(trainer as never, "entry-1", { score: 88 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("upserts a score for an assigned judge", async () => {
    prisma.contestEntry.findUnique.mockResolvedValue({
      id: "entry-1",
      status: ContestEntryStatus.CONFIRMED,
      category: {
        judges: [{ judgeId: "trainer-1" }],
        contest: {
          studioId: "studio-1",
          status: ContestStatus.CLOSED,
        },
      },
    });
    prisma.contestScore.upsert.mockResolvedValue({
      id: "score-1",
      entryId: "entry-1",
      judgeId: "trainer-1",
      score: 91,
      notes: "Clean lines",
      createdAt: new Date("2026-07-20T10:00:00Z"),
      updatedAt: new Date("2026-07-20T10:00:00Z"),
    });

    const result = await service.upsertScore(trainer as never, "entry-1", {
      score: 91,
      notes: "Clean lines",
    });

    expect(prisma.contestScore.upsert).toHaveBeenCalledWith({
      where: { entryId_judgeId: { entryId: "entry-1", judgeId: "trainer-1" } },
      create: {
        entryId: "entry-1",
        judgeId: "trainer-1",
        score: 91,
        notes: "Clean lines",
      },
      update: {
        score: 91,
        notes: "Clean lines",
      },
    });
    expect(result.score).toBe(91);
    expect(result.notes).toBe("Clean lines");
  });

  it("lists only the current judge scores for trainers", async () => {
    prisma.contest.findUnique.mockResolvedValue({
      id: "contest-1",
      studioId: "studio-1",
    });
    prisma.contestScore.findMany.mockResolvedValue([
      {
        id: "score-1",
        entryId: "entry-1",
        judgeId: "trainer-1",
        score: 80,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    await service.listScores(trainer as never, "contest-1");

    expect(prisma.contestScore.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          entry: { category: { contestId: "contest-1" } },
          judgeId: "trainer-1",
        },
      }),
    );
  });

  it("lists all scores with judge details for owners", async () => {
    prisma.contest.findUnique.mockResolvedValue({
      id: "contest-1",
      studioId: "studio-1",
    });
    prisma.contestScore.findMany.mockResolvedValue([]);

    await service.listScores(owner as never, "contest-1");

    expect(prisma.contestScore.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          entry: { category: { contestId: "contest-1" } },
        },
        include: expect.objectContaining({
          judge: expect.any(Object),
        }),
      }),
    );
  });

  it("returns not found for unknown contests when listing scores", async () => {
    prisma.contest.findUnique.mockResolvedValue(null);

    await expect(
      service.listScores(trainer as never, "missing"),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
