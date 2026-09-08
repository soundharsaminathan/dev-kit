import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DeliveryStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { UserCryptoService } from "../users/user-crypto.service";

export function toE164(phone: string | null | undefined): string | null {
  if (!phone) {
    return null;
  }
  const digits = phone.replace(/[^\d+]/g, "");
  const normalized = digits.startsWith("+")
    ? `+${digits.slice(1).replace(/\D/g, "")}`
    : digits.replace(/\D/g, "");

  if (normalized.startsWith("+") && /^\+[1-9]\d{7,14}$/.test(normalized)) {
    return normalized.slice(1);
  }

  if (/^\d{10}$/.test(normalized)) {
    return `91${normalized}`;
  }

  if (/^91\d{10}$/.test(normalized)) {
    return normalized;
  }

  if (/^[1-9]\d{7,14}$/.test(normalized)) {
    return normalized;
  }

  return null;
}

function firstName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) {
    return "there";
  }
  return trimmed.split(/\s+/)[0] ?? "there";
}

function formatInrAmount(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
  }).format(amount);
}

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  constructor(
    @Inject(ConfigService) private readonly config: ConfigService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(UserCryptoService) private readonly crypto: UserCryptoService,
  ) {}

  isConfigured(): boolean {
    return Boolean(this.token() && this.phoneNumberId());
  }

  private token(): string {
    return (this.config.get<string>("WHATSAPP_TOKEN") ?? "").trim();
  }

  private phoneNumberId(): string {
    return (this.config.get<string>("WHATSAPP_PHONE_NUMBER_ID") ?? "").trim();
  }

  private templateName(): string {
    return (
      (this.config.get<string>("WHATSAPP_TEMPLATE_NAME") ?? "").trim() ||
      "invoice_created"
    );
  }

  private templateLanguage(): string {
    return (
      (this.config.get<string>("WHATSAPP_TEMPLATE_LANGUAGE") ?? "").trim() ||
      "en"
    );
  }

  private graphVersion(): string {
    return (
      (this.config.get<string>("WHATSAPP_GRAPH_VERSION") ?? "").trim() ||
      "v21.0"
    );
  }

  async sendTemplate(input: {
    to: string;
    bodyParams: string[];
    urlSuffix: string;
  }): Promise<{ providerId: string }> {
    const token = this.token();
    const phoneNumberId = this.phoneNumberId();
    if (!token || !phoneNumberId) {
      throw new Error("WhatsApp is not configured");
    }

    const url = `https://graph.facebook.com/${this.graphVersion()}/${phoneNumberId}/messages`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: input.to,
        type: "template",
        template: {
          name: this.templateName(),
          language: { code: this.templateLanguage() },
          components: [
            {
              type: "body",
              parameters: input.bodyParams.map((text) => ({
                type: "text",
                text,
              })),
            },
            {
              type: "button",
              sub_type: "url",
              index: "0",
              parameters: [
                {
                  type: "text",
                  text: input.urlSuffix,
                },
              ],
            },
          ],
        },
      }),
    });

    const body = (await response.json().catch(() => null)) as {
      messages?: Array<{ id?: string }>;
      error?: { message?: string; code?: number };
    } | null;

    if (!response.ok) {
      const message =
        body?.error?.message ??
        `WhatsApp Graph API error (${response.status})`;
      const error = new Error(message) as Error & { code?: string };
      error.code = body?.error?.code
        ? String(body.error.code)
        : String(response.status);
      throw error;
    }

    const providerId = body?.messages?.[0]?.id?.trim() ?? "";
    if (!providerId) {
      throw new Error("WhatsApp Graph API returned no message id");
    }

    return { providerId };
  }

  async sendInvoiceCreatedReminder(invoiceId: string): Promise<{
    status: "SENT" | "SKIPPED";
    reason?: string;
  }> {
    if (!this.isConfigured()) {
      return { status: "SKIPPED", reason: "unconfigured" };
    }

    const existing = await this.prisma.whatsappMessage.findUnique({
      where: { invoiceId },
    });
    if (existing?.status === DeliveryStatus.SENT) {
      return { status: "SKIPPED", reason: "already_sent" };
    }

    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        student: true,
        studio: { select: { id: true, name: true } },
      },
    });

    if (!invoice) {
      return { status: "SKIPPED", reason: "missing_invoice" };
    }

    const amount = Number(invoice.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      await this.upsertMessage({
        invoiceId,
        userId: invoice.studentId,
        studioId: invoice.studioId,
        status: DeliveryStatus.SKIPPED,
        errorCode: "zero_amount",
      });
      return { status: "SKIPPED", reason: "zero_amount" };
    }

    const student = this.crypto.decryptUser(invoice.student);
    const to = toE164(student.phone) ?? toE164(student.alternateMobile);
    if (!to) {
      await this.upsertMessage({
        invoiceId,
        userId: invoice.studentId,
        studioId: invoice.studioId,
        status: DeliveryStatus.SKIPPED,
        errorCode: "no_phone",
      });
      return { status: "SKIPPED", reason: "no_phone" };
    }

    const row = await this.upsertMessage({
      invoiceId,
      userId: invoice.studentId,
      studioId: invoice.studioId,
      status: DeliveryStatus.PENDING,
      errorCode: null,
    });

    try {
      const { providerId } = await this.sendTemplate({
        to,
        bodyParams: [
          firstName(student.name),
          formatInrAmount(amount),
          invoice.studio.name.trim() || "your studio",
        ],
        urlSuffix: invoice.id,
      });

      await this.prisma.whatsappMessage.update({
        where: { id: row.id },
        data: {
          status: DeliveryStatus.SENT,
          providerId,
          errorCode: null,
          sentAt: new Date(),
        },
      });

      return { status: "SENT" };
    } catch (error) {
      const code =
        error && typeof error === "object" && "code" in error
          ? String((error as { code?: string }).code ?? "send_failed")
          : "send_failed";
      await this.prisma.whatsappMessage.update({
        where: { id: row.id },
        data: {
          status: DeliveryStatus.FAILED,
          errorCode: code.slice(0, 64),
        },
      });
      this.logger.warn(
        `WhatsApp send failed for invoice ${invoiceId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw error;
    }
  }

  private async upsertMessage(input: {
    invoiceId: string;
    userId: string;
    studioId: string;
    status: DeliveryStatus;
    errorCode: string | null;
  }) {
    return this.prisma.whatsappMessage.upsert({
      where: { invoiceId: input.invoiceId },
      create: {
        invoiceId: input.invoiceId,
        userId: input.userId,
        studioId: input.studioId,
        template: this.templateName(),
        status: input.status,
        errorCode: input.errorCode,
      },
      update: {
        userId: input.userId,
        studioId: input.studioId,
        template: this.templateName(),
        status: input.status,
        errorCode: input.errorCode,
      },
    });
  }
}
