import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import nodemailer from "nodemailer";

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

type SmtpAuth = {
  host: string;
  port: number;
  user: string;
  pass: string;
};

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(@Inject(ConfigService) private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return this.smtpAuth() !== null;
  }

  async sendStaffInvite(input: StaffInviteEmailInput): Promise<void> {
    const roleLabel = input.role.toLowerCase();
    await this.send(
      input.to,
      `You're invited to join ${input.studioName} on classa`,
      [
        `<p>You've been invited to join <strong>${escapeHtml(input.studioName)}</strong> as ${escapeHtml(roleLabel)}.</p>`,
        `<p><a href="${escapeHtml(input.inviteUrl)}">Accept invite</a></p>`,
        `<p>Or open this link: ${escapeHtml(input.inviteUrl)}</p>`,
      ].join(""),
    );
  }

  async sendPaymentInvoice(input: PaymentInvoiceEmailInput): Promise<void> {
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

    await this.send(
      input.to,
      `Payment receipt from ${input.studioName}`,
      [
        `<p>Hi ${escapeHtml(input.studentName)},</p>`,
        `<p>We've recorded your payment at <strong>${escapeHtml(input.studioName)}</strong>.</p>`,
        `<table style="border-collapse:collapse;width:100%;max-width:420px;margin:16px 0;font-family:system-ui,sans-serif;font-size:14px;">`,
        ...rows,
        `</table>`,
        `<p style="color:#666;font-size:12px;">Invoice ${escapeHtml(input.invoiceId)}</p>`,
      ].join(""),
    );
  }

  private smtpAuth(): SmtpAuth | null {
    const user = this.config.get<string>("SMTP_USER")?.trim();
    const pass = this.config.get<string>("SMTP_PASS")?.trim();
    if (!user || !pass) {
      return null;
    }

    const parsedPort = Number(this.config.get<string>("SMTP_PORT")?.trim());
    return {
      host:
        this.config.get<string>("SMTP_HOST")?.trim() ||
        "smtpout.secureserver.net",
      port: Number.isFinite(parsedPort) && parsedPort > 0 ? parsedPort : 465,
      user,
      pass,
    };
  }

  private async send(to: string, subject: string, html: string): Promise<void> {
    const auth = this.smtpAuth();
    if (!auth) {
      this.logger.warn(`SMTP_USER/SMTP_PASS missing — skipped email to ${to}`);
      return;
    }

    const from =
      this.config.get<string>("EMAIL_FROM")?.trim() || `classa <${auth.user}>`;
    const transport = nodemailer.createTransport({
      host: auth.host,
      port: auth.port,
      secure: auth.port === 465,
      auth: { user: auth.user, pass: auth.pass },
    });

    try {
      await transport.sendMail({ from, to, subject, html });
    } catch (error) {
      this.logger.error(error);
      throw new Error("Failed to send email");
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
