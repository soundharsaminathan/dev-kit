import { forwardRef, Module } from "@nestjs/common";
import { AccountingModule } from "../accounting/accounting.module";
import { ApprovalsModule } from "../approvals/approvals.module";
import { AuditModule } from "../audit/audit.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { LoanExtrasService } from "./loan-extras.service";
import { LoansController } from "./loans.controller";
import { LoansService } from "./loans.service";

@Module({
  imports: [
    AuditModule,
    AccountingModule,
    NotificationsModule,
    forwardRef(() => ApprovalsModule),
  ],
  controllers: [LoansController],
  providers: [LoansService, LoanExtrasService],
  exports: [LoansService],
})
export class LoansModule {}
