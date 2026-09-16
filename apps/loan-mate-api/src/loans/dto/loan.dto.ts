import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from "class-validator";
import {
  MonthlyFirstEmiOption,
  PaymentFrequency,
  PaymentMode,
} from "../../generated/prisma";

export class CreateLoanDto {
  @IsString()
  @MinLength(1)
  customerId!: string;

  @IsString()
  @MinLength(1)
  productId!: string;

  @IsString()
  @MinLength(1)
  branchId!: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  principal?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  annualRatePercent?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  tenureInstallments?: number;

  @IsOptional()
  @IsEnum(PaymentFrequency)
  frequency?: PaymentFrequency;

  @IsOptional()
  @IsEnum(MonthlyFirstEmiOption)
  monthlyFirstEmiOption?: MonthlyFirstEmiOption;

  @IsOptional()
  @IsNumber()
  @Min(0)
  processingFee?: number;
}

export class RejectLoanDto {
  @IsString()
  @MinLength(1)
  reason!: string;
}

export class DisburseLoanDto {
  @IsDateString()
  disbursementDate!: string;

  @IsOptional()
  @IsEnum(PaymentMode)
  mode?: PaymentMode;

  @IsOptional()
  @IsString()
  reference?: string;
}

export class PenaltyOverrideDto {
  @IsNumber()
  @Min(0)
  penaltyDailyPercent!: number;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class RateChangeDto {
  @IsNumber()
  @Min(0)
  annualRatePercent!: number;

  @IsOptional()
  @IsString()
  reason?: string;
}
