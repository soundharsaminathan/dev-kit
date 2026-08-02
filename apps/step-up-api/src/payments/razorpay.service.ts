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

@Injectable()
export class RazorpayService {
  private client: Razorpay | null = null;

  constructor(@Inject(ConfigService) private readonly config: ConfigService) {}

  isEnabled(): boolean {
    const keyId = this.keyId();
    const keySecret = this.keySecret();
    return Boolean(keyId && keySecret);
  }

  keyId(): string {
    return (this.config.get<string>("RAZORPAY_KEY_ID") ?? "").trim();
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
  ): Promise<CreateRazorpayOrderResult> {
    if (!Number.isFinite(input.amountPaise) || input.amountPaise < 100) {
      throw new BadRequestException("Amount must be at least 100 paise");
    }

    try {
      const client = this.getClient();
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

  verifyPaymentSignature(input: VerifyPaymentSignatureInput): boolean {
    const secret = this.keySecret();
    if (!secret) {
      throw new BadRequestException("Razorpay is not configured");
    }

    const expected = createHmac("sha256", secret)
      .update(`${input.orderId}|${input.paymentId}`)
      .digest("hex");

    const expectedBuf = Buffer.from(expected, "utf8");
    const actualBuf = Buffer.from(input.signature, "utf8");
    if (expectedBuf.length !== actualBuf.length) {
      return false;
    }
    return timingSafeEqual(expectedBuf, actualBuf);
  }

  private keySecret(): string {
    return (this.config.get<string>("RAZORPAY_KEY_SECRET") ?? "").trim();
  }

  private getClient(): Razorpay {
    if (!this.isEnabled()) {
      throw new BadRequestException("Razorpay is not configured");
    }
    if (!this.client) {
      this.client = new Razorpay({
        key_id: this.keyId(),
        key_secret: this.keySecret(),
      });
    }
    return this.client;
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
