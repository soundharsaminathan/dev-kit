import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
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

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  middleName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsString()
  fatherName?: string;

  @IsOptional()
  @IsString()
  motherName?: string;

  @IsOptional()
  @IsString()
  spouseName?: string;

  @IsOptional()
  @IsString()
  maritalStatus?: string;

  @IsOptional()
  @IsString()
  alternateMobile?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  whatsapp?: string;

  @IsOptional()
  @IsString()
  aadhaar?: string;

  @IsOptional()
  @IsString()
  voterId?: string;

  @IsOptional()
  @IsString()
  drivingLicence?: string;

  @IsOptional()
  @IsString()
  passportNo?: string;

  @IsOptional()
  @IsInt()
  @Min(300)
  @Max(900)
  creditScore?: number;

  @IsOptional()
  @IsString()
  riskCategory?: string;

  @IsOptional()
  @IsString()
  notes?: string;
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

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  middleName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsString()
  fatherName?: string;

  @IsOptional()
  @IsString()
  motherName?: string;

  @IsOptional()
  @IsString()
  spouseName?: string;

  @IsOptional()
  @IsString()
  maritalStatus?: string;

  @IsOptional()
  @IsString()
  alternateMobile?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  whatsapp?: string;

  @IsOptional()
  @IsString()
  aadhaar?: string;

  @IsOptional()
  @IsString()
  voterId?: string;

  @IsOptional()
  @IsString()
  drivingLicence?: string;

  @IsOptional()
  @IsString()
  passportNo?: string;

  @IsOptional()
  @IsInt()
  @Min(300)
  @Max(900)
  creditScore?: number;

  @IsOptional()
  @IsString()
  riskCategory?: string;

  @IsOptional()
  @IsString()
  notes?: string;
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
