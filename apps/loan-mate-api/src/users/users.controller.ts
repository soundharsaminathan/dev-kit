import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser, type AuthUser } from "../auth/current-user.decorator";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { UserRole } from "../generated/prisma";
import { CreateUserDto, UpdateUserDto } from "./dto/user.dto";
import { UsersService } from "./users.service";

const USER_READ_ROLES = [
  UserRole.SYSTEM_ADMIN,
  UserRole.COMPANY_OWNER,
  UserRole.COMPANY_ADMIN,
  UserRole.BRANCH_MANAGER,
  UserRole.LOAN_OFFICER,
  UserRole.APPROVER,
  UserRole.COLLECTION_OFFICER,
] as const;

@Controller("users")
@UseGuards(AuthGuard, RolesGuard)
export class UsersController {
  constructor(@Inject(UsersService) private readonly users: UsersService) {}

  @Post()
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.COMPANY_OWNER,
    UserRole.COMPANY_ADMIN,
  )
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateUserDto) {
    return this.users.create(user, dto);
  }

  @Get()
  @Roles(...USER_READ_ROLES)
  list(
    @CurrentUser() user: AuthUser,
    @Query("companyId") companyId?: string,
  ) {
    return this.users.list(user, companyId);
  }

  @Get("performance")
  @Roles(
    UserRole.COMPANY_OWNER,
    UserRole.COMPANY_ADMIN,
    UserRole.BRANCH_MANAGER,
  )
  performanceRoster(
    @CurrentUser() user: AuthUser,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    return this.users.performanceRoster(user, from, to);
  }

  @Get(":id/performance")
  @Roles(...USER_READ_ROLES)
  performance(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    return this.users.performance(user, id, from, to);
  }

  @Get(":id")
  @Roles(...USER_READ_ROLES)
  get(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.users.get(user, id);
  }

  @Patch(":id")
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.COMPANY_OWNER,
    UserRole.COMPANY_ADMIN,
  )
  update(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.users.update(user, id, dto);
  }
}
