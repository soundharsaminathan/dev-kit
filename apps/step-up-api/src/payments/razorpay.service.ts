import { createHmac, timingSafeEqual } from "node:crypto";
import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Razorpay from "razorpay";
import { UserCryptoService } from "../users/user-crypto.service";

export type CreateRazorpayOrderInput = {
  receipt: string;
  amountPaise: number;
  notes?: Record<string, string>;
};

export type CreateRazorpayOrderResult = {
  orderId: string;
  amount: number;
  currency: string;
};

export type VerifyPaymentSignatureInput = {
  orderId: string;
  paymentId: string;
  signature: string;
};

export type RazorpayKeys = {
  keyId: string;
  keySecret: string;
};

export type StudioRazorpaySettings = {
  razorpayKeyId: string | null;
  razorpayKeySecret: string | null;
  razorpaySecretIv: string | null;
} | null;

@Injectable()
export class RazorpayService {
  constructor(
    @Inject(ConfigService) private readonly config: ConfigService,
    @Inject(UserCryptoService) private readonly crypto: UserCryptoService,
  ) {}

  isEnabled(settings?: StudioRazorpaySettings): boolean {
    return Boolean(this.resolveKeys(settings));
  }

  keyId(settings?: StudioRazorpaySettings): string {
    return this.resolveKeys(settings)?.keyId ?? "";
  }

  resolveKeys(settings?: StudioRazorpaySettings): RazorpayKeys | null {
    if (
      settings?.razorpayKeyId?.trim() &&
      settings.razorpayKeySecret &&
      settings.razorpaySecretIv
    ) {
      try {
        const keySecret = this.crypto.decryptStudioSecret(
          settings.razorpayKeySecret,
          settings.razorpaySecretIv,
        );
        if (keySecret.trim()) {
          return {
            keyId: settings.razorpayKeyId.trim(),
            keySecret: keySecret.trim(),
          };
        }
      } catch {
        throw new BadRequestException(
          "Stored Razorpay secret cannot be decrypted. Re-save both key ID and secret in Settings → Payments.",
        );
      }
    }

    const keyId = (this.config.get<string>("RAZORPAY_KEY_ID") ?? "").trim();
    const keySecret = (
      this.config.get<string>("RAZORPAY_KEY_SECRET") ?? ""
    ).trim();
    if (!keyId || !keySecret) {
      return null;
    }
    return { keyId, keySecret };
  }

  async assertValidCredentials(keys: RazorpayKeys): Promise<void> {
    const keyId = keys.keyId.trim();
    const keySecret = keys.keySecret.trim();
    if (!keyId || !keySecret) {
      throw new BadRequestException("Razorpay key ID and secret are required");
    }
    if (!keyId.startsWith("rzp_test_") && !keyId.startsWith("rzp_live_")) {
      throw new BadRequestException(
        "Razorpay key ID must start with rzp_test_ or rzp_live_",
      );
    }
    if (keySecret.startsWith("rzp_")) {
      throw new BadRequestException(
        "Key secret looks like a key ID. Paste the Key Secret from the Razorpay API Keys page.",
      );
    }

    try {
      const client = new Razorpay({
        key_id: keyId,
        key_secret: keySecret,
      });
      await client.orders.all({ count: 1 });
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      const status = razorpayErrorStatus(error);
      if (status === 401 || status === 403) {
        throw new BadRequestException(
          "Razorpay key ID and secret do not match. Copy both from the same API Keys page (test or live).",
        );
      }
      const message =
        error instanceof Error
          ? error.message
          : "Could not verify Razorpay credentials";
      throw new BadRequestException(message);
    }
  }

  bookingAmountPaise(): number {
    const raw = this.config.get<string>("RAZORPAY_BOOKING_AMOUNT_PAISE");
    const parsed = raw ? Number(raw) : 100;
    if (!Number.isFinite(parsed) || parsed < 100) {
      return 100;
    }
    return Math.floor(parsed);
  }

  async createOrder(
    input: CreateRazorpayOrderInput,
    settings?: StudioRazorpaySettings,
  ): Promise<CreateRazorpayOrderResult> {
    if (!Number.isFinite(input.amountPaise) || input.amountPaise < 100) {
      throw new BadRequestException("Amount must be at least 100 paise");
    }

    const keys = this.resolveKeys(settings);
    if (!keys) {
      throw new BadRequestException("Razorpay is not configured");
    }

    try {
      const client = new Razorpay({
        key_id: keys.keyId,
        key_secret: keys.keySecret,
      });
      const order = await client.orders.create({
        amount: input.amountPaise,
        currency: "INR",
        receipt: input.receipt.slice(0, 40),
        notes: input.notes,
      });

      return {
        orderId: String(order.id),
        amount: Number(order.amount),
        currency: String(order.currency ?? "INR"),
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      const status = razorpayErrorStatus(error);
      if (status === 401 || status === 403) {
        throw new BadRequestException(
          "Razorpay key ID and secret do not match. Re-save both from the same API Keys page in Settings → Payments.",
        );
      }

      const message =
        error instanceof Error
          ? error.message
          : "Failed to create Razorpay order";
      throw new InternalServerErrorException(message);
    }
  }

  verifyPaymentSignature(
    input: VerifyPaymentSignatureInput,
    settings?: StudioRazorpaySettings,
  ): boolean {
    const keys = this.resolveKeys(settings);
    if (!keys) {
      throw new BadRequestException("Razorpay is not configured");
    }

    const expected = createHmac("sha256", keys.keySecret)
      .update(`${input.orderId}|${input.paymentId}`)
      .digest("hex");

    const expectedBuf = Buffer.from(expected, "utf8");
    const actualBuf = Buffer.from(input.signature, "utf8");
    if (expectedBuf.length !== actualBuf.length) {
      return false;
    }
    return timingSafeEqual(expectedBuf, actualBuf);
  }
}

function razorpayErrorStatus(error: unknown): number | undefined {
  if (!error || typeof error !== "object") return undefined;
  const record = error as {
    statusCode?: number;
    status?: number;
    error?: { code?: string };
  };
  if (typeof record.statusCode === "number") return record.statusCode;
  if (typeof record.status === "number") return record.status;
  if (record.error?.code === "BAD_REQUEST_ERROR") return 400;
  return undefined;
}
