import {
  BadRequestException,
  Controller,
  Get,
  Headers,
  Inject,
  Param,
  Post,
  Req,
  Res,
} from "@nestjs/common";
import type { RawBodyRequest } from "@nestjs/common";
import type { Request, Response } from "express";
import { OutboxService } from "../events/outbox.service";
import { PrismaService } from "../prisma/prisma.service";
import { ProjectionService } from "../queues/processors/projection.service";
import { OUTBOX_EVENT_PAYMENT_CONFIRMED } from "../shared/outbox-events";
import { InvoicePaymentLinkService } from "./invoice-payment-link.service";

@Controller("billing")
export class BillingPublicController {
  constructor(
    @Inject(InvoicePaymentLinkService)
    private readonly paymentLinks: InvoicePaymentLinkService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(OutboxService) private readonly outbox: OutboxService,
    @Inject(ProjectionService)
    private readonly projections: ProjectionService,
  ) {}

  @Get("pay/:invoiceId")
  async payRedirect(
    @Param("invoiceId") invoiceId: string,
    @Res() res: Response,
  ) {
    const url = await this.paymentLinks.resolvePayRedirectUrl(invoiceId);
    return res.redirect(302, url);
  }

  @Post("webhooks/razorpay")
  async razorpayWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers("x-razorpay-signature") signature: string | undefined,
  ) {
    const rawBody = req.rawBody;
    if (!rawBody || !Buffer.isBuffer(rawBody)) {
      throw new BadRequestException("Raw body required for webhook verification");
    }

    const result = await this.paymentLinks.handleRazorpayWebhook(
      rawBody,
      signature,
    );

    if (
      result.ok &&
      !("ignored" in result && result.ignored) &&
      "invoiceId" in result &&
      result.invoiceId &&
      !result.alreadyPaid
    ) {
      await this.outbox.append(
        this.prisma,
        OUTBOX_EVENT_PAYMENT_CONFIRMED,
        {
          invoiceId: result.invoiceId,
          studioId: result.studioId,
          studentId: result.studentId,
          amount: String(result.amount),
        },
        { studioId: result.studioId },
      );
      await this.projections.refreshStudioRevenue(result.studioId);
    }

    return { ok: true };
  }
}
