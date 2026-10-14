import {
  Injectable,
  Inject,
  UnauthorizedException,
  BadRequestException,
} from "@nestjs/common";
import { verifyPassword } from "../common/password";
import { PrismaService } from "../prisma/prisma.service";
import type { AuthUser } from "./current-user.decorator";

@Injectable()
export class AuthService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async login(email: string, password: string): Promise<{
    accessToken: string;
    user: AuthUser;
  }> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.active) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const bypass = process.env.AUTH_BYPASS === "true";

    if (user.passwordHash) {
      if (!verifyPassword(password, user.passwordHash)) {
        throw new UnauthorizedException("Invalid credentials");
      }
    } else if (!bypass) {
      throw new UnauthorizedException("Password login unavailable");
    } else if (password !== "bypass") {
      // Seed users without hash: accept password "bypass" only when AUTH_BYPASS
      throw new UnauthorizedException("Invalid credentials");
    }

    const accessToken =
      bypass
        ? `dev:${user.role}:${user.id}`
        : `user:${user.id}`;

    return { accessToken, user };
  }

  async me(user: AuthUser): Promise<AuthUser> {
    const fresh = await this.prisma.user.findUnique({ where: { id: user.id } });
    if (!fresh || !fresh.active) {
      throw new UnauthorizedException("User inactive");
    }
    return fresh;
  }

  async bypassLogin(userId: string): Promise<{ accessToken: string; user: AuthUser }> {
    if (process.env.AUTH_BYPASS !== "true") {
      throw new BadRequestException("AUTH_BYPASS is disabled");
    }
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.active) {
      throw new UnauthorizedException("User not found");
    }
    return {
      accessToken: `dev:${user.role}:${user.id}`,
      user,
    };
  }
}
