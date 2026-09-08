import { Module, forwardRef } from "@nestjs/common";
import { EmailModule } from "../email/email.module";
import { MembershipsModule } from "../memberships/memberships.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { PaymentsModule } from "../payments/payments.module";
import { UserCryptoModule } from "../users/user-crypto.module";
import { WhatsappModule } from "../whatsapp/whatsapp.module";
import { InvoiceCreatedHandler } from "./invoice-created.handler";
import { InvoicePaymentLinkService } from "./invoice-payment-link.service";

/**
 * Worker-safe slice: invoice.created outbox handler (payment link + WhatsApp).
 * No HTTP controllers.
 */
@Module({
  imports: [
    forwardRef(() => MembershipsModule),
    PaymentsModule,
    NotificationsModule,
    EmailModule,
    UserCryptoModule,
    WhatsappModule,
  ],
  providers: [InvoicePaymentLinkService, InvoiceCreatedHandler],
  exports: [InvoicePaymentLinkService, InvoiceCreatedHandler],
})
export class InvoiceCreatedModule {}
