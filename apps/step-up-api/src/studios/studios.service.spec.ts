import { beforeEach, describe, expect, it, vi } from "vitest";
import { StudiosService } from "./studios.service";

describe("StudiosService.updateSettings", () => {
  const prisma = {
    studioSettings: {
      upsert: vi.fn(),
    },
  };
  const crypto = {
    encryptStudioSecret: vi.fn((secret: string) => ({
      ciphertext: `sealed:${secret}`,
      iv: "iv-1",
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
});
