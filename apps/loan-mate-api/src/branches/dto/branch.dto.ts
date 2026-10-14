import { IsBoolean, IsOptional, IsString, MinLength } from "class-validator";

export class CreateBranchDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsString()
  @MinLength(1)
  code!: string;

  @IsOptional()
  @IsString()
  companyId?: string;
}

export class UpdateBranchDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
