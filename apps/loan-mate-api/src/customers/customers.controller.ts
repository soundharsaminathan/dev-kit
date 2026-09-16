import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { type AuthUser, CurrentUser } from "../auth/current-user.decorator";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { UserRole } from "../generated/prisma";
import { CustomersService } from "./customers.service";
import type {
  BlacklistCustomerDto,
  CreateCustomerDto,
  UpdateCustomerDto,
} from "./dto/customer.dto";

@Controller("customers")
@UseGuards(AuthGuard, RolesGuard)
export class CustomersController {
  constructor(
    @Inject(CustomersService) private readonly customers: CustomersService,
  ) {}

  @Post()
  @Roles(
    UserRole.COMPANY_OWNER,
    UserRole.COMPANY_ADMIN,
    UserRole.BRANCH_MANAGER,
    UserRole.LOAN_OFFICER,
  )
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateCustomerDto) {
    return this.customers.create(user, dto);
  }

  @Get()
  @Roles(
    UserRole.COMPANY_OWNER,
    UserRole.COMPANY_ADMIN,
    UserRole.BRANCH_MANAGER,
    UserRole.LOAN_OFFICER,
    UserRole.APPROVER,
    UserRole.COLLECTION_OFFICER,
  )
  list(@CurrentUser() user: AuthUser) {
    return this.customers.list(user);
  }

  @Get(":id")
  @Roles(
    UserRole.COMPANY_OWNER,
    UserRole.COMPANY_ADMIN,
    UserRole.BRANCH_MANAGER,
    UserRole.LOAN_OFFICER,
    UserRole.APPROVER,
    UserRole.COLLECTION_OFFICER,
  )
  get(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.customers.get(user, id);
  }

  @Patch(":id")
  @Roles(
    UserRole.COMPANY_OWNER,
    UserRole.COMPANY_ADMIN,
    UserRole.BRANCH_MANAGER,
    UserRole.LOAN_OFFICER,
  )
  update(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.customers.update(user, id, dto);
  }

  @Post(":id/blacklist")
  @Roles(UserRole.COMPANY_OWNER, UserRole.COMPANY_ADMIN)
  blacklist(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() dto: BlacklistCustomerDto,
  ) {
    return this.customers.blacklist(user, id, dto);
  }

  @Post(":id/request-npa-mark")
  @Roles(
    UserRole.COMPANY_OWNER,
    UserRole.COMPANY_ADMIN,
    UserRole.BRANCH_MANAGER,
  )
  requestNpaMark(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() body: { reason: string; sourceLoanId?: string },
  ) {
    return this.customers.requestNpaMark(
      user,
      id,
      body.reason,
      body.sourceLoanId,
    );
  }

  @Post(":id/request-npa-clear")
  @Roles(
    UserRole.COMPANY_OWNER,
    UserRole.COMPANY_ADMIN,
    UserRole.BRANCH_MANAGER,
  )
  requestNpaClear(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() body: { reason?: string },
  ) {
    return this.customers.requestNpaClear(user, id, body.reason);
  }

  @Delete(":id")
  @Roles(UserRole.COMPANY_OWNER, UserRole.COMPANY_ADMIN)
  remove(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.customers.remove(user, id);
  }
}
