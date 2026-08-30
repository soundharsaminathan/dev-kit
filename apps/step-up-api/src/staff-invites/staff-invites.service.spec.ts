import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { InviteStatus, UserRole } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StaffInvitesService } from "./staff-invites.service";

const MASTER_PII = {
  email: "staff@stepup.dev",
  name: "New Staff",
  phone: null,
  bio: null,
  instagramUrl: null,
};

describe("StaffInvitesService", () => {
  const prisma = {
    user: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    studio: {
      findUnique: vi.fn(),
    },
    staffInvite: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
  };

  const crypto = {
    hashEmail: vi.fn((email: string) => `hash:${email.toLowerCase()}`),
    sealPii: vi.fn(() => ({
      encryptedKey: "key",
      piiCiphertext: "cipher",
      piiIv: "iv",
      emailHash: "hash:staff@stepup.dev",
    })),
    decryptUser: vi.fn((user: Record<string, unknown>) => ({
      ...user,
      ...MASTER_PII,
    })),
  };

  const email = {
    sendStaffInvite: vi.fn().mockResolvedValue(undefined),
  };

  const config = {
    get: vi.fn((key: string) =>
      key === "APP_URL" ? "http://localhost:5199" : undefined,
    ),
  };

  const media = {
    signReadUrl: vi.fn(async (url: string | null) => url),
  };

  let service: StaffInvitesService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new StaffInvitesService(
      prisma as never,
      crypto as never,
      email as never,
      config as never,
      media as never,
    );
  });

  it("creates an invite, emails it, and returns inviteUrl", async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.staffInvite.findFirst.mockResolvedValue(null);
    prisma.studio.findUnique.mockResolvedValue({ name: "classa" });
    prisma.staffInvite.create.mockResolvedValue({
      id: "inv-1",
      studioId: "studio-1",
      email: "staff@stepup.dev",
      role: UserRole.STAFF,
      token: "tok",
      status: InviteStatus.PENDING,
      expiresAt: new Date(Date.now() + 86_400_000),
    });

    const result = await service.createInvite("studio-1", "owner-1", {
      email: "Staff@StepUp.dev",
      role: UserRole.STAFF,
    });

    expect(email.sendStaffInvite).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "staff@stepup.dev",
        studioName: "classa",
        role: UserRole.STAFF,
      }),
    );
    expect(result.inviteUrl).toMatch(/^http:\/\/localhost:5199\/join\?token=/);
  });

  it("rejects non-invitable roles", async () => {
    await expect(
      service.createInvite("studio-1", "owner-1", {
        email: "x@y.com",
        role: UserRole.OWNER,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("revokes a pending invite", async () => {
    prisma.staffInvite.findUnique.mockResolvedValue({
      id: "inv-1",
      studioId: "studio-1",
      status: InviteStatus.PENDING,
    });
    prisma.staffInvite.update.mockResolvedValue({
      id: "inv-1",
      status: InviteStatus.REVOKED,
    });

    await expect(
      service.revokeInvite("inv-1", "studio-1"),
    ).resolves.toMatchObject({ status: InviteStatus.REVOKED });
  });

  it("accepts a valid invite and creates the user", async () => {
    prisma.staffInvite.findUnique.mockResolvedValue({
      id: "inv-1",
      studioId: "studio-1",
      email: "staff@stepup.dev",
      role: UserRole.TRAINER,
      status: InviteStatus.PENDING,
      expiresAt: new Date(Date.now() + 86_400_000),
    });
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({
      id: "user-1",
      role: UserRole.TRAINER,
      studioId: "studio-1",
      photoUrl: null,
    });
    prisma.staffInvite.update.mockResolvedValue({});

    const result = await service.acceptInvite("tok", {
      firebaseUid: "fb-1",
      email: "staff@stepup.dev",
      name: "New Staff",
    });

    expect(prisma.user.create).toHaveBeenCalled();
    expect(prisma.staffInvite.update).toHaveBeenCalledWith({
      where: { id: "inv-1" },
      data: expect.objectContaining({ status: InviteStatus.ACCEPTED }),
    });
    expect(result.role).toBe(UserRole.TRAINER);
  });

  it("rejects accept when email does not match invite", async () => {
    prisma.staffInvite.findUnique.mockResolvedValue({
      id: "inv-1",
      studioId: "studio-1",
      email: "staff@stepup.dev",
      role: UserRole.STAFF,
      status: InviteStatus.PENDING,
      expiresAt: new Date(Date.now() + 86_400_000),
    });

    await expect(
      service.acceptInvite("tok", {
        firebaseUid: "fb-1",
        email: "other@stepup.dev",
        name: "Other",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("expires invite on accept after expiresAt", async () => {
    prisma.staffInvite.findUnique.mockResolvedValue({
      id: "inv-1",
      studioId: "studio-1",
      email: "staff@stepup.dev",
      role: UserRole.STAFF,
      status: InviteStatus.PENDING,
      expiresAt: new Date(Date.now() - 1000),
    });
    prisma.staffInvite.update.mockResolvedValue({});

    await expect(
      service.acceptInvite("tok", {
        firebaseUid: "fb-1",
        email: "staff@stepup.dev",
      }),
    ).rejects.toThrow(/expired/i);
    expect(prisma.staffInvite.update).toHaveBeenCalledWith({
      where: { id: "inv-1" },
      data: { status: InviteStatus.EXPIRED },
    });
  });

  it("rejects accept when invite is missing", async () => {
    prisma.staffInvite.findUnique.mockResolvedValue(null);
    await expect(
      service.acceptInvite("missing", {
        firebaseUid: "fb-1",
        email: "staff@stepup.dev",
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("rejects create when email already in studio", async () => {
    prisma.user.findFirst.mockResolvedValue({ id: "existing" });
    await expect(
      service.createInvite("studio-1", "owner-1", {
        email: "staff@stepup.dev",
        role: UserRole.STAFF,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
