import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export type StaffInviteEmailInput = {
  to: string;
  studioName: string;
  inviteUrl: string;
  role: string;
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
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
