import { Body, Controller, Inject, Post, Req, UseGuards } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { IsEmail, IsEnum, IsOptional, IsString } from "class-validator";
import { MediaService } from "../media/media.service";
import { PushService } from "../notifications/push.service";
import { PrismaService } from "../prisma/prisma.service";
import {
  type DecryptedUser,
  UserCryptoService,
} from "../users/user-crypto.service";
import type { VerifiedAuth } from "./firebase.service";
import { TokenGuard } from "./token.guard";

class SyncUserDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsString()
  studioId?: string;

  @IsOptional()
  @IsString()
  fcmToken?: string;
}

@Controller("auth")
export class AuthController {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(UserCryptoService) private readonly crypto: UserCryptoService,
    @Inject(MediaService) private readonly media: MediaService,
    @Inject(PushService) private readonly push: PushService,
  ) {}

  @Post("sync")
  @UseGuards(TokenGuard)
  async sync(
    @Req() request: { auth: VerifiedAuth },
    @Body() dto: SyncUserDto,
  ): Promise<DecryptedUser> {
    const auth = request.auth;
    const email = dto.email ?? auth.email;
    const name = dto.name ?? auth.name ?? "New User";

    const existing = await this.prisma.user.findUnique({
      where: { firebaseUid: auth.firebaseUid },
    });

    if (existing) {
      const current = this.crypto.decryptUser(existing);
      const sealed = this.crypto.sealPii(
        {
          email,
          name,
          phone: current.phone,
          bio: current.bio,
          instagramUrl: current.instagramUrl,
        },
        existing.encryptedKey,
      );

      const updated = await this.prisma.user.update({
        where: { firebaseUid: auth.firebaseUid },
        data: sealed,
      });
      if (dto.fcmToken) {
        await this.push.registerToken(updated.id, dto.fcmToken);
      }
      const decrypted = this.crypto.decryptUser(updated);
      return {
        ...decrypted,
        photoUrl: await this.media.signReadUrl(decrypted.photoUrl),
      };
    }

    const sealed = this.crypto.sealPii({
      email,
      name,
      phone: null,
      bio: null,
      instagramUrl: null,
    });

    const created = await this.prisma.user.create({
      data: {
        id: auth.bypassUserId,
        firebaseUid: auth.firebaseUid,
        ...sealed,
        role: UserRole.STUDENT,
        studioId: dto.studioId,
        styles: [],
      },
    });
    if (dto.fcmToken) {
      await this.push.registerToken(created.id, dto.fcmToken);
    }
    const decrypted = this.crypto.decryptUser(created);
    return {
      ...decrypted,
      photoUrl: await this.media.signReadUrl(decrypted.photoUrl),
    };
  }
}
