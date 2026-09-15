import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { User } from "../generated/prisma";

export type AuthUser = User;

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const request = ctx.switchToHttp().getRequest<{ user: AuthUser }>();
    return request.user;
  },
);
