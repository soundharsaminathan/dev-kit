import { Module } from "@nestjs/common";
import { ApprovalsModule } from "../approvals/approvals.module";
import { AuditModule } from "../audit/audit.module";
import { LoansController } from "./loans.controller";
import { LoansService } from "./loans.service";

@Module({
  imports: [AuditModule, ApprovalsModule],
  controllers: [LoansController],
  providers: [LoansService],
  exports: [LoansService],
})
export class LoansModule {}
