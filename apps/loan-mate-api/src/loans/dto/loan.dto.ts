import {
  IsBoolean,
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
  InterestMethod,
  MonthlyFirstEmiOption,
  PaymentFrequency,
  PaymentMode,
} from "../../generated/prisma/client";

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

  @IsOptional()
  @IsString()
  purpose?: string;

  @IsOptional()
  @IsString()
  loanType?: string;

  @IsOptional()
  @IsEnum(InterestMethod)
  interestMethod?: InterestMethod;

  @IsOptional()
  @IsNumber()
  @Min(0)
  processingFeeGst?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  insuranceAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  otherCharges?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  moratoriumInstallments?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  graceInstallments?: number;

  @IsOptional()
  @IsBoolean()
  prepaymentAllowed?: boolean;

  @IsOptional()
  @IsString()
  loanOfficerId?: string;

  @IsOptional()
  @IsString()
  renewedFromLoanId?: string;
}

export class UpdateLoanAmountsDto {
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

export class VerifyLoanDto {
  @IsOptional()
  @IsString()
  verificationType?: string;

  @IsOptional()
  @IsString()
  remarks?: string;

  @IsOptional()
  @IsString()
  gps?: string;

  @IsOptional()
  @IsDateString()
  visitedAt?: string;
}

export class CollateralDto {
  @IsString()
  @MinLength(1)
  collateralType!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  ownerName?: string;

  @IsNumber()
  @Min(0)
  estimatedValue!: number;
}

export class GuarantorDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  relationship?: string;

  @IsString()
  @MinLength(1)
  mobile!: string;

  @IsOptional()
  @IsString()
  pan?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  monthlyIncome?: number;

  @IsOptional()
  @IsBoolean()
  hasSigned?: boolean;
}

export class TrancheDto {
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsEnum(PaymentMode)
  mode!: PaymentMode;

  @IsDateString()
  paidAt!: string;

  @IsOptional()
  @IsString()
  reference?: string;
}

export class LoanNpaDto {
  @IsString()
  @MinLength(1)
  category!: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
