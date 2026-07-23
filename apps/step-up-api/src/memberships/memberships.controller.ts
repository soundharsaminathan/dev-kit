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
  IsString,
  ValidateNested,
} from "class-validator";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { PrismaService } from "../prisma/prisma.service";
import type { DecryptedUser } from "../users/user-crypto.service";
import { MembershipsService } from "./memberships.service";

class CoveredStudentDto {
  @IsString()
  studentId!: string;

  @IsEnum(MembershipSeatRole)
  seatRole!: MembershipSeatRole;
}

class AssignMembershipDto {
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

class RenewMembershipDto {
  @IsString()
  membershipId!: string;
}

class SelfAssignDto {
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

  @Post("assign")
  @Roles(UserRole.OWNER, UserRole.STAFF)
  assign(@Body() dto: AssignMembershipDto) {
    return this.membershipsService.assign(dto);
  }

  @Post("renew")
  @Roles(UserRole.OWNER, UserRole.STAFF)
  renew(@Body() dto: RenewMembershipDto) {
    return this.membershipsService.renewManual(dto.membershipId);
  }

  @Post("self/assign")
  @Roles(UserRole.STUDENT, UserRole.PARENT)
  async selfAssign(
    @CurrentUser() actor: DecryptedUser,
    @Body() dto: SelfAssignDto,
  ) {
    await this.assertPurchaserOwnership(actor, dto.purchaserUserId);
    for (const covered of dto.coveredStudents) {
      await this.assertCanCoverStudent(actor, covered.studentId);
    }
    return this.membershipsService.assign(dto);
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
    return this.membershipsService.renewManual(dto.membershipId);
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
        "Parents must be the purchaser on self-assign",
      );
    }
    throw new BadRequestException("Unexpected role");
  }

  private async assertCanCoverStudent(actor: DecryptedUser, studentId: string) {
    if (actor.role === UserRole.STUDENT) {
      if (actor.id !== studentId) {
        throw new ForbiddenException(
          "Students can only cover themselves on Individual subscriptions",
        );
      }
      return;
    }
    if (actor.role === UserRole.PARENT) {
      if (actor.id === studentId) {
        return;
      }
      const link = await this.prisma.parentChild.findUnique({
        where: {
          parentUserId_childUserId: {
            parentUserId: actor.id,
            childUserId: studentId,
          },
        },
      });
      if (!link) {
        throw new ForbiddenException(
          "Student is not linked to this parent account",
        );
      }
      return;
    }
    throw new BadRequestException("Unexpected role");
  }
}
