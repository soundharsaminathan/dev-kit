import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RazorpayService } from "./razorpay.service";

describe("RazorpayService", () => {
  const configValues: Record<string, string> = {};
  const config = {
    get: vi.fn((key: string) => configValues[key]),
  };
  const crypto = {
    decryptStudioSecret: vi.fn((ciphertext: string, _iv: string) => ciphertext),
    encryptStudioSecret: vi.fn((secret: string) => ({
      ciphertext: secret,
      iv: "iv",
    })),
  };

  let service: RazorpayService;

  beforeEach(() => {
    vi.clearAllMocks();
    for (const key of Object.keys(configValues)) {
      delete configValues[key];
    }
    service = new RazorpayService(config as never, crypto as never);
  });

  it("is disabled when keys are missing", () => {
    expect(service.isEnabled()).toBe(false);
  });

  it("is enabled when both env keys are set", () => {
    configValues.RAZORPAY_KEY_ID = "rzp_test_abc";
    configValues.RAZORPAY_KEY_SECRET = "secret";
    expect(service.isEnabled()).toBe(true);
    expect(service.keyId()).toBe("rzp_test_abc");
  });

  it("prefers studio keys over env", () => {
    configValues.RAZORPAY_KEY_ID = "rzp_env";
    configValues.RAZORPAY_KEY_SECRET = "env_secret";
    crypto.decryptStudioSecret.mockReturnValue("studio_secret");

    const keys = service.resolveKeys({
      razorpayKeyId: "rzp_studio",
      razorpayKeySecret: "cipher",
      razorpaySecretIv: "iv",
    });

    expect(keys).toEqual({
      keyId: "rzp_studio",
      keySecret: "studio_secret",
    });
  });

  it("defaults booking amount to 100 paise", () => {
    expect(service.bookingAmountPaise()).toBe(100);
    configValues.RAZORPAY_BOOKING_AMOUNT_PAISE = "250";
    expect(service.bookingAmountPaise()).toBe(250);
    configValues.RAZORPAY_BOOKING_AMOUNT_PAISE = "50";
    expect(service.bookingAmountPaise()).toBe(100);
  });

  it("verifies a valid payment signature", () => {
    configValues.RAZORPAY_KEY_ID = "rzp_test_abc";
    configValues.RAZORPAY_KEY_SECRET = "test_secret";
    const orderId = "order_123";
    const paymentId = "pay_456";
    const signature = createHmac("sha256", "test_secret")
      .update(`${orderId}|${paymentId}`)
      .digest("hex");

    expect(
      service.verifyPaymentSignature({ orderId, paymentId, signature }),
    ).toBe(true);
  });

  it("rejects an invalid payment signature", () => {
    configValues.RAZORPAY_KEY_ID = "rzp_test_abc";
    configValues.RAZORPAY_KEY_SECRET = "test_secret";

    expect(
      service.verifyPaymentSignature({
        orderId: "order_123",
        paymentId: "pay_456",
        signature: "not-a-real-signature",
      }),
    ).toBe(false);
  });

  it("rejects createOrder when amount is below 100 paise", async () => {
    configValues.RAZORPAY_KEY_ID = "rzp_test_abc";
    configValues.RAZORPAY_KEY_SECRET = "test_secret";

    await expect(
      service.createOrder({
        receipt: "bk-1",
        amountPaise: 50,
      }),
    ).rejects.toThrow(/at least 100 paise/);
  });
});
