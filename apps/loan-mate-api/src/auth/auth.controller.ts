import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Post,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "./auth.guard";
import { AuthService } from "./auth.service";
import { CurrentUser, type AuthUser } from "./current-user.decorator";
import { BypassLoginDto, LoginDto } from "./dto/login.dto";

@Controller("auth")
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  @Post("login")
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password);
  }

  @Post("bypass")
  bypass(@Body() dto: BypassLoginDto) {
    if (dto.userId) {
      return this.auth.bypassLogin(dto.userId);
    }
    if (dto.email) {
      return this.auth.login(dto.email, "bypass");
    }
    throw new BadRequestException("userId or email required");
  }

  @Get("me")
  @UseGuards(AuthGuard)
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user);
  }
}
