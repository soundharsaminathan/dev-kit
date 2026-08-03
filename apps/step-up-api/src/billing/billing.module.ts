import { forwardRef, Module } from "@nestjs/common";
import { MembershipsModule } from "../memberships/memberships.module";
import { PaymentsModule } from "../payments/payments.module";
import { BillingController } from "./billing.controller";
import { BillingService } from "./billing.service";

@Module({
  imports: [forwardRef(() => MembershipsModule), PaymentsModule],
  controllers: [BillingController],
  providers: [BillingService],
  exports: [BillingService],
})
export class BillingModule {}
