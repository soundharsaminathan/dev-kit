import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Inject,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { IsString } from "class-validator";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { PrismaService } from "../prisma/prisma.service";
import type { DecryptedUser } from "../users/user-crypto.service";
import { MembershipsService } from "./memberships.service";

class SelfRenewDto {
  @IsString()
  membershipId!: string;
}

@Controller("memberships")
@UseGuards(AuthGuard, RolesGuard)
export class MembershipsController {
  constructor(
    @Inject(MembershipsService)
    private readonly membershipsService: MembershipsService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  @Get("student/:studentId")
  listForStudent(@Param("studentId") studentId: string) {
    return this.membershipsService.listForStudent(studentId);
  }

  @Post("self/renew")
  @Roles(UserRole.STUDENT, UserRole.PARENT)
  async selfRenew(
    @CurrentUser() actor: DecryptedUser,
    @Body() dto: SelfRenewDto,
  ) {
    const membership = await this.prisma.membership.findUnique({
      where: { id: dto.membershipId },
    });
    if (!membership) {
      throw new NotFoundException("Membership not found");
    }
    await this.assertPurchaserOwnership(actor, membership.purchaserUserId);
    return this.membershipsService.requestRenewalInvoice(dto.membershipId);
  }

  private async assertPurchaserOwnership(
    actor: DecryptedUser,
    purchaserUserId: string,
  ) {
    if (actor.role === UserRole.STUDENT) {
      if (actor.id !== purchaserUserId) {
        throw new ForbiddenException(
          "Students can only purchase for themselves",
        );
      }
      return;
    }
    if (actor.role === UserRole.PARENT) {
      if (actor.id === purchaserUserId) {
        return;
      }
      throw new ForbiddenException(
        "Parents can only renew memberships they purchased",
      );
    }
    throw new ForbiddenException("Unexpected role");
  }
}
