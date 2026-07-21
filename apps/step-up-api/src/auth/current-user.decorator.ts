import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { DecryptedUser } from "../users/user-crypto.service";

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): DecryptedUser => {
    const request = ctx.switchToHttp().getRequest<{ user: DecryptedUser }>();
    return request.user;
  },
);
