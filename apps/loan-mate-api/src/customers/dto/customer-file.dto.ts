import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from "class-validator";

export class CustomerAddressDto {
  @IsString()
  @MinLength(1)
  line1!: string;

  @IsOptional()
  @IsString()
  line2?: string;

  @IsString()
  @MinLength(1)
  city!: string;

  @IsString()
  @MinLength(1)
  state!: string;

  @IsOptional()
  @IsString()
  postalCode?: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class CustomerEmploymentDto {
  @IsString()
  @MinLength(1)
  employerName!: string;

  @IsOptional()
  @IsString()
  designation?: string;

  @IsNumber()
  @Min(0)
  monthlyIncome!: number;

  @IsOptional()
  @IsBoolean()
  isCurrent?: boolean;
}

export class CustomerBankAccountDto {
  @IsString()
  @MinLength(1)
  bankName!: string;

  @IsString()
  @MinLength(1)
  accountNumber!: string;

  @IsString()
  @MinLength(1)
  ifsc!: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class CustomerNomineeDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsString()
  @MinLength(1)
  relationship!: string;

  @IsOptional()
  @IsString()
  mobile?: string;
}

export class CustomerReferenceDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  relationship?: string;

  @IsString()
  @MinLength(1)
  mobile!: string;
}

export class CustomerKycDto {
  @IsString()
  @MinLength(1)
  documentType!: string;

  @IsString()
  @MinLength(1)
  documentNumber!: string;

  @IsOptional()
  @IsString()
  issuingAuthority?: string;

  @IsOptional()
  @IsDateString()
  issueDate?: string;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;
}

export class ReviewKycDto {
  @IsIn(["VERIFIED", "REJECTED"])
  status!: "VERIFIED" | "REJECTED";

  @IsOptional()
  @IsString()
  reason?: string;
}
