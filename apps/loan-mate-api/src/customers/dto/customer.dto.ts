import {
  IsBoolean,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
} from "class-validator";

export class CreateCustomerDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsString()
  @MinLength(1)
  mobile!: string;

  @IsString()
  @MinLength(1)
  pan!: string;

  @IsOptional()
  @IsString()
  address?: string;
}

export class UpdateCustomerDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  mobile?: string;

  @IsOptional()
  @IsString()
  pan?: string;

  @IsOptional()
  @IsString()
  address?: string;
}

export class BlacklistCustomerDto {
  @IsBoolean()
  blacklisted!: boolean;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class AssignCollectionOfficerDto {
  @ValidateIf((_, v) => v !== null)
  @IsString()
  collectionOfficerId!: string | null;
}
