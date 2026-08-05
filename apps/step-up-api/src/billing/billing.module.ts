import { forwardRef, Module } from "@nestjs/common";
import { EmailModule } from "../email/email.module";
import { MembershipsModule } from "../memberships/memberships.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { PaymentsModule } from "../payments/payments.module";
import { BillingController } from "./billing.controller";
import { BillingService } from "./billing.service";

@Module({
  imports: [
    forwardRef(() => MembershipsModule),
    PaymentsModule,
    NotificationsModule,
    EmailModule,
  ],
  controllers: [BillingController],
  providers: [BillingService],
  exports: [BillingService],
})
export class BillingModule {}
