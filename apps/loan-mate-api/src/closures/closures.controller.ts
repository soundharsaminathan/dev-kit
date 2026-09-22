import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { type AuthUser, CurrentUser } from "../auth/current-user.decorator";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { STAFF_ROLES } from "../common/tenancy";
import { UserRole } from "../generated/prisma/client";

import { ClosuresService } from "./closures.service";

import { LoanRestructureService } from "./loan-restructure.service";

@Controller()

@UseGuards(AuthGuard, RolesGuard)
export class ClosuresController {
  constructor(
    @Inject(ClosuresService) private readonly closures: ClosuresService,

    @Inject(LoanRestructureService)
    private readonly restructure: LoanRestructureService,
  ) {}

  @Get("loans/:id/foreclosure-quote")

  @Roles(...STAFF_ROLES)
  foreclosureQuote(
    @CurrentUser() user: AuthUser,

    @Param("id") id: string,

    @Query("asOfDate") asOfDate?: string,
  ) {
    return this.closures.getForeclosureQuote(user, id, asOfDate);
  }

  @Post("loans/:id/request-foreclosure")

  @Roles(
    UserRole.COMPANY_OWNER,

    UserRole.COMPANY_ADMIN,

    UserRole.BRANCH_MANAGER,

    UserRole.LOAN_OFFICER,
  )
  requestForeclosure(
    @CurrentUser() user: AuthUser,

    @Param("id") id: string,

    @Body() body: { asOfDate?: string; reason?: string },
  ) {
    return this.closures.requestForeclosure(user, id, body);
  }

  @Post("loans/:id/request-settlement")

  @Roles(
    UserRole.COMPANY_OWNER,

    UserRole.COMPANY_ADMIN,

    UserRole.BRANCH_MANAGER,

    UserRole.LOAN_OFFICER,
  )
  requestSettlement(
    @CurrentUser() user: AuthUser,

    @Param("id") id: string,

    @Body()
    body: { settlementAmount: number; asOfDate?: string; reason?: string },
  ) {
    return this.closures.requestSettlement(user, id, body);
  }

  @Post("loans/:id/request-write-off")

  @Roles(
    UserRole.COMPANY_OWNER,

    UserRole.COMPANY_ADMIN,

    UserRole.BRANCH_MANAGER,
  )
  requestWriteOff(
    @CurrentUser() user: AuthUser,

    @Param("id") id: string,

    @Body() body: { asOfDate?: string; reason?: string },
  ) {
    return this.closures.requestWriteOff(user, id, body);
  }

  @Post("loans/:id/request-restructure")

  @Roles(
    UserRole.COMPANY_OWNER,

    UserRole.COMPANY_ADMIN,

    UserRole.BRANCH_MANAGER,

    UserRole.LOAN_OFFICER,
  )
  requestRestructure(
    @CurrentUser() user: AuthUser,

    @Param("id") id: string,

    @Body()
    body: {
      newTenure?: number;

      newRate?: number;

      newEmiAmount?: number;

      reason?: string;
    },
  ) {
    return this.restructure.requestRestructure(user, id, body);
  }
}
