import {
  BadRequestException,
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
import { MembershipSeatRole, UserRole } from "@prisma/client";
import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { PrismaService } from "../prisma/prisma.service";
import type { DecryptedUser } from "../users/user-crypto.service";
import { UsersService } from "../users/users.service";
import { MembershipsService } from "./memberships.service";

class CoveredStudentDto {
  @IsString()
  studentId!: string;

  @IsEnum(MembershipSeatRole)
  seatRole!: MembershipSeatRole;

  @IsOptional()
  @IsString()
  batchId?: string;
}

class SelfRenewDto {
  @IsString()
  membershipId!: string;
}

class FamilyPurchaseDto {
  @IsString()
  studioId!: string;

  @IsString()
  subscriptionId!: string;

  @IsString()
  purchaserUserId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CoveredStudentDto)
  coveredStudents!: CoveredStudentDto[];
}

@Controller("memberships")
@UseGuards(AuthGuard, RolesGuard)
export class MembershipsController {
  constructor(
    @Inject(MembershipsService)
    private readonly membershipsService: MembershipsService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(UsersService) private readonly usersService: UsersService,
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

  @Post("family-purchase")
  @Roles(UserRole.STUDENT, UserRole.PARENT, UserRole.OWNER, UserRole.STAFF)
  async familyPurchase(
    @CurrentUser() actor: DecryptedUser,
    @Body() dto: FamilyPurchaseDto,
  ) {
    const staffRoles: UserRole[] = [UserRole.OWNER, UserRole.STAFF];
    if (!staffRoles.includes(actor.role)) {
      await this.assertPurchaserOwnership(actor, dto.purchaserUserId);
      for (const covered of dto.coveredStudents) {
        await this.assertCanCoverStudent(actor, covered.studentId);
      }
    }
    return this.membershipsService.purchaseFamily(dto);
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
        "Parents must be the purchaser on family purchase",
      );
    }
    throw new BadRequestException("Unexpected role");
  }

  private async assertCanCoverStudent(actor: DecryptedUser, studentId: string) {
    if (actor.id === studentId) {
      return;
    }

    const linked = await this.usersService.isLinkedFamilyMember(
      actor.id,
      studentId,
    );
    if (!linked) {
      throw new ForbiddenException(
        "Student is not linked to this account as a family member",
      );
    }
  }
}
