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
import { UserRole } from "../generated/prisma";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser, type AuthUser } from "../auth/current-user.decorator";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { CustomersService } from "./customers.service";
import {
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

  @Delete(":id")
  @Roles(UserRole.COMPANY_OWNER, UserRole.COMPANY_ADMIN)
  remove(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.customers.remove(user, id);
  }
}
