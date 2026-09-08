import { BadRequestException } from "@nestjs/common";
import { InvoiceStatus, PaymentMethod } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InvoicePaymentLinkService } from "./invoice-payment-link.service";

describe("InvoicePaymentLinkService", () => {
  const prisma = {
    invoice: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  };
  const razorpay = {
    isEnabled: vi.fn(),
    createPaymentLink: vi.fn(),
    verifyWebhookSignature: vi.fn(),
  };
  const crypto = {
    decryptUser: vi.fn(),
    decryptStudioSecret: vi.fn(),
  };
  const memberships = {
    assign: vi.fn(),
    renewFromPaidInvoice: vi.fn(),
  };
  const notifications = { create: vi.fn() };
  const email = { sendPaymentInvoice: vi.fn() };
  const config = {
    get: vi.fn((key: string) => {
      if (key === "APP_URL") return "http://localhost:5199";
      if (key === "RAZORPAY_WEBHOOK_SECRET") return "whsec";
      return undefined;
    }),
  };

  let service: InvoicePaymentLinkService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new InvoicePaymentLinkService(
      prisma as never,
      razorpay as never,
      crypto as never,
      memberships as never,
      notifications as never,
      email as never,
      config as never,
    );
  });

  describe("ensureInvoicePaymentLink", () => {
    it("returns existing short URL without creating again", async () => {
      prisma.invoice.findUnique.mockResolvedValue({
        id: "inv-1",
        status: InvoiceStatus.PENDING,
        amount: 500,
        razorpayPaymentLinkUrl: "https://rzp.io/i/abc",
        studio: { id: "s1", name: "Studio", settings: null },
        student: {},
      });

      await expect(service.ensureInvoicePaymentLink("inv-1")).resolves.toBe(
        "https://rzp.io/i/abc",
      );
      expect(razorpay.createPaymentLink).not.toHaveBeenCalled();
    });

    it("skips when Razorpay is disabled", async () => {
      prisma.invoice.findUnique.mockResolvedValue({
        id: "inv-1",
        status: InvoiceStatus.PENDING,
        amount: 500,
        razorpayPaymentLinkUrl: null,
        studio: { id: "s1", name: "Studio", settings: null },
        student: {},
      });
      razorpay.isEnabled.mockReturnValue(false);

      await expect(service.ensureInvoicePaymentLink("inv-1")).resolves.toBeNull();
      expect(razorpay.createPaymentLink).not.toHaveBeenCalled();
    });

    it("skips when amount is below 100 paise", async () => {
      prisma.invoice.findUnique.mockResolvedValue({
        id: "inv-1",
        status: InvoiceStatus.PENDING,
        amount: 0.5,
        razorpayPaymentLinkUrl: null,
        studio: { id: "s1", name: "Studio", settings: {} },
        student: {},
      });
      razorpay.isEnabled.mockReturnValue(true);

      await expect(service.ensureInvoicePaymentLink("inv-1")).resolves.toBeNull();
      expect(razorpay.createPaymentLink).not.toHaveBeenCalled();
    });

    it("creates and stores a payment link", async () => {
      prisma.invoice.findUnique.mockResolvedValue({
        id: "inv-1",
        studentId: "u-1",
        status: InvoiceStatus.PENDING,
        amount: 1000,
        razorpayPaymentLinkUrl: null,
        studio: { id: "s1", name: "Floor One", settings: {} },
        student: {},
      });
      razorpay.isEnabled.mockReturnValue(true);
      crypto.decryptUser.mockReturnValue({
        name: "Ada",
        phone: "9876543210",
        email: "ada@example.com",
      });
      razorpay.createPaymentLink.mockResolvedValue({
        id: "plink_1",
        shortUrl: "https://rzp.io/i/xyz",
      });
      prisma.invoice.update.mockResolvedValue({});

      await expect(service.ensureInvoicePaymentLink("inv-1")).resolves.toBe(
        "https://rzp.io/i/xyz",
      );
      expect(prisma.invoice.update).toHaveBeenCalledWith({
        where: { id: "inv-1" },
        data: {
          razorpayPaymentLinkId: "plink_1",
          razorpayPaymentLinkUrl: "https://rzp.io/i/xyz",
        },
      });
    });
  });

  describe("resolvePayRedirectUrl", () => {
    it("redirects to Razorpay short URL when present", async () => {
      prisma.invoice.findUnique.mockResolvedValue({
        id: "inv-1",
        razorpayPaymentLinkUrl: "https://rzp.io/i/abc",
      });
      await expect(service.resolvePayRedirectUrl("inv-1")).resolves.toBe(
        "https://rzp.io/i/abc",
      );
    });

    it("falls back to in-app checkout when no link", async () => {
      prisma.invoice.findUnique.mockResolvedValue({
        id: "inv-1",
        razorpayPaymentLinkUrl: null,
      });
      await expect(service.resolvePayRedirectUrl("inv-1")).resolves.toBe(
        "http://localhost:5199/me/checkout/invoice/inv-1",
      );
    });
  });

  describe("settleInvoiceFromPaymentLink", () => {
    it("no-ops when already paid", async () => {
      prisma.invoice.findUnique.mockResolvedValue({
        id: "inv-1",
        status: InvoiceStatus.PAID,
        amount: 1000,
        razorpayPaymentLinkId: "plink_1",
        student: {},
        studio: { id: "s1", name: "Studio", address: null, settings: null },
        membership: null,
      });

      const result = await service.settleInvoiceFromPaymentLink({
        invoiceId: "inv-1",
        paymentLinkId: "plink_1",
      });
      expect(result.alreadyPaid).toBe(true);
      expect(prisma.invoice.update).not.toHaveBeenCalled();
    });

    it("rejects mismatched payment link id", async () => {
      prisma.invoice.findUnique.mockResolvedValue({
        id: "inv-1",
        status: InvoiceStatus.PENDING,
        amount: 1000,
        razorpayPaymentLinkId: "plink_1",
        student: {},
        studio: { id: "s1", name: "Studio", address: null, settings: null },
        membership: null,
      });

      await expect(
        service.settleInvoiceFromPaymentLink({
          invoiceId: "inv-1",
          paymentLinkId: "plink_other",
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("renews membership when membershipId is present", async () => {
      prisma.invoice.findUnique.mockResolvedValue({
        id: "inv-1",
        studentId: "u-1",
        studioId: "s1",
        status: InvoiceStatus.PENDING,
        amount: 1000,
        familyDiscount: 0,
        referralDiscount: 0,
        studioDiscount: 0,
        gstPercent: 0,
        platformFeePercent: 5,
        membershipId: "mem-1",
        razorpayPaymentLinkId: "plink_1",
        purchaseMeta: null,
        combineMeta: null,
        student: {},
        studio: { id: "s1", name: "Studio", address: null, settings: null },
        membership: {
          periodStart: new Date("2026-09-01"),
          periodEnd: new Date("2026-09-30"),
          subscription: { billingCadence: "MONTHLY" },
        },
      });
      crypto.decryptUser.mockReturnValue({
        id: "u-1",
        name: "Ada",
        email: null,
      });
      prisma.invoice.update.mockResolvedValue({
        id: "inv-1",
        studioId: "s1",
        studentId: "u-1",
        amount: 1000,
        status: InvoiceStatus.PAID,
      });

      await service.settleInvoiceFromPaymentLink({
        invoiceId: "inv-1",
        paymentId: "pay_1",
        paymentLinkId: "plink_1",
      });

      expect(memberships.renewFromPaidInvoice).toHaveBeenCalledWith("mem-1");
      expect(prisma.invoice.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: InvoiceStatus.PAID,
            paymentMethod: PaymentMethod.RAZORPAY,
            razorpayPaymentId: "pay_1",
          }),
        }),
      );
    });
  });

  describe("handleRazorpayWebhook", () => {
    it("rejects invalid signatures", async () => {
      razorpay.verifyWebhookSignature.mockReturnValue(false);
      const body = Buffer.from(
        JSON.stringify({
          event: "payment_link.paid",
          payload: {
            payment_link: {
              entity: { id: "plink_1", notes: { invoiceId: "inv-1" } },
            },
          },
        }),
      );
      prisma.invoice.findUnique.mockResolvedValue({
        id: "inv-1",
        studio: { settings: null },
      });

      await expect(
        service.handleRazorpayWebhook(body, "bad-sig"),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("settles on payment_link.paid", async () => {
      razorpay.verifyWebhookSignature.mockReturnValue(true);
      const body = Buffer.from(
        JSON.stringify({
          event: "payment_link.paid",
          payload: {
            payment_link: {
              entity: { id: "plink_1", notes: { invoiceId: "inv-1" } },
            },
            payment: { entity: { id: "pay_1" } },
          },
        }),
      );
      const unpaid = {
        id: "inv-1",
        studentId: "u-1",
        studioId: "s1",
        status: InvoiceStatus.PENDING,
        amount: 1000,
        familyDiscount: 0,
        referralDiscount: 0,
        studioDiscount: 0,
        gstPercent: 0,
        platformFeePercent: 5,
        membershipId: null,
        razorpayPaymentLinkId: "plink_1",
        purchaseMeta: {
          subscriptionId: "sub-1",
          purchaserUserId: "u-1",
          coveredStudents: [{ studentId: "u-1", seatRole: "ADULT" }],
        },
        combineMeta: null,
        student: {},
        studio: {
          id: "s1",
          name: "Studio",
          address: null,
          settings: null,
        },
        membership: null,
      };
      prisma.invoice.findUnique
        .mockResolvedValueOnce({
          id: "inv-1",
          studio: { settings: null },
        })
        .mockResolvedValueOnce(unpaid);
      memberships.assign.mockResolvedValue({ id: "mem-new" });
      crypto.decryptUser.mockReturnValue({
        id: "u-1",
        name: "Ada",
        email: null,
      });
      prisma.invoice.update.mockResolvedValue({
        id: "inv-1",
        studioId: "s1",
        studentId: "u-1",
        amount: 1000,
      });

      const result = await service.handleRazorpayWebhook(body, "good-sig");
      expect(result).toMatchObject({
        ok: true,
        invoiceId: "inv-1",
        alreadyPaid: false,
      });
      expect(memberships.assign).toHaveBeenCalled();
    });
  });
});
