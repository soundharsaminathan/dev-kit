import { Body, Controller, Inject, Post, UseGuards } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { Transform, Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from "class-validator";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { FeatureGuard } from "../studio-features/feature.guard";
import { RequireFeature } from "../studio-features/require-feature.decorator";
import type { DecryptedUser } from "../users/user-crypto.service";
import { StaffAgentService } from "./staff-agent.service";

class StaffAgentMessageDto {
  @IsIn(["user", "assistant"])
  role!: "user" | "assistant";

  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MaxLength(4000)
  content!: string;
}

class StaffAgentChatDto {
  @IsArray()
  @ArrayMaxSize(40)
  @ValidateNested({ each: true })
  @Type(() => StaffAgentMessageDto)
  messages!: StaffAgentMessageDto[];

  @IsOptional()
  @IsBoolean()
  voice?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(5_000_000)
  audioBase64?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  audioMimeType?: string;
}

@Controller("staff-agent")
@UseGuards(AuthGuard, RolesGuard, FeatureGuard)
@RequireFeature("ai_agent")
export class StaffAgentController {
  constructor(
    @Inject(StaffAgentService) private readonly staffAgent: StaffAgentService,
  ) {}

  @Post("chat")
  @Roles(UserRole.OWNER, UserRole.STAFF)
  chat(@CurrentUser() user: DecryptedUser, @Body() dto: StaffAgentChatDto) {
    return this.staffAgent.chat(user, {
      messages: dto.messages ?? [],
      voice: dto.voice,
      audioBase64: dto.audioBase64,
      audioMimeType: dto.audioMimeType,
    });
  }
}
