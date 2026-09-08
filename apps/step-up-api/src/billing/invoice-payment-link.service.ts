import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  DeliveryStatus,
  InvoiceStatus,
  NotificationType,
  PaymentMethod,
  type Prisma,
} from "@prisma/client";
import { EmailService } from "../email/email.service";
import {
  coveredMonthKeys,
  formatInvoicePeriodLabel,
} from "../email/invoice-receipt-pdf";
import { computeGst, computePlatformFee } from "../memberships/membership-helpers";
import { MembershipsService } from "../memberships/memberships.service";
import { NotificationsService } from "../notifications/notifications.service";
import {
  RazorpayService,
  type StudioRazorpaySettings,
} from "../payments/razorpay.service";
import { PrismaService } from "../prisma/prisma.service";
import { UserCryptoService } from "../users/user-crypto.service";
import { parseCombineMeta, parsePurchaseMeta } from "./family-combine";

function amountToPaise(amount: Prisma.Decimal | number | string) {
  const rupees = Number(amount);
  if (!Number.isFinite(rupees) || rupees <= 0) {
    return 0;
  }
  return Math.round(rupees * 100);
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function formatInr(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
}

@Injectable()
export class InvoicePaymentLinkService {
  private readonly logger = new Logger(InvoicePaymentLinkService.name);

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(RazorpayService) private readonly razorpay: RazorpayService,
    @Inject(UserCryptoService) private readonly crypto: UserCryptoService,
    @Inject(MembershipsService)
    private readonly memberships: MembershipsService,
    @Inject(NotificationsService)
    private readonly notifications: NotificationsService,
    @Inject(EmailService) private readonly email: EmailService,
    @Inject(ConfigService) private readonly config: ConfigService,
  ) {}

  async ensureInvoicePaymentLink(invoiceId: string): Promise<string | null> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        studio: {
          select: {
            id: true,
            name: true,
            settings: {
              select: {
                razorpayKeyId: true,
                razorpayKeySecret: true,
                razorpaySecretIv: true,
              },
            },
          },
        },
        student: true,
      },
    });

    if (!invoice) {
      return null;
    }

    if (
      invoice.status === InvoiceStatus.PAID ||
      invoice.status === InvoiceStatus.REFUNDED
    ) {
      return invoice.razorpayPaymentLinkUrl;
    }

    if (invoice.razorpayPaymentLinkUrl) {
      return invoice.razorpayPaymentLinkUrl;
    }

    const settings = invoice.studio.settings as StudioRazorpaySettings;
    if (!this.razorpay.isEnabled(settings ?? undefined)) {
      return null;
    }

    const amountPaise = amountToPaise(invoice.amount);
    if (amountPaise < 100) {
      return null;
    }

    const student = this.crypto.decryptUser(invoice.student);
    const description = `${invoice.studio.name} invoice`;

    const link = await this.razorpay.createPaymentLink(
      {
        amountPaise,
        invoiceId: invoice.id,
        description,
        customer: {
          name: student.name || undefined,
          contact: student.phone || student.alternateMobile || undefined,
          email: student.email || undefined,
        },
      },
      settings ?? undefined,
    );

    await this.prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        razorpayPaymentLinkId: link.id,
        razorpayPaymentLinkUrl: link.shortUrl,
      },
    });

    return link.shortUrl;
  }

  async resolvePayRedirectUrl(invoiceId: string): Promise<string> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: {
        id: true,
        razorpayPaymentLinkUrl: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException("Invoice not found");
    }

    if (invoice.razorpayPaymentLinkUrl) {
      return invoice.razorpayPaymentLinkUrl;
    }

    const appUrl =
      this.config.get<string>("APP_URL")?.trim().replace(/\/$/, "") ||
      "http://localhost:5199";
    return `${appUrl}/me/checkout/invoice/${invoice.id}`;
  }

  async settleInvoiceFromPaymentLink(input: {
    invoiceId: string;
    paymentId?: string | null;
    paymentLinkId?: string | null;
  }) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: input.invoiceId },
      include: {
        student: true,
        studio: {
          select: {
            id: true,
            name: true,
            address: true,
            settings: { select: { gstNumber: true } },
          },
        },
        membership: {
          select: {
            periodStart: true,
            periodEnd: true,
            subscription: { select: { billingCadence: true } },
          },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException("Invoice not found");
    }

    if (
      input.paymentLinkId &&
      invoice.razorpayPaymentLinkId &&
      invoice.razorpayPaymentLinkId !== input.paymentLinkId
    ) {
      throw new BadRequestException(
        "Razorpay payment link does not match this invoice",
      );
    }

    if (invoice.status === InvoiceStatus.PAID) {
      return {
        ...invoice,
        amount: Number(invoice.amount),
        alreadyPaid: true as const,
      };
    }

    if (
      invoice.status !== InvoiceStatus.PENDING &&
      invoice.status !== InvoiceStatus.OVERDUE
    ) {
      throw new BadRequestException("Invoice cannot be settled");
    }

    const purchaseMeta = parsePurchaseMeta(invoice.purchaseMeta);
    const combineMeta = parseCombineMeta(invoice.combineMeta);

    let membershipId = invoice.membershipId;
    if (!membershipId && purchaseMeta) {
      const membership = await this.memberships.assign({
        subscriptionId: purchaseMeta.subscriptionId,
        purchaserUserId: purchaseMeta.purchaserUserId,
        coveredStudents: purchaseMeta.coveredStudents,
      });
      membershipId = membership.id;
    }

    if (combineMeta) {
      for (const source of combineMeta.sources) {
        if (source.membershipId) {
          await this.memberships.renewFromPaidInvoice(source.membershipId);
        } else if (source.purchaseMeta) {
          await this.memberships.assign({
            subscriptionId: source.purchaseMeta.subscriptionId,
            purchaserUserId: source.purchaseMeta.purchaserUserId,
            coveredStudents: source.purchaseMeta.coveredStudents,
          });
        }
      }
    }

    const paidAt = new Date();
    const amountPaid = roundMoney(Number(invoice.amount));
    const result = await this.prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        status: InvoiceStatus.PAID,
        paymentMethod: PaymentMethod.RAZORPAY,
        paidAt,
        paymentHoldExpiresAt: null,
        ...(membershipId ? { membershipId } : {}),
        ...(input.paymentId ? { razorpayPaymentId: input.paymentId } : {}),
        ...(input.paymentLinkId && !invoice.razorpayPaymentLinkId
          ? { razorpayPaymentLinkId: input.paymentLinkId }
          : {}),
      },
    });

    if (invoice.membershipId) {
      await this.memberships.renewFromPaidInvoice(invoice.membershipId);
    }

    const student = this.crypto.decryptUser(invoice.student);
    const amountLabel = formatInr(amountPaid);
    const familyDiscount = Number(invoice.familyDiscount ?? 0);
    const referralDiscount = Number(invoice.referralDiscount ?? 0);
    const studioDiscount = Number(invoice.studioDiscount ?? 0);
    const printSubtotal = roundMoney(
      amountPaid + referralDiscount + studioDiscount + familyDiscount,
    );
    const gstAmount = computeGst(amountPaid, invoice.gstPercent);

    await this.notifications.create({
      userId: invoice.studentId,
      type: NotificationType.PAYMENT_RECEIVED,
      title: "Payment received",
      body: `Your payment of ${amountLabel} was recorded.`,
      dedupeKey: `PAYMENT_RECEIVED:${invoice.id}`,
      meta: {
        invoiceId: invoice.id,
        amount: amountPaid,
        referralDiscount,
        studioDiscount,
        familyDiscount,
      },
      entityType: "invoice",
      entityId: invoice.id,
    });

    if (student.email) {
      const billMonthKeys = coveredMonthKeys({
        periodStart: invoice.membership?.periodStart ?? null,
        periodEnd: invoice.membership?.periodEnd ?? null,
        billingCadence:
          invoice.membership?.subscription?.billingCadence ?? null,
      });
      void this.email
        .sendPaymentInvoice({
          to: student.email,
          studentName: student.name || "there",
          studioName: invoice.studio.name,
          studioAddress: invoice.studio.address,
          gstNumber: invoice.studio.settings?.gstNumber,
          invoiceId: invoice.id,
          subtotal: printSubtotal,
          referralDiscount,
          studioDiscount,
          familyDiscount,
          gstPercent: invoice.gstPercent,
          gstAmount,
          amountPaid,
          paymentMethod: PaymentMethod.RAZORPAY,
          paidAt,
          status: InvoiceStatus.PAID,
          billMonth: invoice.membership?.periodStart ?? paidAt,
          billMonthKeys,
          billPeriodLabel: formatInvoicePeriodLabel(billMonthKeys) || null,
        })
        .catch((error: unknown) => {
          this.logger.error(
            `Failed to email payment invoice ${invoice.id}`,
            error instanceof Error ? error.stack : String(error),
          );
        });
    }

    return {
      ...result,
      amount: Number(result.amount),
      studioId: result.studioId,
      studentId: result.studentId,
      alreadyPaid: false as const,
      platformFeeComputed: computePlatformFee(
        amountPaid,
        invoice.platformFeePercent,
      ),
    };
  }

  async handleRazorpayWebhook(rawBody: Buffer, signature: string | undefined) {
    let payload: {
      event?: string;
      payload?: {
        payment_link?: {
          entity?: {
            id?: string;
            notes?: Record<string, unknown> | null;
            reference_id?: string | null;
          };
        };
        payment?: {
          entity?: {
            id?: string;
          };
        };
      };
    };

    try {
      payload = JSON.parse(rawBody.toString("utf8")) as typeof payload;
    } catch {
      throw new BadRequestException("Invalid webhook JSON");
    }

    const paymentLink = payload.payload?.payment_link?.entity;
    const paymentLinkId = paymentLink?.id?.trim() || null;
    const notesInvoiceId =
      typeof paymentLink?.notes?.invoiceId === "string"
        ? paymentLink.notes.invoiceId.trim()
        : "";
    const referenceId = paymentLink?.reference_id?.trim() || "";
    const invoiceId = notesInvoiceId || referenceId;

    let invoice =
      invoiceId.length > 0
        ? await this.prisma.invoice.findUnique({
            where: { id: invoiceId },
            include: {
              studio: {
                select: {
                  settings: {
                    select: {
                      razorpayWebhookSecret: true,
                      razorpayWebhookSecretIv: true,
                    },
                  },
                },
              },
            },
          })
        : null;

    if (!invoice && paymentLinkId) {
      invoice = await this.prisma.invoice.findFirst({
        where: { razorpayPaymentLinkId: paymentLinkId },
        include: {
          studio: {
            select: {
              settings: {
                select: {
                  razorpayWebhookSecret: true,
                  razorpayWebhookSecretIv: true,
                },
              },
            },
          },
        },
      });
    }

    const envSecret =
      this.config.get<string>("RAZORPAY_WEBHOOK_SECRET")?.trim() || "";
    let studioSecret = "";
    const sealed = invoice?.studio.settings?.razorpayWebhookSecret;
    const iv = invoice?.studio.settings?.razorpayWebhookSecretIv;
    if (sealed && iv) {
      try {
        studioSecret = this.crypto.decryptStudioSecret(sealed, iv).trim();
      } catch {
        this.logger.warn(
          `Could not decrypt Razorpay webhook secret for invoice ${invoice?.id ?? "unknown"}`,
        );
      }
    }

    const secret = studioSecret || envSecret;
    if (!secret || !signature) {
      throw new BadRequestException("Invalid webhook signature");
    }

    const valid = this.razorpay.verifyWebhookSignature(
      rawBody,
      signature,
      secret,
    );
    if (!valid) {
      throw new BadRequestException("Invalid webhook signature");
    }

    if (payload.event !== "payment_link.paid") {
      return { ok: true as const, ignored: true as const };
    }

    if (!invoice) {
      this.logger.warn(
        `Razorpay payment_link.paid for unknown invoice (link=${paymentLinkId ?? "n/a"})`,
      );
      return { ok: true as const, ignored: true as const };
    }

    const paymentId = payload.payload?.payment?.entity?.id?.trim() || null;
    const settled = await this.settleInvoiceFromPaymentLink({
      invoiceId: invoice.id,
      paymentId,
      paymentLinkId,
    });

    return {
      ok: true as const,
      invoiceId: invoice.id,
      alreadyPaid: settled.alreadyPaid,
      amount: settled.amount,
      studioId: settled.studioId,
      studentId: settled.studentId,
    };
  }
}
