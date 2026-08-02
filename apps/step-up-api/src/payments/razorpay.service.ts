import { createHmac, timingSafeEqual } from "node:crypto";
import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
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
        // Fall through to env keys when studio secret cannot be decrypted.
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
      if (
        error instanceof BadRequestException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }

      const status = razorpayErrorStatus(error);
      if (status === 401 || status === 403) {
        throw new UnauthorizedException("Razorpay authentication failed");
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
