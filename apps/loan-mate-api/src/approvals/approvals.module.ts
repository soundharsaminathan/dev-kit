import { forwardRef, Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { ClosuresModule } from "../closures/closures.module";
import { CustomersModule } from "../customers/customers.module";
import { LoansModule } from "../loans/loans.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { PaymentsModule } from "../payments/payments.module";
import { ApprovalApplicatorService } from "./approval-applicator.service";
import { ApprovalsController } from "./approvals.controller";
import { ApprovalsService } from "./approvals.service";

@Module({
  imports: [
    AuditModule,
    ClosuresModule,
    forwardRef(() => LoansModule),
    forwardRef(() => PaymentsModule),
    forwardRef(() => CustomersModule),
    NotificationsModule,
  ],
  controllers: [ApprovalsController],
  providers: [ApprovalsService, ApprovalApplicatorService],
  exports: [ApprovalsService],
})
export class ApprovalsModule {}
