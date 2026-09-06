import { beforeEach, describe, expect, it, vi } from "vitest";
import { EmailService } from "./email.service";

const { sendMail, createTransport } = vi.hoisted(() => {
  const sendMail = vi.fn();
  const createTransport = vi.fn(() => ({ sendMail }));
  return { sendMail, createTransport };
});

vi.mock("nodemailer", () => ({
  default: { createTransport },
  createTransport,
}));

describe("EmailService", () => {
  const configValues: Record<string, string> = {};
  const config = {
    get: vi.fn((key: string) => configValues[key]),
  };

  let service: EmailService;

  beforeEach(() => {
    vi.clearAllMocks();
    for (const key of Object.keys(configValues)) {
      delete configValues[key];
    }
    service = new EmailService(config as never);
  });

  it("skips send when SMTP credentials are missing", async () => {
    await service.sendStaffInvite({
      to: "staff@stepup.dev",
      studioName: "classa",
      inviteUrl: "http://localhost:5199/join?token=abc",
      role: "STAFF",
    });
    expect(createTransport).not.toHaveBeenCalled();
    expect(sendMail).not.toHaveBeenCalled();
  });

  it("sends staff invites through GoDaddy SMTP when configured", async () => {
    configValues.SMTP_USER = "info@classa.in";
    configValues.SMTP_PASS = "mailbox-pass";
    configValues.EMAIL_FROM = "classa <info@classa.in>";
    sendMail.mockResolvedValue({ messageId: "1" });

    await service.sendStaffInvite({
      to: "staff@stepup.dev",
      studioName: "classa",
      inviteUrl: "http://localhost:5199/join?token=abc",
      role: "STAFF",
    });

    expect(createTransport).toHaveBeenCalledWith({
      host: "smtpout.secureserver.net",
      port: 465,
      secure: true,
      auth: { user: "info@classa.in", pass: "mailbox-pass" },
    });
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "classa <info@classa.in>",
        to: "staff@stepup.dev",
        subject: "You're invited to join classa on classa",
      }),
    );
  });

  it("sends payment receipts through SMTP", async () => {
    configValues.SMTP_HOST = "smtp.titan.email";
    configValues.SMTP_PORT = "465";
    configValues.SMTP_USER = "info@classa.in";
    configValues.SMTP_PASS = "mailbox-pass";
    sendMail.mockResolvedValue({ messageId: "2" });

    await service.sendPaymentInvoice({
      to: "student@stepup.dev",
      studentName: "Asha",
      studioName: "Floor One",
      invoiceId: "inv_1",
      subtotal: 1000,
      referralDiscount: 0,
      studioDiscount: 0,
      amountPaid: 1000,
      paymentMethod: "UPI_MANUAL",
      paidAt: new Date("2026-09-06T10:00:00.000Z"),
    });

    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        host: "smtp.titan.email",
        port: 465,
        secure: true,
      }),
    );
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "classa <info@classa.in>",
        to: "student@stepup.dev",
        subject: "Payment receipt from Floor One",
      }),
    );
  });
});
