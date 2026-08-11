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
import type { DecryptedUser } from "../users/user-crypto.service";
import { MembershipCommandsService } from "./application/membership.commands";
import { MembershipQueriesService } from "./application/membership.queries";

class SelfRenewDto {
  @IsString()
  membershipId!: string;
}

@Controller("memberships")
@UseGuards(AuthGuard, RolesGuard)
export class MembershipsController {
  constructor(
    @Inject(MembershipQueriesService)
    private readonly queries: MembershipQueriesService,
    @Inject(MembershipCommandsService)
    private readonly commands: MembershipCommandsService,
  ) {}

  @Get("student/:studentId")
  listForStudent(@Param("studentId") studentId: string) {
    return this.queries.listForStudent(studentId);
  }

  @Post("self/renew")
  @Roles(UserRole.STUDENT, UserRole.PARENT)
  async selfRenew(
    @CurrentUser() actor: DecryptedUser,
    @Body() dto: SelfRenewDto,
  ) {
    const purchaserUserId = await this.queries.getPurchaserUserId(
      dto.membershipId,
    );
    if (!purchaserUserId) {
      throw new NotFoundException("Membership not found");
    }
    await this.assertPurchaserOwnership(actor, purchaserUserId);
    return this.commands.requestRenewalInvoice(dto.membershipId);
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
