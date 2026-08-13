import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export type StaffInviteEmailInput = {
  to: string;
  studioName: string;
  inviteUrl: string;
  role: string;
};

export type PaymentInvoiceEmailInput = {
  to: string;
  studentName: string;
  studioName: string;
  invoiceId: string;
  subtotal: number;
  referralDiscount: number;
  studioDiscount: number;
  familyDiscount?: number;
  gstPercent?: number;
  gstAmount?: number;
  amountPaid: number;
  paymentMethod: string;
  paidAt: Date;
};

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(@Inject(ConfigService) private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(this.config.get<string>("RESEND_API_KEY")?.trim());
  }

  async sendStaffInvite(input: StaffInviteEmailInput): Promise<void> {
    const apiKey = this.config.get<string>("RESEND_API_KEY")?.trim();
    const from =
      this.config.get<string>("EMAIL_FROM")?.trim() ||
      "Step Up <onboarding@resend.dev>";

    if (!apiKey) {
      this.logger.warn(
        `RESEND_API_KEY missing — skipped invite email to ${input.to}`,
      );
      return;
    }

    const roleLabel = input.role.toLowerCase();
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: `You're invited to join ${input.studioName} on Step Up`,
        html: [
          `<p>You've been invited to join <strong>${escapeHtml(input.studioName)}</strong> as ${escapeHtml(roleLabel)}.</p>`,
          `<p><a href="${escapeHtml(input.inviteUrl)}">Accept invite</a></p>`,
          `<p>Or open this link: ${escapeHtml(input.inviteUrl)}</p>`,
        ].join(""),
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      this.logger.error(`Resend failed (${response.status}): ${body}`);
      throw new Error("Failed to send invite email");
    }
  }

  async sendPaymentInvoice(input: PaymentInvoiceEmailInput): Promise<void> {
    const apiKey = this.config.get<string>("RESEND_API_KEY")?.trim();
    const from =
      this.config.get<string>("EMAIL_FROM")?.trim() ||
      "Step Up <onboarding@resend.dev>";

    if (!apiKey) {
      this.logger.warn(
        `RESEND_API_KEY missing — skipped payment invoice email to ${input.to}`,
      );
      return;
    }

    const paidAtLabel = input.paidAt.toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
    const methodLabel = formatPaymentMethod(input.paymentMethod);
    const familyDiscount = input.familyDiscount ?? 0;
    const gstPercent = input.gstPercent ?? 0;
    const gstAmount = input.gstAmount ?? 0;
    const rows = [
      row("Subtotal", formatInr(input.subtotal)),
      ...(input.referralDiscount > 0
        ? [row("Referral discount", `−${formatInr(input.referralDiscount)}`)]
        : []),
      ...(input.studioDiscount > 0
        ? [row("Studio discount", `−${formatInr(input.studioDiscount)}`)]
        : []),
      ...(familyDiscount > 0
        ? [row("Family discount", `−${formatInr(familyDiscount)}`)]
        : []),
      ...(gstPercent > 0
        ? [row(`GST (${gstPercent}%)`, formatInr(gstAmount))]
        : []),
      row("Amount paid", formatInr(input.amountPaid), true),
      row("Payment method", methodLabel),
      row("Paid at", paidAtLabel),
    ];

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: `Payment receipt from ${input.studioName}`,
        html: [
          `<p>Hi ${escapeHtml(input.studentName)},</p>`,
          `<p>We've recorded your payment at <strong>${escapeHtml(input.studioName)}</strong>.</p>`,
          `<table style="border-collapse:collapse;width:100%;max-width:420px;margin:16px 0;font-family:system-ui,sans-serif;font-size:14px;">`,
          ...rows,
          `</table>`,
          `<p style="color:#666;font-size:12px;">Invoice ${escapeHtml(input.invoiceId)}</p>`,
        ].join(""),
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      this.logger.error(`Resend failed (${response.status}): ${body}`);
      throw new Error("Failed to send payment invoice email");
    }
  }
}

function formatInr(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatPaymentMethod(method: string) {
  switch (method) {
    case "CASH":
      return "Cash";
    case "UPI_MANUAL":
      return "UPI";
    case "RAZORPAY":
      return "Online";
    default:
      return method;
  }
}

function row(label: string, value: string, strong = false) {
  const weight = strong ? "font-weight:600;" : "";
  return [
    `<tr>`,
    `<td style="padding:6px 0;color:#555;${weight}">${escapeHtml(label)}</td>`,
    `<td style="padding:6px 0;text-align:right;${weight}">${escapeHtml(value)}</td>`,
    `</tr>`,
  ].join("");
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
