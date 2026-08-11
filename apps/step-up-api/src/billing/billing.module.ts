import { forwardRef, Module } from "@nestjs/common";
import { EmailModule } from "../email/email.module";
import { MembershipsModule } from "../memberships/memberships.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { PaymentsModule } from "../payments/payments.module";
import { UsersModule } from "../users/users.module";
import { BillingCommandsService } from "./application/billing.commands";
import { BillingQueriesService } from "./application/billing.queries";
import { BillingController } from "./billing.controller";
import { BillingService } from "./billing.service";
import { BillingQuery } from "./persistence/billing.query";

@Module({
  imports: [
    forwardRef(() => MembershipsModule),
    PaymentsModule,
    NotificationsModule,
    EmailModule,
    UsersModule,
  ],
  controllers: [BillingController],
  providers: [
    BillingService,
    BillingQuery,
    BillingQueriesService,
    BillingCommandsService,
  ],
  exports: [BillingService, BillingQueriesService, BillingCommandsService],
})
export class BillingModule {}
