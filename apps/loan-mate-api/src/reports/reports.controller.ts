import { Controller, Get, Inject, Query, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { type AuthUser, CurrentUser } from "../auth/current-user.decorator";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { STAFF_ROLES } from "../common/tenancy";
import { UserRole } from "../generated/prisma";
import { ReportsService } from "./reports.service";

@Controller("reports")
@UseGuards(AuthGuard, RolesGuard)
export class ReportsController {
  constructor(
    @Inject(ReportsService) private readonly reports: ReportsService,
  ) {}

  @Get("portfolio")
  @Roles(...STAFF_ROLES)
  portfolio(@CurrentUser() user: AuthUser, @Query("format") format?: string) {
    return this.reports.portfolio(user, format);
  }

  @Get("collections")
  @Roles(...STAFF_ROLES)
  collections(
    @CurrentUser() user: AuthUser,
    @Query("from") from: string,
    @Query("to") to: string,
    @Query("format") format?: string,
  ) {
    return this.reports.collections(user, from, to, format);
  }

  @Get("overdue")
  @Roles(...STAFF_ROLES)
  overdue(@CurrentUser() user: AuthUser, @Query("format") format?: string) {
    return this.reports.overdue(user, format);
  }

  @Get("npa")
  @Roles(...STAFF_ROLES)
  npa(@CurrentUser() user: AuthUser, @Query("format") format?: string) {
    return this.reports.npa(user, format);
  }

  @Get("disbursements")
  @Roles(...STAFF_ROLES)
  disbursements(
    @CurrentUser() user: AuthUser,
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("format") format?: string,
  ) {
    return this.reports.disbursements(user, from, to, format);
  }

  @Get("receipts")
  @Roles(...STAFF_ROLES)
  receipts(
    @CurrentUser() user: AuthUser,
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("format") format?: string,
  ) {
    return this.reports.receipts(user, from, to, format);
  }

  @Get("closures")
  @Roles(...STAFF_ROLES)
  closures(@CurrentUser() user: AuthUser, @Query("format") format?: string) {
    return this.reports.closures(user, format);
  }

  @Get("approvals")
  @Roles(
    UserRole.COMPANY_OWNER,
    UserRole.COMPANY_ADMIN,
    UserRole.APPROVER,
    UserRole.BRANCH_MANAGER,
  )
  approvals(@CurrentUser() user: AuthUser, @Query("format") format?: string) {
    return this.reports.approvals(user, format);
  }
}
