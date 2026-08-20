import {
  AttendanceStatus,
  BatchCategory,
  BatchEnrollmentStatus,
  EnrollmentMode,
  Gender,
  InvoiceStatus,
  PaymentMethod,
  SessionStatus,
  SessionType,
} from "@prisma/client";
import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";

export class ImportStudentDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsEmail()
  email!: string;

  @IsEnum(Gender)
  gender!: Gender;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(120)
  age?: number;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsString()
  guardianName?: string | null;

  @IsOptional()
  @IsString()
  alternateMobile?: string | null;

  @IsOptional()
  @IsString()
  phone?: string | null;
}

export class ImportLocationDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  address?: string | null;

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number | null;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  amenities?: string[] | null;

  @IsOptional()
  @IsObject()
  openingHours?: Record<string, unknown> | null;

  @IsOptional()
  @IsString()
  pricingBlurb?: string | null;
}

export class ImportBatchDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsEnum(BatchCategory)
  category!: BatchCategory;

  @IsOptional()
  @IsString()
  branchName?: string | null;

  @IsOptional()
  @IsString()
  danceStyles?: string | null;

  @IsIn(["DAILY", "WEEKLY"])
  frequency!: "DAILY" | "WEEKLY";

  @IsArray()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  weekdays!: number[];

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  startTime!: string;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  endTime!: string;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  @IsOptional()
  @IsInt()
  @Min(-840)
  @Max(840)
  utcOffsetMinutes?: number;

  @IsInt()
  @Min(1)
  @Max(10_000)
  capacity!: number;

  @IsEnum(EnrollmentMode)
  enrollmentMode!: EnrollmentMode;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsString()
  @MinLength(1)
  monthlyPlanName?: string | null;

  @IsOptional()
  @IsString()
  @MinLength(1)
  quarterlyPlanName?: string | null;
}

export class ImportEnrollmentDto {
  @IsEmail()
  studentEmail!: string;

  @IsString()
  @MinLength(1)
  batchName!: string;

  @IsDateString()
  enrolledAt!: string;

  @IsEnum(BatchEnrollmentStatus)
  status!: BatchEnrollmentStatus;

  @IsOptional()
  @IsDateString()
  endedAt?: string | null;

  @IsOptional()
  @IsString()
  endReason?: string | null;

  @IsOptional()
  @IsString()
  @MinLength(1)
  planName?: string | null;
}

export class ImportInvoiceDto {
  @IsEmail()
  studentEmail!: string;

  @IsOptional()
  @IsString()
  batchName?: string | null;

  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsEnum(InvoiceStatus)
  status!: InvoiceStatus;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod | null;

  @IsOptional()
  @IsDateString()
  paidAt?: string | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  referralDiscount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  studioDiscount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  refundedAmount?: number;

  @IsOptional()
  @IsDateString()
  refundedAt?: string | null;

  @IsOptional()
  @IsString()
  @MinLength(1)
  planName?: string | null;
}

export class ImportSessionDto {
  @IsString()
  @MinLength(1)
  batchName!: string;

  @IsDateString()
  date!: string;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  startTime!: string;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  endTime?: string;

  @IsEnum(SessionStatus)
  status!: SessionStatus;

  @IsEnum(SessionType)
  type!: SessionType;

  @IsOptional()
  @IsEmail()
  trainerEmail?: string | null;
}

export class ImportAttendanceDto {
  @IsString()
  @MinLength(1)
  batchName!: string;

  @IsEmail()
  studentEmail!: string;

  @IsDateString()
  date!: string;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  startTime?: string | null;

  @IsEnum(AttendanceStatus)
  status!: AttendanceStatus;
}

export class ImportStudioDataDto {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => ImportStudentDto)
  students?: ImportStudentDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => ImportLocationDto)
  locations?: ImportLocationDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(1)
  @ValidateNested({ each: true })
  @Type(() => ImportBatchDto)
  batches?: ImportBatchDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5_000)
  @ValidateNested({ each: true })
  @Type(() => ImportEnrollmentDto)
  enrollments?: ImportEnrollmentDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5_000)
  @ValidateNested({ each: true })
  @Type(() => ImportSessionDto)
  sessions?: ImportSessionDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5_000)
  @ValidateNested({ each: true })
  @Type(() => ImportInvoiceDto)
  invoices?: ImportInvoiceDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5_000)
  @ValidateNested({ each: true })
  @Type(() => ImportAttendanceDto)
  attendance?: ImportAttendanceDto[];
}
