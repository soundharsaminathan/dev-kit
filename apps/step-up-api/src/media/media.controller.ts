import {
  BadRequestException,
  Body,
  Controller,
  Inject,
  Post,
  UseGuards,
} from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { IsEnum, IsOptional, IsString } from "class-validator";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { RolesGuard } from "../auth/roles.guard";
import type { DecryptedUser } from "../users/user-crypto.service";
import { MediaService } from "./media.service";

enum MediaPurpose {
  BRANCH = "branch",
  AVATAR = "avatar",
  POST = "post",
  CHAT = "chat",
  BATCH = "batch",
  CERTIFICATE = "certificate",
}

class SignedUrlDto {
  @IsString()
  filename!: string;

  @IsString()
  contentType!: string;

  @IsOptional()
  @IsEnum(MediaPurpose)
  purpose?: MediaPurpose;
}

const BRANCH_ROLES = new Set<UserRole>([
  UserRole.OWNER,
  UserRole.STAFF,
  UserRole.TRAINER,
]);

@Controller("media")
@UseGuards(AuthGuard, RolesGuard)
export class MediaController {
  constructor(
    @Inject(MediaService) private readonly mediaService: MediaService,
  ) {}

  @Post("signed-url")
  createSignedUrl(
    @CurrentUser() user: DecryptedUser,
    @Body() dto: SignedUrlDto,
  ) {
    const purpose = dto.purpose ?? MediaPurpose.BRANCH;

    if (
      (purpose === MediaPurpose.BRANCH ||
        purpose === MediaPurpose.BATCH ||
        purpose === MediaPurpose.CERTIFICATE) &&
      !BRANCH_ROLES.has(user.role)
    ) {
      throw new BadRequestException(
        "Only studio staff can upload branch, batch, or certificate assets",
      );
    }

    return this.mediaService.createSignedUploadUrl(
      dto.filename,
      dto.contentType,
      purpose,
    );
  }
}
