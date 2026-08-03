import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  ForbiddenException,
  Inject,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { IsEmail, IsEnum, IsOptional, IsString } from "class-validator";
import { MediaService } from "../media/media.service";
import { PushService } from "../notifications/push.service";
import { PrismaService } from "../prisma/prisma.service";
import { StaffInvitesService } from "../staff-invites/staff-invites.service";
import {
  type DecryptedUser,
  UserCryptoService,
} from "../users/user-crypto.service";
import { FirebaseService, type VerifiedAuth } from "./firebase.service";
import { TokenGuard } from "./token.guard";

class SyncUserDto {
  @IsOptional()
  @IsString()
  name?: string;

  /** Bypass signup only — production email always comes from the Firebase token. */
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

class BypassLoginDto {
  @IsEmail()
  email!: string;
}

class AcceptInviteDto {
  @IsString()
  token!: string;
}

@Controller("auth")
export class AuthController {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(UserCryptoService) private readonly crypto: UserCryptoService,
    @Inject(MediaService) private readonly media: MediaService,
    @Inject(PushService) private readonly push: PushService,
    @Inject(FirebaseService) private readonly firebase: FirebaseService,
    @Inject(StaffInvitesService)
    private readonly staffInvites: StaffInvitesService,
  ) {}

  @Post("bypass-login")
  async bypassLogin(@Body() dto: BypassLoginDto): Promise<DecryptedUser> {
    if (!this.firebase.isBypassEnabled()) {
      throw new ForbiddenException("Bypass login is disabled");
    }

    const emailHash = this.crypto.hashEmail(dto.email);
    const user = await this.prisma.user.findFirst({
      where: { emailHash },
      orderBy: { createdAt: "desc" },
    });
    if (!user) {
      throw new UnauthorizedException("No account found for this email");
    }

    const decrypted = this.crypto.decryptUser(user);
    return {
      ...decrypted,
      photoUrl: await this.media.signReadUrl(decrypted.photoUrl),
    };
  }

  @Post("password-changed")
  @UseGuards(TokenGuard)
  async passwordChanged(
    @Req() request: { auth: VerifiedAuth },
  ): Promise<DecryptedUser> {
    const user = await this.firebase.resolveUser(request.auth);
    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: { mustChangePassword: false },
    });
    const decrypted = this.crypto.decryptUser(updated);
    return {
      ...decrypted,
      photoUrl: await this.media.signReadUrl(decrypted.photoUrl),
    };
  }

  @Post("accept-invite")
  @UseGuards(TokenGuard)
  async acceptInvite(
    @Req() request: { auth: VerifiedAuth },
    @Body() dto: AcceptInviteDto,
  ): Promise<DecryptedUser> {
    const auth = request.auth;
    if (!auth.email) {
      throw new BadRequestException("Authenticated email is required");
    }

    return this.staffInvites.acceptInvite(dto.token, {
      firebaseUid: auth.firebaseUid,
      email: auth.email,
      name: auth.name,
    });
  }

  @Post("sync")
  @UseGuards(TokenGuard)
  async sync(
    @Req() request: { auth: VerifiedAuth },
    @Body() dto: SyncUserDto,
  ): Promise<DecryptedUser> {
    const auth = request.auth;
    // Email is owned by Firebase Auth. Only bypass signup may supply dto.email
    // (dev tokens synthesize a placeholder address).
    const email =
      auth.bypassUserId && dto.email ? dto.email.trim() : auth.email;
    const name = dto.name ?? auth.name ?? "New User";

    const existing = await this.prisma.user.findUnique({
      where: { firebaseUid: auth.firebaseUid },
    });

    if (existing) {
      const current = this.crypto.decryptUser(existing);
      await this.assertEmailAvailable(email, existing.id);
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

    const emailHash = this.crypto.hashEmail(email);
    const provisioned = await this.prisma.user.findFirst({
      where: {
        emailHash,
        OR: [
          { firebaseUid: { startsWith: "provisioned:" } },
          { firebaseUid: { startsWith: "dev-" } },
        ],
      },
    });

    if (provisioned) {
      const current = this.crypto.decryptUser(provisioned);
      const sealed = this.crypto.sealPii(
        {
          email,
          name: name || current.name,
          phone: current.phone,
          bio: current.bio,
          instagramUrl: current.instagramUrl,
        },
        provisioned.encryptedKey,
      );
      const claimed = await this.prisma.user.update({
        where: { id: provisioned.id },
        data: {
          ...sealed,
          firebaseUid: auth.firebaseUid,
        },
      });
      if (dto.fcmToken) {
        await this.push.registerToken(claimed.id, dto.fcmToken);
      }
      const decrypted = this.crypto.decryptUser(claimed);
      return {
        ...decrypted,
        photoUrl: await this.media.signReadUrl(decrypted.photoUrl),
      };
    }

    await this.assertEmailAvailable(email);

    let studioId: string | null = null;
    if (dto.studioId) {
      const studio = await this.prisma.studio.findUnique({
        where: { id: dto.studioId },
        select: { id: true },
      });
      if (!studio) {
        throw new BadRequestException("Studio not found");
      }
      studioId = studio.id;
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
        studioId,
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

  private async assertEmailAvailable(email: string, excludeUserId?: string) {
    const emailHash = this.crypto.hashEmail(email);
    const conflict = await this.prisma.user.findFirst({
      where: {
        emailHash,
        ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
      },
      select: { id: true },
    });
    if (conflict) {
      throw new ConflictException("A user with this email already exists");
    }
  }
}
