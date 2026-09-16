import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from "class-validator";
import { DocumentEntityType, DocumentKind } from "../../generated/prisma";

export class SignedUrlDto {
  @IsString()
  @MinLength(1)
  fileName!: string;

  @IsString()
  @MinLength(1)
  contentType!: string;
}

export class CreateDocumentDto {
  @IsEnum(DocumentEntityType)
  entityType!: DocumentEntityType;

  @IsString()
  @MinLength(1)
  entityId!: string;

  @IsEnum(DocumentKind)
  kind!: DocumentKind;

  @IsString()
  @MinLength(1)
  objectKey!: string;

  @IsString()
  @MinLength(1)
  fileName!: string;

  @IsString()
  @MinLength(1)
  contentType!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sizeBytes?: number;
}
