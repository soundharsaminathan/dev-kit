import {
  Body,
  Controller,
  Inject,
  Post,
  ServiceUnavailableException,
} from "@nestjs/common";
import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";
import { EmailService } from "../email/email.service";

class StudioInquiryDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  studioName!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  ownerName!: string;

  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  message?: string;
}

@Controller("contact")
export class ContactController {
  constructor(@Inject(EmailService) private readonly email: EmailService) {}

  @Post("studio-inquiry")
  async studioInquiry(@Body() dto: StudioInquiryDto) {
    if (!this.email.isConfigured()) {
      throw new ServiceUnavailableException(
        "Studio registration is temporarily unavailable. Email info@classa.in.",
      );
    }

    await this.email.sendStudioInquiry({
      studioName: dto.studioName.trim(),
      ownerName: dto.ownerName.trim(),
      email: dto.email.trim(),
      phone: dto.phone?.trim(),
      city: dto.city?.trim(),
      message: dto.message?.trim(),
    });

    return { ok: true as const };
  }
}
