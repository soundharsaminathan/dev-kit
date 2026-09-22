import {
  IsBoolean,
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
} from "../../generated/prisma/client";

export class CreateProductDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsString()
  @MinLength(1)
  code!: string;

  @IsNumber()
  @Min(1)
  defaultPrincipal!: number;

  @IsNumber()
  @Min(0)
  defaultAnnualRate!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  annualRateWeekly?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  annualRateBiweekly?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  annualRateMonthly?: number;

  @IsInt()
  @Min(1)
  defaultTenure!: number;

  @IsOptional()
  @IsEnum(PaymentFrequency)
  defaultFrequency?: PaymentFrequency;

  @IsOptional()
  @IsEnum(MonthlyFirstEmiOption)
  defaultMonthlyFirstEmi?: MonthlyFirstEmiOption;

  @IsOptional()
  @IsNumber()
  @Min(0)
  processingFeePercent?: number;
}

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber()
  defaultPrincipal?: number;

  @IsOptional()
  @IsNumber()
  defaultAnnualRate?: number;

  @IsOptional()
  @IsInt()
  defaultTenure?: number;

  @IsOptional()
  @IsEnum(PaymentFrequency)
  defaultFrequency?: PaymentFrequency;

  @IsOptional()
  @IsEnum(MonthlyFirstEmiOption)
  defaultMonthlyFirstEmi?: MonthlyFirstEmiOption;

  @IsOptional()
  @IsNumber()
  processingFeePercent?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
