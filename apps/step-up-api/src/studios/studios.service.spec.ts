import { BadRequestException, ConflictException } from "@nestjs/common";
import { Prisma, UserRole } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StudiosService } from "./studios.service";

describe("StudiosService", () => {
  const prisma = {
    studio: {
      update: vi.fn(),
      findUnique: vi.fn(),
    },
    studioSettings: {
      upsert: vi.fn(),
    },
    user: {
      findFirst: vi.fn(),
      findUniqueOrThrow: vi.fn(),
    },
    $transaction: vi.fn(),
  };
  const crypto = {
    encryptStudioSecret: vi.fn((secret: string) => ({
      ciphertext: `sealed:${secret}`,
      iv: "iv-1",
    })),
    hashEmail: vi.fn((email: string) => `hash:${email}`),
    sealPii: vi.fn(() => ({
      encryptedKey: "key",
      piiCiphertext: "cipher",
      piiIv: "iv",
      emailHash: "hash",
    })),
    decryptUser: vi.fn((user: { id: string }) => ({
      id: user.id,
      email: "owner@example.com",
      name: "Owner",
    })),
  };
  const media = {
    signReadUrl: vi.fn(async (url: string | null) =>
      url ? `signed:${url}` : null,
    ),
  };

  let service: StudiosService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new StudiosService(
      prisma as never,
      crypto as never,
      media as never,
    );
  });

  it("encrypts razorpay secret and never returns it", async () => {
    prisma.studioSettings.upsert.mockResolvedValue({
      graceDays: 3,
      expireAlertDays: 7,
      platformFeePercent: 5,
      razorpayKeyId: "rzp_studio",
      razorpayKeySecret: "sealed:secret",
      razorpaySecretIv: "iv-1",
    });

    const result = await service.updateSettings("studio-1", {
      razorpayKeyId: "rzp_studio",
      razorpayKeySecret: "plain-secret",
    });

    expect(crypto.encryptStudioSecret).toHaveBeenCalledWith("plain-secret");
    expect(prisma.studioSettings.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          razorpayKeyId: "rzp_studio",
          razorpayKeySecret: "sealed:plain-secret",
          razorpaySecretIv: "iv-1",
        }),
      }),
    );
    expect(result).toEqual({
      graceDays: 3,
      expireAlertDays: 7,
      platformFeePercent: 5,
      razorpayKeyId: "rzp_studio",
      razorpayConfigured: true,
    });
    expect(result).not.toHaveProperty("razorpayKeySecret");
  });

  it("clears secret when empty string is sent", async () => {
    prisma.studioSettings.upsert.mockResolvedValue({
      graceDays: 3,
      expireAlertDays: 7,
      platformFeePercent: 5,
      razorpayKeyId: "rzp_studio",
      razorpayKeySecret: null,
      razorpaySecretIv: null,
    });

    const result = await service.updateSettings("studio-1", {
      razorpayKeySecret: "",
    });

    expect(crypto.encryptStudioSecret).not.toHaveBeenCalled();
    expect(prisma.studioSettings.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          razorpayKeySecret: null,
          razorpaySecretIv: null,
        }),
      }),
    );
    expect(result.razorpayConfigured).toBe(false);
  });

  it("persists validated brandTheme and clears logo", async () => {
    const brandTheme = {
      label: "Studio Brand",
      extends: "step-up",
      color: {
        algorithm: "oklch",
        seeds: {
          neutral: "#8e8e93",
          accent: "#ff2d55",
        },
      },
      tokenOverrides: {},
    };
    prisma.studio.update.mockResolvedValue({
      id: "studio-1",
      logoUrl: null,
      brandTheme,
    });

    await service.updateStudio("studio-1", {
      logoUrl: null,
      brandTheme,
    });

    expect(prisma.studio.update).toHaveBeenCalledWith({
      where: { id: "studio-1" },
      data: {
        logoUrl: null,
        brandTheme,
      },
    });
  });

  it("rejects invalid brandTheme", () => {
    expect(() =>
      service.updateStudio("studio-1", {
        brandTheme: { label: "Nope" },
      }),
    ).toThrow(BadRequestException);
    expect(prisma.studio.update).not.toHaveBeenCalled();
  });

  it("clears brandTheme when null is sent", async () => {
    prisma.studio.update.mockResolvedValue({
      id: "studio-1",
      brandTheme: null,
    });

    await service.updateStudio("studio-1", { brandTheme: null });

    expect(prisma.studio.update).toHaveBeenCalledWith({
      where: { id: "studio-1" },
      data: { brandTheme: Prisma.DbNull },
    });
  });

  it("creates studio, settings, and owner in a transaction", async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.$transaction.mockImplementation(async (fn) => {
      const tx = {
        user: {
          create: vi.fn().mockResolvedValue({ id: "owner-new" }),
          update: vi.fn(),
          findUniqueOrThrow: vi
            .fn()
            .mockResolvedValue({ id: "owner-new", email: "x" }),
        },
        studio: {
          create: vi.fn().mockResolvedValue({
            id: "studio-new",
            name: "Nova Dance",
            address: null,
            contact: null,
          }),
        },
      };
      return fn(tx);
    });

    const result = await service.createStudio({
      name: "Nova Dance",
      ownerEmail: "owner@example.com",
      ownerName: "Nova Owner",
    });

    expect(result.id).toBe("studio-new");
    expect(result.ownerProvisioned).toBe(true);
    expect(result.owner.email).toBe("owner@example.com");
  });

  it("rejects owners who already belong to a studio", async () => {
    prisma.user.findFirst.mockResolvedValue({
      id: "owner-1",
      role: UserRole.STUDENT,
      studioId: "studio-seed-1",
      ownedStudio: null,
    });

    await expect(
      service.createStudio({
        name: "Other",
        ownerEmail: "student@stepup.dev",
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("requires a studio name", async () => {
    await expect(
      service.createStudio({
        name: "   ",
        ownerEmail: "owner@example.com",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
