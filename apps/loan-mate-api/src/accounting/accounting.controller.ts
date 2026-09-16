import { Controller, Get, Inject, Query, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { type AuthUser, CurrentUser } from "../auth/current-user.decorator";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { requireCompany } from "../common/tenancy";
import { UserRole } from "../generated/prisma";
import { AccountingService } from "./accounting.service";

@Controller("accounting")
@UseGuards(AuthGuard, RolesGuard)
export class AccountingController {
  constructor(
    @Inject(AccountingService) private readonly accounting: AccountingService,
  ) {}

  @Get("accounts")
  @Roles(
    UserRole.COMPANY_OWNER,
    UserRole.COMPANY_ADMIN,
    UserRole.BRANCH_MANAGER,
    UserRole.APPROVER,
  )
  listAccounts(@CurrentUser() user: AuthUser) {
    const companyId = requireCompany(user);
    return this.accounting.listAccounts(companyId);
  }

  @Get("journals")
  @Roles(
    UserRole.COMPANY_OWNER,
    UserRole.COMPANY_ADMIN,
    UserRole.BRANCH_MANAGER,
    UserRole.APPROVER,
  )
  listJournals(
    @CurrentUser() user: AuthUser,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    const companyId = requireCompany(user);
    return this.accounting.listJournals(
      companyId,
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
    );
  }
}
