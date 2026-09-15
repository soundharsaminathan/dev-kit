import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { UserRole } from "../generated/prisma";
import { PrismaService } from "../prisma/prisma.service";
import type { AuthUser } from "./current-user.decorator";

const BYPASS_ROLES = new Set<string>(Object.values(UserRole));

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      headers: { authorization?: string };
      user?: AuthUser;
    }>();

    const header = request.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      throw new UnauthorizedException("Missing bearer token");
    }

    const token = header.slice("Bearer ".length).trim();
    const bypass = process.env.AUTH_BYPASS === "true";

    if (bypass && token.startsWith("dev:")) {
      request.user = await this.resolveBypassToken(token);
      return true;
    }

    // Optional Firebase stub — reject unless bypass login issued a opaque token
    // shaped as `user:<userId>` after email/password login.
    if (token.startsWith("user:")) {
      const userId = token.slice("user:".length);
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user || !user.active) {
        throw new UnauthorizedException("Invalid user token");
      }
      request.user = user;
      return true;
    }

    throw new UnauthorizedException(
      bypass
        ? "Invalid token. Use Bearer dev:ROLE:userId or user:<id> after login"
        : "Invalid token. Sign in again.",
    );
  }

  private async resolveBypassToken(token: string): Promise<AuthUser> {
    // Format: dev:ROLE:userId  OR  dev:userId (load role from DB)
    const parts = token.split(":");
    if (parts.length === 3) {
      const role = parts[1]!;
      const userId = parts[2]!;
      if (!BYPASS_ROLES.has(role)) {
        throw new UnauthorizedException(`Unknown bypass role: ${role}`);
      }
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user || !user.active) {
        throw new UnauthorizedException("Bypass user not found");
      }
      return user;
    }
    if (parts.length === 2) {
      const userId = parts[1]!;
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user || !user.active) {
        throw new UnauthorizedException("Bypass user not found");
      }
      return user;
    }
    throw new UnauthorizedException("Invalid bypass token format");
  }
}
