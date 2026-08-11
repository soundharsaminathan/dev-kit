import {
  Body,
  Controller,
  Inject,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { UserRole } from "@prisma/client";
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
} from "class-validator";
import type { DecryptedUser } from "../users/user-crypto.service";
import { AuthService } from "./auth.service";
import type { VerifiedAuth } from "./firebase.service";
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

  /** Explicit register only — boot/login sync must not invent accounts. */
  @IsOptional()
  @IsBoolean()
  create?: boolean;

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
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  @Post("bypass-login")
  bypassLogin(@Body() dto: BypassLoginDto): Promise<DecryptedUser> {
    return this.auth.bypassLogin(dto.email);
  }

  @Post("password-changed")
  @UseGuards(TokenGuard)
  passwordChanged(
    @Req() request: { auth: VerifiedAuth },
  ): Promise<DecryptedUser> {
    return this.auth.clearMustChangePassword(request.auth);
  }

  @Post("accept-invite")
  @UseGuards(TokenGuard)
  acceptInvite(
    @Req() request: { auth: VerifiedAuth },
    @Body() dto: AcceptInviteDto,
  ): Promise<DecryptedUser> {
    return this.auth.acceptInvite(dto.token, request.auth);
  }

  @Post("sync")
  @UseGuards(TokenGuard)
  sync(
    @Req() request: { auth: VerifiedAuth },
    @Body() dto: SyncUserDto,
  ): Promise<DecryptedUser> {
    return this.auth.sync(request.auth, dto);
  }
}
