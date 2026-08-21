import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { EventRsvpStatus } from "@prisma/client";
import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import type { DecryptedUser } from "../users/user-crypto.service";
import { FeatureGuard } from "../studio-features/feature.guard";
import { RequireFeature } from "../studio-features/require-feature.decorator";
import { ChatService } from "./chat.service";

class CreateConversationDto {
  @IsIn(["DM", "GROUP"])
  type!: "DM" | "GROUP";

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @IsString({ each: true })
  memberIds!: string[];

  @IsOptional()
  @IsString()
  @MaxLength(80)
  title?: string;
}

class LocationDto {
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat!: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  lng!: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  label?: string;
}

class SendMessageDto {
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  text?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  imageUrls?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  audioUrl?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(600)
  audioDuration?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  location?: LocationDto;

  @IsOptional()
  @IsString()
  replyToId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  clientMessageId?: string;
}

class ReactionDto {
  @IsString()
  @MaxLength(16)
  emoji!: string;
}

class CreatePollDto {
  @IsString()
  @MaxLength(300)
  question!: string;

  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  options!: string[];

  @IsOptional()
  @IsBoolean()
  multiSelect?: boolean;

  @IsOptional()
  @IsISO8601()
  closesAt?: string;
}

class VotePollDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @IsString({ each: true })
  optionIds!: string[];
}

class CreateEventDto {
  @IsString()
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsISO8601()
  startsAt!: string;

  @IsOptional()
  @IsISO8601()
  endsAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  locationLabel?: string;

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;
}

class RsvpDto {
  @IsEnum(EventRsvpStatus)
  status!: EventRsvpStatus;
}

class AddMembersDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @IsString({ each: true })
  memberIds!: string[];
}

class UpdateGroupDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  title?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;
}

@Controller("chat")
@UseGuards(AuthGuard, FeatureGuard)
@RequireFeature("chat")
export class ChatController {
  constructor(@Inject(ChatService) private readonly chatService: ChatService) {}

  @Get("contacts")
  listContacts(@CurrentUser() user: DecryptedUser) {
    return this.chatService.listContacts(user);
  }

  @Get("conversations")
  listConversations(@CurrentUser() user: DecryptedUser) {
    return this.chatService.listConversations(user.id);
  }

  @Post("conversations")
  createConversation(
    @CurrentUser() user: DecryptedUser,
    @Body() dto: CreateConversationDto,
  ) {
    return this.chatService.createConversation(user, dto);
  }

  @Get("conversations/:id")
  getConversation(@CurrentUser() user: DecryptedUser, @Param("id") id: string) {
    return this.chatService.getConversation(user.id, id);
  }

  @Patch("conversations/:id")
  updateGroup(
    @CurrentUser() user: DecryptedUser,
    @Param("id") id: string,
    @Body() dto: UpdateGroupDto,
  ) {
    return this.chatService.updateGroup(user, id, dto);
  }

  @Get("batches/:batchId/conversation")
  getBatchConversation(
    @CurrentUser() user: DecryptedUser,
    @Param("batchId") batchId: string,
  ) {
    return this.chatService.getBatchConversation(user, batchId);
  }

  @Get("conversations/:id/messages")
  listMessages(
    @CurrentUser() user: DecryptedUser,
    @Param("id") id: string,
    @Query("cursor") cursor?: string,
  ) {
    return this.chatService.listMessages(user.id, id, { cursor });
  }

  @Post("conversations/:id/messages")
  sendMessage(
    @CurrentUser() user: DecryptedUser,
    @Param("id") id: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.chatService.sendMessage(user, id, dto);
  }

  @Delete("messages/:id")
  deleteMessage(@CurrentUser() user: DecryptedUser, @Param("id") id: string) {
    return this.chatService.deleteMessage(user, id);
  }

  @Post("messages/:id/reactions")
  addReaction(
    @CurrentUser() user: DecryptedUser,
    @Param("id") id: string,
    @Body() dto: ReactionDto,
  ) {
    return this.chatService.addReaction(user, id, dto.emoji);
  }

  @Delete("messages/:id/reactions/:emoji")
  removeReaction(
    @CurrentUser() user: DecryptedUser,
    @Param("id") id: string,
    @Param("emoji") emoji: string,
  ) {
    return this.chatService.removeReaction(user, id, decodeURIComponent(emoji));
  }

  @Post("conversations/:id/polls")
  createPoll(
    @CurrentUser() user: DecryptedUser,
    @Param("id") id: string,
    @Body() dto: CreatePollDto,
  ) {
    return this.chatService.createPoll(user, id, dto);
  }

  @Post("polls/:id/votes")
  votePoll(
    @CurrentUser() user: DecryptedUser,
    @Param("id") id: string,
    @Body() dto: VotePollDto,
  ) {
    return this.chatService.votePoll(user, id, dto.optionIds);
  }

  @Post("conversations/:id/events")
  createEvent(
    @CurrentUser() user: DecryptedUser,
    @Param("id") id: string,
    @Body() dto: CreateEventDto,
  ) {
    return this.chatService.createEvent(user, id, dto);
  }

  @Post("events/:id/rsvp")
  rsvpEvent(
    @CurrentUser() user: DecryptedUser,
    @Param("id") id: string,
    @Body() dto: RsvpDto,
  ) {
    return this.chatService.rsvpEvent(user, id, dto.status);
  }

  @Post("conversations/:id/read")
  markRead(@CurrentUser() user: DecryptedUser, @Param("id") id: string) {
    return this.chatService.markRead(user.id, id);
  }

  @Post("conversations/:id/members")
  addMembers(
    @CurrentUser() user: DecryptedUser,
    @Param("id") id: string,
    @Body() dto: AddMembersDto,
  ) {
    return this.chatService.addMembers(user, id, dto.memberIds);
  }

  @Delete("conversations/:id/members/:userId")
  removeMember(
    @CurrentUser() user: DecryptedUser,
    @Param("id") id: string,
    @Param("userId") userId: string,
  ) {
    return this.chatService.removeMember(user, id, userId);
  }
}
