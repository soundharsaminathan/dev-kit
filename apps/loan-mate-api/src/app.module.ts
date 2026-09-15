import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ApprovalsModule } from "./approvals/approvals.module";
import { AuditModule } from "./audit/audit.module";
import { AuthModule } from "./auth/auth.module";
import { BranchesModule } from "./branches/branches.module";
import { CompaniesModule } from "./companies/companies.module";
import { CustomersModule } from "./customers/customers.module";
import { HealthModule } from "./health/health.module";
import { JobsModule } from "./jobs/jobs.module";
import { LoansModule } from "./loans/loans.module";
import { PaymentsModule } from "./payments/payments.module";
import { PrismaModule } from "./prisma/prisma.module";
import { ProductsModule } from "./products/products.module";
import { UsersModule } from "./users/users.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    HealthModule,
    AuditModule,
    ApprovalsModule,
    CompaniesModule,
    BranchesModule,
    UsersModule,
    CustomersModule,
    ProductsModule,
    LoansModule,
    PaymentsModule,
    JobsModule,
  ],
})
export class AppModule {}
