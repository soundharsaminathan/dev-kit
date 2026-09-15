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
import { UserRole } from "../generated/prisma";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser, type AuthUser } from "../auth/current-user.decorator";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { CreateUserDto, UpdateUserDto } from "./dto/user.dto";
import { UsersService } from "./users.service";

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
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.COMPANY_OWNER,
    UserRole.COMPANY_ADMIN,
  )
  list(
    @CurrentUser() user: AuthUser,
    @Query("companyId") companyId?: string,
  ) {
    return this.users.list(user, companyId);
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
