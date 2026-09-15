import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from "class-validator";
import { AdvanceTreatment, PaymentMode } from "../../generated/prisma";

export class RecordPaymentDto {
  @IsString()
  @MinLength(1)
  loanId!: string;

  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsDateString()
  paymentDate!: string;

  @IsEnum(PaymentMode)
  mode!: PaymentMode;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsString()
  details?: string;

  @IsOptional()
  @IsEnum(AdvanceTreatment)
  advanceTreatment?: AdvanceTreatment;
}

export class RequestReversalDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

export class RequestWaiverDto {
  @IsString()
  @MinLength(1)
  installmentId!: string;

  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsOptional()
  @IsString()
  reason?: string;
}
