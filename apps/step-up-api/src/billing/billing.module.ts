import { Module, forwardRef } from "@nestjs/common";
import { EmailModule } from "../email/email.module";
import { MembershipsModule } from "../memberships/memberships.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { PaymentsModule } from "../payments/payments.module";
import { UsersModule } from "../users/users.module";
import { WhatsappModule } from "../whatsapp/whatsapp.module";
import { BillingCommandsService } from "./application/billing.commands";
import { BillingQueriesService } from "./application/billing.queries";
import { BillingPublicController } from "./billing-public.controller";
import { BillingController } from "./billing.controller";
import { BillingService } from "./billing.service";
import { InvoiceCreatedHandler } from "./invoice-created.handler";
import { InvoicePaymentLinkService } from "./invoice-payment-link.service";
import { BillingQuery } from "./persistence/billing.query";

@Module({
  imports: [
    forwardRef(() => MembershipsModule),
    PaymentsModule,
    NotificationsModule,
    EmailModule,
    UsersModule,
    WhatsappModule,
  ],
  controllers: [BillingPublicController, BillingController],
  providers: [
    BillingService,
    BillingQuery,
    BillingQueriesService,
    BillingCommandsService,
    InvoicePaymentLinkService,
    InvoiceCreatedHandler,
  ],
  exports: [
    BillingService,
    BillingQueriesService,
    BillingCommandsService,
    InvoicePaymentLinkService,
    InvoiceCreatedHandler,
  ],
})
export class BillingModule {}
