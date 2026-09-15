import { IsEnum, IsObject, IsOptional, IsString, MinLength } from "class-validator";
import { ApprovalType } from "../../generated/prisma";

export class CreateApprovalDto {
  @IsEnum(ApprovalType)
  type!: ApprovalType;

  @IsString()
  @MinLength(1)
  entityType!: string;

  @IsString()
  @MinLength(1)
  entityId!: string;

  @IsObject()
  payload!: Record<string, unknown>;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  loanId?: string;
}

export class DecideApprovalDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
