import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { StudioContext } from "./studio-context";

export const CurrentStudio = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): StudioContext => {
    const request = ctx.switchToHttp().getRequest<{
      studioContext: StudioContext;
    }>();
    return request.studioContext;
  },
);
