import { Inject, Injectable, Logger } from "@nestjs/common";
import { WhatsappService } from "../whatsapp/whatsapp.service";
import { InvoicePaymentLinkService } from "./invoice-payment-link.service";

@Injectable()
export class InvoiceCreatedHandler {
  private readonly logger = new Logger(InvoiceCreatedHandler.name);

  constructor(
    @Inject(InvoicePaymentLinkService)
    private readonly paymentLinks: InvoicePaymentLinkService,
    @Inject(WhatsappService) private readonly whatsapp: WhatsappService,
  ) {}

  async handle(invoiceId: string): Promise<void> {
    try {
      await this.paymentLinks.ensureInvoicePaymentLink(invoiceId);
    } catch (error) {
      this.logger.warn(
        `Payment link failed for invoice ${invoiceId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw error;
    }

    await this.whatsapp.sendInvoiceCreatedReminder(invoiceId);
  }
}
