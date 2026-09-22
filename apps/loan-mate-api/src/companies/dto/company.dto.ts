import {
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from "class-validator";
import {
  AdvanceTreatment,
  MonthlyFirstEmiOption,
} from "../../generated/prisma/client";

export class CreateCompanyDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsString()
  @MinLength(1)
  slug!: string;

  @IsString()
  @MinLength(1)
  ownerName!: string;

  @IsString()
  @MinLength(1)
  ownerEmail!: string;

  @IsOptional()
  @IsString()
  ownerPassword?: string;
}

export class UpdateCompanySettingsDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  graceDays?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  penaltyDailyPercent?: number;

  @IsOptional()
  @IsEnum(MonthlyFirstEmiOption)
  defaultMonthlyFirstEmiOption?: MonthlyFirstEmiOption;

  @IsOptional()
  @IsArray()
  @IsEnum(AdvanceTreatment, { each: true })
  defaultAdvanceTreatments?: AdvanceTreatment[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  foreclosureChargePercent?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxRestructures?: number;
}
