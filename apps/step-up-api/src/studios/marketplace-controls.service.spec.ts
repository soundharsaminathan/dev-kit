import { BadRequestException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MarketplaceControlsService } from "./marketplace-controls.service";

describe("MarketplaceControlsService", () => {
  const prisma = {
    studio: { findUnique: vi.fn() },
    user: { findMany: vi.fn(), findUnique: vi.fn() },
    trainerStudio: {
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
  };
  const crypto = {
    decryptUser: vi.fn((user: { id?: string }) => ({
      id: user.id,
      name: user.id === "trainer-1" ? "Priya" : "Trainer",
    })),
  };
  const media = {
    signReadUrl: vi.fn(async (url: string | null) =>
      url ? `signed:${url}` : null,
    ),
  };

  let service: MarketplaceControlsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new MarketplaceControlsService(
      prisma as never,
      crypto as never,
      media as never,
    );
  });

  it("lists missing covers per object instead of a whole-studio draft", async () => {
    prisma.studio.findUnique.mockResolvedValue({
      id: "studio-1",
      name: "Rhythm",
      heroDesktopUrl: "heroes/rh.png",
      heroMobileUrl: null,
      branches: [{ coverMedia: { objectKey: "branches/a.jpg" } }],
      batches: [
        { id: "class-1", name: "Hip Hop", coverImageUrl: null },
        { id: "class-2", name: "Ballet", coverImageUrl: "classes/ballet.jpg" },
      ],
      trainerLinks: [],
      members: [
        {
          id: "trainer-1",
          photoUrl: null,
          role: "TRAINER",
          active: true,
          encryptedKey: "k",
          piiCiphertext: "c",
          piiIv: "iv",
        },
      ],
    });

    const alerts = await service.listAlerts("studio-1");
    expect(alerts.items.map((item) => item.kind).sort()).toEqual([
      "CLASS",
      "TRAINER",
    ]);
    expect(alerts.items.find((item) => item.kind === "CLASS")?.objectId).toBe(
      "class-1",
    );
    expect(alerts.items.some((item) => item.kind === "STUDIO")).toBe(false);
    expect(alerts.items.find((item) => item.kind === "CLASS")?.href).toBe(
      "/app/batches/class-1/settings",
    );
  });

  it("rejects attaching a trainer with no published availability", async () => {
    prisma.studio.findUnique.mockResolvedValue({ id: "studio-1" });
    prisma.user.findUnique.mockResolvedValue({
      id: "trainer-1",
      role: "TRAINER",
      active: true,
      studioId: null,
      _count: { trainedStudios: 0, trainerAvailabilities: 0 },
    });

    await expect(service.attachTrainer("studio-1", "trainer-1")).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(service.attachTrainer("studio-1", "trainer-1")).rejects.toThrow(
      "Trainer has no published availability",
    );
    expect(prisma.trainerStudio.create).not.toHaveBeenCalled();
  });

  it("attaches a freelance trainer who published availability", async () => {
    prisma.studio.findUnique.mockResolvedValue({ id: "studio-1" });
    prisma.user.findUnique.mockResolvedValue({
      id: "trainer-1",
      role: "TRAINER",
      active: true,
      studioId: null,
      _count: { trainedStudios: 0, trainerAvailabilities: 2 },
    });
    prisma.trainerStudio.create.mockResolvedValue({
      trainerId: "trainer-1",
      studioId: "studio-1",
      isHome: false,
    });

    await expect(service.attachTrainer("studio-1", "trainer-1")).resolves.toEqual({
      trainerId: "trainer-1",
      studioId: "studio-1",
      isHome: false,
    });
  });
});
