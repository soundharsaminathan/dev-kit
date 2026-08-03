import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { IsEmail, IsEnum } from "class-validator";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { assertSameStudio } from "../auth/studio-access";
import type { DecryptedUser } from "../users/user-crypto.service";
import { StaffInvitesService } from "./staff-invites.service";

class CreateStaffInviteDto {
  @IsEmail()
  email!: string;

  @IsEnum(UserRole)
  role!: UserRole;
}

@Controller("staff-invites")
@UseGuards(AuthGuard, RolesGuard)
export class StaffInvitesController {
  constructor(
    @Inject(StaffInvitesService)
    private readonly invites: StaffInvitesService,
  ) {}

  @Post()
  @Roles(UserRole.OWNER, UserRole.STAFF)
  createInvite(
    @CurrentUser() user: DecryptedUser,
    @Body() dto: CreateStaffInviteDto,
  ) {
    if (!user.studioId) {
      throw new BadRequestException("User is not assigned to a studio");
    }
    return this.invites.createInvite(user.studioId, user.id, dto);
  }

  @Get("studio/:studioId")
  @Roles(UserRole.OWNER, UserRole.STAFF)
  listInvites(
    @CurrentUser() user: DecryptedUser,
    @Param("studioId") studioId: string,
  ) {
    assertSameStudio(user, studioId);
    return this.invites.listInvites(studioId);
  }

  @Post(":id/revoke")
  @Roles(UserRole.OWNER, UserRole.STAFF)
  revokeInvite(@CurrentUser() user: DecryptedUser, @Param("id") id: string) {
    if (!user.studioId) {
      throw new BadRequestException("User is not assigned to a studio");
    }
    return this.invites.revokeInvite(id, user.studioId);
  }
}
