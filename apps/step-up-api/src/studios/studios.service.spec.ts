import { BadRequestException, ConflictException } from "@nestjs/common";
import { Prisma, UserRole } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StudiosService } from "./studios.service";

describe("StudiosService", () => {
  const prisma = {
    studio: {
      update: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      delete: vi.fn(),
    },
    studioSettings: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    contestCertificate: {
      deleteMany: vi.fn(),
    },
    contest: {
      deleteMany: vi.fn(),
    },
    batch: {
      deleteMany: vi.fn(),
    },
    user: {
      findFirst: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
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
  const razorpay = {
    assertValidCredentials: vi.fn(async () => undefined),
  };
  const firebase = {
    ensureEmailPasswordUser: vi.fn(async () => null),
  };

  let service: StudiosService;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma.studioSettings.findUnique.mockResolvedValue(null);
    service = new StudiosService(
      prisma as never,
      crypto as never,
      media as never,
      razorpay as never,
      firebase as never,
    );
  });

  it("lists public studio directory entries", async () => {
    prisma.studio.findMany.mockResolvedValue([
      { id: "studio-2", name: "Beta" },
      { id: "studio-1", name: "Alpha" },
    ]);

    await expect(service.listDirectory()).resolves.toEqual([
      { id: "studio-2", name: "Beta" },
      { id: "studio-1", name: "Alpha" },
    ]);
    expect(prisma.studio.findMany).toHaveBeenCalledWith({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });
  });

  it("encrypts razorpay secret and never returns it", async () => {
    prisma.studioSettings.upsert.mockResolvedValue({
      graceDays: 3,
      expireAlertDays: 7,
      platformFeePercent: 5,
      razorpayKeyId: "rzp_test_studio",
      razorpayKeySecret: "sealed:secret",
      razorpaySecretIv: "iv-1",
      danceStyles: null,
    });

    const result = await service.updateSettings("studio-1", {
      razorpayKeyId: "rzp_test_studio",
      razorpayKeySecret: "plain-secret",
    });

    expect(razorpay.assertValidCredentials).toHaveBeenCalledWith({
      keyId: "rzp_test_studio",
      keySecret: "plain-secret",
    });
    expect(crypto.encryptStudioSecret).toHaveBeenCalledWith("plain-secret");
    expect(prisma.studioSettings.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          razorpayKeyId: "rzp_test_studio",
          razorpayKeySecret: "sealed:plain-secret",
          razorpaySecretIv: "iv-1",
        }),
      }),
    );
    expect(result).toEqual({
      graceDays: 3,
      expireAlertDays: 7,
      platformFeePercent: 5,
      razorpayKeyId: "rzp_test_studio",
      razorpayConfigured: true,
      danceStyles: null,
    });
    expect(result).not.toHaveProperty("razorpayKeySecret");
  });

  it("rejects saving a secret without a key ID", async () => {
    await expect(
      service.updateSettings("studio-1", {
        razorpayKeySecret: "plain-secret",
      }),
    ).rejects.toThrow(/key ID is required/);
    expect(prisma.studioSettings.upsert).not.toHaveBeenCalled();
  });

  it("clears secret when empty string is sent", async () => {
    prisma.studioSettings.upsert.mockResolvedValue({
      graceDays: 3,
      expireAlertDays: 7,
      platformFeePercent: 5,
      razorpayKeyId: "rzp_test_studio",
      razorpayKeySecret: null,
      razorpaySecretIv: null,
      danceStyles: null,
    });

    const result = await service.updateSettings("studio-1", {
      razorpayKeySecret: "",
    });

    expect(razorpay.assertValidCredentials).not.toHaveBeenCalled();
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

  it("persists validated danceStyles and clears to defaults with null", async () => {
    const danceStyles = [
      {
        id: "hip-hop",
        label: "Hip Hop",
        abbrev: "HH",
        color: "#E4572E",
        emoji: "🎤",
      },
    ];
    prisma.studioSettings.upsert.mockResolvedValue({
      graceDays: 3,
      expireAlertDays: 7,
      platformFeePercent: 5,
      razorpayKeyId: null,
      razorpayKeySecret: null,
      razorpaySecretIv: null,
      danceStyles,
    });

    const saved = await service.updateSettings("studio-1", { danceStyles });
    expect(prisma.studioSettings.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ danceStyles }),
      }),
    );
    expect(saved.danceStyles).toEqual(danceStyles);

    prisma.studioSettings.upsert.mockResolvedValue({
      graceDays: 3,
      expireAlertDays: 7,
      platformFeePercent: 5,
      razorpayKeyId: null,
      razorpayKeySecret: null,
      razorpaySecretIv: null,
      danceStyles: null,
    });

    const cleared = await service.updateSettings("studio-1", {
      danceStyles: null,
    });
    expect(prisma.studioSettings.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ danceStyles: Prisma.DbNull }),
      }),
    );
    expect(cleared.danceStyles).toBeNull();
  });

  it("rejects invalid danceStyles", async () => {
    await expect(
      service.updateSettings("studio-1", {
        danceStyles: [{ id: "bad", label: "Bad" }],
      }),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.studioSettings.upsert).not.toHaveBeenCalled();
  });

  it("clears logo", async () => {
    prisma.studio.update.mockResolvedValue({
      id: "studio-1",
      logoUrl: null,
    });

    await service.updateStudio("studio-1", {
      logoUrl: null,
    });

    expect(prisma.studio.update).toHaveBeenCalledWith({
      where: { id: "studio-1" },
      data: {
        logoUrl: null,
      },
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
      const result = await fn(tx);
      expect(tx.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            mustChangePassword: true,
          }),
        }),
      );
      return result;
    });

    const result = await service.createStudio({
      name: "Nova Dance",
      ownerEmail: "owner@example.com",
      ownerName: "Nova Owner",
      temporaryPassword: "TempPass1",
    });

    expect(result.id).toBe("studio-new");
    expect(result.ownerProvisioned).toBe(true);
    expect(result.owner.email).toBe("owner@example.com");
    expect(result.temporaryPassword).toBe("TempPass1");
    expect(result.setupHint).toMatch(/temporary password/i);
    expect(firebase.ensureEmailPasswordUser).toHaveBeenCalledWith({
      email: "owner@example.com",
      password: "TempPass1",
      displayName: "Nova Owner",
    });
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

  it("persists hero image urls", async () => {
    prisma.studio.update.mockResolvedValue({
      id: "studio-1",
      heroMobileUrl: "studio-heroes/mobile.jpg",
      heroDesktopUrl: "studio-heroes/desktop.jpg",
    });

    await service.updateStudio("studio-1", {
      heroMobileUrl: "studio-heroes/mobile.jpg",
      heroDesktopUrl: "studio-heroes/desktop.jpg",
    });

    expect(prisma.studio.update).toHaveBeenCalledWith({
      where: { id: "studio-1" },
      data: {
        heroMobileUrl: "studio-heroes/mobile.jpg",
        heroDesktopUrl: "studio-heroes/desktop.jpg",
      },
    });
  });

  it("clears hero images when null is sent", async () => {
    prisma.studio.update.mockResolvedValue({
      id: "studio-1",
      heroMobileUrl: null,
      heroDesktopUrl: null,
    });

    await service.updateStudio("studio-1", {
      heroMobileUrl: null,
      heroDesktopUrl: null,
    });

    expect(prisma.studio.update).toHaveBeenCalledWith({
      where: { id: "studio-1" },
      data: {
        heroMobileUrl: null,
        heroDesktopUrl: null,
      },
    });
  });

  it("requires a studio name", async () => {
    await expect(
      service.createStudio({
        name: "   ",
        ownerEmail: "owner@example.com",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("deletes a studio after clearing members and restrict blockers", async () => {
    prisma.studio.findUnique.mockResolvedValue({
      id: "studio-1",
      name: "Nova Dance",
    });
    prisma.user.findMany.mockResolvedValue([
      { id: "owner-1" },
      { id: "staff-1" },
    ]);
    prisma.$transaction.mockImplementation(async (fn) => {
      const tx = {
        contestCertificate: {
          deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
        },
        contest: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
        batch: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
        user: {
          updateMany: vi.fn().mockResolvedValue({ count: 2 }),
          deleteMany: vi.fn().mockResolvedValue({ count: 2 }),
        },
        studio: { delete: vi.fn().mockResolvedValue({ id: "studio-1" }) },
      };
      return fn(tx);
    });

    const result = await service.deleteStudio("studio-1");

    expect(result).toEqual({
      deleted: true,
      id: "studio-1",
      name: "Nova Dance",
    });
    expect(prisma.$transaction).toHaveBeenCalledOnce();
  });

  it("rejects deleting a missing studio", async () => {
    prisma.studio.findUnique.mockResolvedValue(null);

    await expect(service.deleteStudio("missing")).rejects.toThrow(
      /Studio not found/,
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
