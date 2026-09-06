import { BadRequestException, UnauthorizedException } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";

describe("AuthController.sync", () => {
  const prisma = {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    studio: {
      findUnique: vi.fn(),
    },
  };
  const crypto = {
    hashEmail: vi.fn((email: string) => `hash:${email}`),
    sealPii: vi.fn(() => ({
      encryptedKey: "key",
      piiCiphertext: "cipher",
      piiIv: "iv",
      emailHash: "hash",
    })),
    decryptUser: vi.fn((user: { id: string; role: UserRole }) => ({
      id: user.id,
      email: "hari@stepup.dev",
      name: "Hari",
      role: user.role,
      studioId: null,
      photoUrl: null,
    })),
  };
  const media = {
    signReadUrl: vi.fn(async (url: string | null) => url),
  };
  const push = {
    registerToken: vi.fn(),
  };
  const firebase = {};
  const staffInvites = {};

  let controller: AuthController;
  let auth: AuthService;

  beforeEach(() => {
    vi.clearAllMocks();
    auth = new AuthService(
      prisma as never,
      crypto as never,
      media as never,
      push as never,
      firebase as never,
      staffInvites as never,
      { isConfigured: vi.fn(), sendChangeEmail: vi.fn() } as never,
    );
    controller = new AuthController(auth);
  });

  it("does not create a user on login sync when Firebase has no DB row", async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.findFirst.mockResolvedValue(null);

    await expect(
      controller.sync(
        {
          auth: {
            firebaseUid: "firebase-hari",
            email: "hari@stepup.dev",
            name: "Hari",
          },
        } as never,
        {},
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it("creates a student when register explicitly sets create", async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.findFirst
      .mockResolvedValueOnce(null) // provisioned lookup
      .mockResolvedValueOnce(null); // assertEmailAvailable
    prisma.studio.findUnique.mockResolvedValue({ id: "studio-1" });
    prisma.user.create.mockResolvedValue({
      id: "student-1",
      role: UserRole.STUDENT,
      studioId: "studio-1",
    });

    const result = await controller.sync(
      {
        auth: {
          firebaseUid: "firebase-hari",
          email: "hari@stepup.dev",
          name: "Hari",
        },
      } as never,
      { create: true, studioId: "studio-1" },
    );

    expect(prisma.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        firebaseUid: "firebase-hari",
        role: UserRole.STUDENT,
        studioId: "studio-1",
      }),
    });
    expect(crypto.sealPii).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Hari" }),
    );
    expect(result.role).toBe(UserRole.STUDENT);
  });

  it("defaults new-user display name to the email username", async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    prisma.user.create.mockResolvedValue({
      id: "student-1",
      role: UserRole.STUDENT,
      studioId: null,
    });

    await controller.sync(
      {
        auth: {
          firebaseUid: "firebase-hari",
          email: "hari.student@stepup.dev",
        },
      } as never,
      { create: true },
    );

    expect(crypto.sealPii).toHaveBeenCalledWith(
      expect.objectContaining({ name: "hari.student" }),
    );
  });

  it("keeps an existing display name when Firebase has none", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: "student-1",
      encryptedKey: "key",
      role: UserRole.STUDENT,
    });
    crypto.decryptUser.mockReturnValue({
      id: "student-1",
      email: "hari@stepup.dev",
      name: "Hari",
      role: UserRole.STUDENT,
      studioId: null,
      photoUrl: null,
      phone: null,
      bio: null,
      instagramUrl: null,
    });
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.user.update.mockResolvedValue({
      id: "student-1",
      role: UserRole.STUDENT,
    });

    await controller.sync(
      {
        auth: {
          firebaseUid: "firebase-hari",
          email: "hari@stepup.dev",
        },
      } as never,
      {},
    );

    expect(crypto.sealPii).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Hari" }),
      "key",
    );
  });
});

describe("AuthController.bypassLogin", () => {
  const prisma = {
    user: {
      findMany: vi.fn(),
    },
  };
  const crypto = {
    hashEmail: vi.fn((email: string) => `hash:${email}`),
    decryptUser: vi.fn((user: { id: string; role: UserRole }) => ({
      id: user.id,
      email: "admin@stepup.dev",
      name: "System Admin",
      role: user.role,
      studioId: null,
      photoUrl: null,
      active: true,
    })),
  };
  const media = {
    signReadUrl: vi.fn(async (url: string | null) => url),
  };
  const firebase = {
    isBypassEnabled: vi.fn(() => true),
  };

  let controller: AuthController;

  beforeEach(() => {
    vi.clearAllMocks();
    firebase.isBypassEnabled.mockReturnValue(true);
    const auth = new AuthService(
      prisma as never,
      crypto as never,
      media as never,
      { registerToken: vi.fn() } as never,
      firebase as never,
      {} as never,
      { isConfigured: vi.fn(), sendChangeEmail: vi.fn() } as never,
    );
    controller = new AuthController(auth);
  });

  it("returns the system admin when email hashes collide with a newer student", async () => {
    prisma.user.findMany.mockResolvedValue([
      {
        id: "student-dup",
        role: UserRole.STUDENT,
        active: true,
        createdAt: new Date("2026-08-22"),
      },
      {
        id: "system-admin-1",
        role: UserRole.SYSTEM_ADMIN,
        active: true,
        createdAt: new Date("2026-01-01"),
      },
    ]);

    const result = await controller.bypassLogin({
      email: "admin@stepup.dev",
    });

    expect(result.id).toBe("system-admin-1");
    expect(result.role).toBe(UserRole.SYSTEM_ADMIN);
  });

  it("rejects a deactivated admin account", async () => {
    prisma.user.findMany.mockResolvedValue([
      {
        id: "system-admin-1",
        role: UserRole.SYSTEM_ADMIN,
        active: false,
        createdAt: new Date("2026-01-01"),
      },
    ]);

    await expect(
      controller.bypassLogin({ email: "admin@stepup.dev" }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

describe("AuthService.requestChangeEmail", () => {
  const prisma = {
    user: {
      findFirst: vi.fn(),
    },
  };
  const crypto = {
    hashEmail: vi.fn((email: string) => `hash:${email}`),
  };
  const firebase = {
    isBypassEnabled: vi.fn(() => false),
    resolveUser: vi.fn(),
    generateVerifyAndChangeEmailLink: vi.fn(),
    generateEmailVerificationLink: vi.fn(),
    generatePasswordResetLink: vi.fn(),
  };
  const email = {
    isConfigured: vi.fn(() => true),
    sendChangeEmail: vi.fn(),
    sendVerifyEmail: vi.fn(),
    sendPasswordReset: vi.fn(),
  };

  let auth: AuthService;

  beforeEach(() => {
    vi.clearAllMocks();
    firebase.isBypassEnabled.mockReturnValue(false);
    email.isConfigured.mockReturnValue(true);
    auth = new AuthService(
      prisma as never,
      crypto as never,
      { signReadUrl: vi.fn() } as never,
      { registerToken: vi.fn() } as never,
      firebase as never,
      {} as never,
      email as never,
    );
  });

  it("sends a Titan confirmation to the new address", async () => {
    firebase.resolveUser.mockResolvedValue({ id: "user-1" });
    prisma.user.findFirst.mockResolvedValue(null);
    firebase.generateVerifyAndChangeEmailLink.mockResolvedValue(
      "https://step-up.pages.dev/login?oobCode=abc",
    );

    await auth.requestChangeEmail(
      { firebaseUid: "fb-1", email: "old@example.com" },
      "new@example.com",
    );

    expect(firebase.generateVerifyAndChangeEmailLink).toHaveBeenCalledWith(
      "old@example.com",
      "new@example.com",
    );
    expect(email.sendChangeEmail).toHaveBeenCalledWith({
      to: "new@example.com",
      confirmUrl: "https://step-up.pages.dev/login?oobCode=abc",
    });
  });

  it("rejects when SMTP is not configured", async () => {
    email.isConfigured.mockReturnValue(false);
    await expect(
      auth.requestChangeEmail(
        { firebaseUid: "fb-1", email: "old@example.com" },
        "new@example.com",
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(email.sendChangeEmail).not.toHaveBeenCalled();
  });
});

describe("AuthService.requestEmailVerification", () => {
  const firebase = {
    isBypassEnabled: vi.fn(() => false),
    generateEmailVerificationLink: vi.fn(),
  };
  const email = {
    isConfigured: vi.fn(() => true),
    sendVerifyEmail: vi.fn(),
  };
  let auth: AuthService;

  beforeEach(() => {
    vi.clearAllMocks();
    firebase.isBypassEnabled.mockReturnValue(false);
    email.isConfigured.mockReturnValue(true);
    auth = new AuthService(
      {} as never,
      {} as never,
      { signReadUrl: vi.fn() } as never,
      { registerToken: vi.fn() } as never,
      firebase as never,
      {} as never,
      email as never,
    );
  });

  it("sends a Titan verification link to the signed-in address", async () => {
    firebase.generateEmailVerificationLink.mockResolvedValue(
      "https://step-up.pages.dev/login?oobCode=verify",
    );

    await auth.requestEmailVerification({
      firebaseUid: "fb-1",
      email: "member@example.com",
    });

    expect(firebase.generateEmailVerificationLink).toHaveBeenCalledWith(
      "member@example.com",
    );
    expect(email.sendVerifyEmail).toHaveBeenCalledWith({
      to: "member@example.com",
      confirmUrl: "https://step-up.pages.dev/login?oobCode=verify",
    });
  });
});

describe("AuthService.requestPasswordReset", () => {
  const firebase = {
    isBypassEnabled: vi.fn(() => false),
    generatePasswordResetLink: vi.fn(),
  };
  const email = {
    isConfigured: vi.fn(() => true),
    sendPasswordReset: vi.fn(),
  };
  let auth: AuthService;

  beforeEach(() => {
    vi.clearAllMocks();
    firebase.isBypassEnabled.mockReturnValue(false);
    email.isConfigured.mockReturnValue(true);
    auth = new AuthService(
      {} as never,
      {} as never,
      { signReadUrl: vi.fn() } as never,
      { registerToken: vi.fn() } as never,
      firebase as never,
      {} as never,
      email as never,
    );
  });

  it("sends a Titan reset link when the Firebase user exists", async () => {
    firebase.generatePasswordResetLink.mockResolvedValue(
      "https://step-up.pages.dev/login?oobCode=reset",
    );

    await auth.requestPasswordReset("member@example.com");

    expect(firebase.generatePasswordResetLink).toHaveBeenCalledWith(
      "member@example.com",
    );
    expect(email.sendPasswordReset).toHaveBeenCalledWith({
      to: "member@example.com",
      resetUrl: "https://step-up.pages.dev/login?oobCode=reset",
    });
  });

  it("does not leak whether the account exists", async () => {
    firebase.generatePasswordResetLink.mockRejectedValue({
      code: "auth/user-not-found",
    });

    await expect(
      auth.requestPasswordReset("missing@example.com"),
    ).resolves.toBeUndefined();
    expect(email.sendPasswordReset).not.toHaveBeenCalled();
  });
});
