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

  async createRefund(
    input: {
      paymentId: string;
      amountPaise: number;
      notes?: Record<string, string>;
    },
    settings?: StudioRazorpaySettings,
  ): Promise<{ refundId: string; amount: number }> {
    if (!Number.isFinite(input.amountPaise) || input.amountPaise < 100) {
      throw new BadRequestException("Refund amount must be at least 100 paise");
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
      const refund = await client.payments.refund(input.paymentId, {
        amount: input.amountPaise,
        notes: input.notes,
      });

      return {
        refundId: String(refund.id),
        amount: Number(refund.amount),
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
          : "Failed to create Razorpay refund";
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

    return timingSafeEqualHex(expected, input.signature);
  }

  async createPaymentLink(
    input: CreateRazorpayPaymentLinkInput,
    settings?: StudioRazorpaySettings,
  ): Promise<CreateRazorpayPaymentLinkResult> {
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
      // Razorpay's TS defs incorrectly require AdvanceOption.options for create().
      const link = (await client.paymentLink.create({
        amount: input.amountPaise,
        currency: "INR",
        accept_partial: false,
        description: input.description.slice(0, 2048),
        reference_id: input.invoiceId.slice(0, 40),
        notes: {
          invoiceId: input.invoiceId,
          ...(input.notes ?? {}),
        },
        notify: { sms: false, email: false },
        reminder_enable: false,
        ...(input.customer
          ? {
              customer: {
                ...(input.customer.name
                  ? { name: input.customer.name.slice(0, 50) }
                  : {}),
                ...(input.customer.contact
                  ? { contact: input.customer.contact }
                  : {}),
                ...(input.customer.email
                  ? { email: input.customer.email }
                  : {}),
              },
            }
          : {}),
      } as never)) as { id?: string; short_url?: string };

      const id = String(link.id ?? "");
      const shortUrl = String(link.short_url ?? "");
      if (!id || !shortUrl) {
        throw new InternalServerErrorException(
          "Razorpay payment link response was incomplete",
        );
      }

      return { id, shortUrl };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      if (error instanceof InternalServerErrorException) {
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
          : "Failed to create Razorpay payment link";
      throw new InternalServerErrorException(message);
    }
  }

  async cancelPaymentLink(
    paymentLinkId: string,
    settings?: StudioRazorpaySettings,
  ): Promise<void> {
    const trimmed = paymentLinkId.trim();
    if (!trimmed) {
      return;
    }
    const keys = this.resolveKeys(settings);
    if (!keys) {
      return;
    }
    try {
      const client = new Razorpay({
        key_id: keys.keyId,
        key_secret: keys.keySecret,
      });
      await client.paymentLink.cancel(trimmed);
    } catch (error) {
      const status = razorpayErrorStatus(error);
      // Already cancelled / paid / not found — treat as best-effort success.
      if (status === 400 || status === 404) {
        return;
      }
      const message =
        error instanceof Error
          ? error.message
          : "Failed to cancel Razorpay payment link";
      throw new InternalServerErrorException(message);
    }
  }

  /**
   * Fetch payment amount in paise from Razorpay. Returns null when keys are
   * missing or the payment cannot be loaded.
   */
  async fetchPaymentAmountPaise(
    paymentId: string,
    settings?: StudioRazorpaySettings,
  ): Promise<number | null> {
    const trimmed = paymentId.trim();
    if (!trimmed) {
      return null;
    }
    const keys = this.resolveKeys(settings);
    if (!keys) {
      return null;
    }
    try {
      const client = new Razorpay({
        key_id: keys.keyId,
        key_secret: keys.keySecret,
      });
      const payment = (await client.payments.fetch(trimmed)) as {
        amount?: number | string;
      };
      const amount = Number(payment.amount);
      return Number.isFinite(amount) ? Math.round(amount) : null;
    } catch {
      return null;
    }
  }

  verifyWebhookSignature(
    rawBody: string | Buffer,
    signature: string,
    secret: string,
  ): boolean {
    const trimmedSecret = secret.trim();
    const trimmedSignature = signature.trim();
    if (!trimmedSecret || !trimmedSignature) {
      return false;
    }

    const expected = createHmac("sha256", trimmedSecret)
      .update(rawBody)
      .digest("hex");

    return timingSafeEqualHex(expected, trimmedSignature);
  }
}

export type CreateRazorpayPaymentLinkInput = {
  amountPaise: number;
  invoiceId: string;
  description: string;
  customer?: {
    name?: string;
    contact?: string;
    email?: string;
  };
  notes?: Record<string, string>;
};

export type CreateRazorpayPaymentLinkResult = {
  id: string;
  shortUrl: string;
};

function timingSafeEqualHex(expected: string, actual: string): boolean {
  const expectedBuf = Buffer.from(expected, "utf8");
  const actualBuf = Buffer.from(actual, "utf8");
  if (expectedBuf.length !== actualBuf.length) {
    return false;
  }
  return timingSafeEqual(expectedBuf, actualBuf);
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
