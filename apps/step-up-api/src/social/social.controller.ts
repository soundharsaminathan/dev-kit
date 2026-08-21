import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { FeatureGuard } from "../studio-features/feature.guard";
import { RequireFeature } from "../studio-features/require-feature.decorator";
import type { DecryptedUser } from "../users/user-crypto.service";
import { SocialService, serializePost } from "./social.service";

class CreatePostDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @IsString({ each: true })
  imageUrls!: string[];

  @IsOptional()
  @IsString()
  @MaxLength(2200)
  caption?: string;
}

class CreateCommentDto {
  @IsString()
  @MaxLength(2000)
  body!: string;
}

@Controller()
@UseGuards(AuthGuard, RolesGuard, FeatureGuard)
@RequireFeature("feed")
export class SocialController {
  constructor(
    @Inject(SocialService) private readonly socialService: SocialService,
  ) {}

  @Get("feed")
  async feed(
    @CurrentUser() user: DecryptedUser,
    @Query("cursor") cursor?: string,
  ) {
    const page = await this.socialService.getFeed(user.id, { cursor });
    return {
      posts: page.posts.map(serializePost),
      nextCursor: page.nextCursor,
    };
  }

  @Post("posts")
  async createPost(
    @CurrentUser() user: DecryptedUser,
    @Body() dto: CreatePostDto,
  ) {
    const post = await this.socialService.createPost(user.id, dto);
    return serializePost(post);
  }

  @Get("posts/:id")
  async getPost(@CurrentUser() user: DecryptedUser, @Param("id") id: string) {
    const post = await this.socialService.getPost(user.id, id);
    return serializePost(post);
  }

  @Post("posts/:id/like")
  async like(@CurrentUser() user: DecryptedUser, @Param("id") id: string) {
    const post = await this.socialService.likePost(user.id, id);
    return serializePost(post);
  }

  @Delete("posts/:id/like")
  async unlike(@CurrentUser() user: DecryptedUser, @Param("id") id: string) {
    const post = await this.socialService.unlikePost(user.id, id);
    return serializePost(post);
  }

  @Get("posts/:id/comments")
  listComments(@CurrentUser() user: DecryptedUser, @Param("id") id: string) {
    return this.socialService.listComments(user.id, id);
  }

  @Post("posts/:id/comments")
  addComment(
    @CurrentUser() user: DecryptedUser,
    @Param("id") id: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.socialService.addComment(user.id, id, dto.body);
  }

  @Post("posts/:id/repost")
  async repost(@CurrentUser() user: DecryptedUser, @Param("id") id: string) {
    const post = await this.socialService.repost(user.id, id);
    return serializePost(post);
  }

  @Get("users/:id/posts")
  async userPosts(@CurrentUser() user: DecryptedUser, @Param("id") id: string) {
    const posts = await this.socialService.listUserPosts(user.id, id);
    return posts.map(serializePost);
  }
}
