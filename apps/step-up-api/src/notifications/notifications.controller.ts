import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";
import { NotificationChannel } from "@prisma/client";
import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from "class-validator";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import type { DecryptedUser } from "../users/user-crypto.service";
import { NotificationsService } from "./notifications.service";
import { PreferencesService } from "./preferences.service";
import { PushService } from "./push.service";

class ListQueryDto {
  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsString()
  status?: "active" | "archived";

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  unreadOnly?: boolean;
}

class PatchNotificationDto {
  @IsOptional()
  @IsBoolean()
  read?: boolean;

  @IsOptional()
  @IsBoolean()
  archived?: boolean;
}

class PreferenceItemDto {
  @IsString()
  type!: string;

  @IsEnum(NotificationChannel)
  channel!: NotificationChannel;

  @IsBoolean()
  enabled!: boolean;

  @IsOptional()
  @IsInt()
  quietStartMinutes?: number | null;

  @IsOptional()
  @IsInt()
  quietEndMinutes?: number | null;
}

class PreferencesBodyDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PreferenceItemDto)
  preferences!: PreferenceItemDto[];
}

class RegisterDeviceDto {
  @IsString()
  token!: string;

  @IsOptional()
  @IsString()
  platform?: string;

  @IsOptional()
  @IsString()
  appVersion?: string;

  @IsOptional()
  @IsString()
  userAgent?: string;
}

@Controller("notifications")
@UseGuards(AuthGuard)
export class NotificationsController {
  constructor(
    @Inject(NotificationsService)
    private readonly notificationsService: NotificationsService,
    @Inject(PreferencesService)
    private readonly preferences: PreferencesService,
    @Inject(PushService) private readonly push: PushService,
  ) {}

  @Get()
  list(@CurrentUser() user: DecryptedUser, @Query() query: ListQueryDto) {
    return this.notificationsService.listForUser(user.id, {
      cursor: query.cursor,
      limit: query.limit,
      status: query.status,
      unreadOnly: query.unreadOnly,
    });
  }

  @Get("unread-count")
  unreadCount(@CurrentUser() user: DecryptedUser) {
    return this.notificationsService.unreadCount(user.id);
  }

  @Get("preferences")
  getPreferences(@CurrentUser() user: DecryptedUser) {
    return this.preferences.listForUser(user.id);
  }

  @Put("preferences")
  putPreferences(
    @CurrentUser() user: DecryptedUser,
    @Body() body: PreferencesBodyDto,
  ) {
    return this.preferences.upsertMany(user.id, body.preferences);
  }

  @Post("mark-all-read")
  markAllRead(@CurrentUser() user: DecryptedUser) {
    return this.notificationsService.markAllRead(user.id);
  }

  @Post("devices")
  registerDevice(
    @CurrentUser() user: DecryptedUser,
    @Body() body: RegisterDeviceDto,
  ) {
    return this.push.registerToken(user.id, body.token, {
      platform: body.platform,
      appVersion: body.appVersion,
      userAgent: body.userAgent,
    });
  }

  @Delete("devices/:token")
  unregisterDevice(
    @CurrentUser() user: DecryptedUser,
    @Param("token") token: string,
  ) {
    return this.push.unregisterToken(user.id, decodeURIComponent(token));
  }

  @Patch(":id/read")
  markRead(@CurrentUser() user: DecryptedUser, @Param("id") id: string) {
    return this.notificationsService.markReadOne(user.id, id);
  }

  @Patch(":id")
  patch(
    @CurrentUser() user: DecryptedUser,
    @Param("id") id: string,
    @Body() body: PatchNotificationDto,
  ) {
    return this.notificationsService.patchOne(user.id, id, body);
  }

  @Delete(":id")
  remove(@CurrentUser() user: DecryptedUser, @Param("id") id: string) {
    return this.notificationsService.softDelete(user.id, id);
  }
}
