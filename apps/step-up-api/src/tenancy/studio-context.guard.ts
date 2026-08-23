import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from "@nestjs/common";
import { UserRole } from "@prisma/client";
import type { DecryptedUser } from "../users/user-crypto.service";
import type { StudioContext } from "./studio-context";
import { TenantResolverService } from "./tenant-resolver.service";

type StudioRequest = {
  user?: DecryptedUser;
  params?: Record<string, string>;
  query?: Record<string, unknown>;
  studioContext?: StudioContext;
};

/**
 * Resolves path/query studioId into StudioContext after AuthGuard.
 * Requires the authenticated user's studioId to match the requested studio.
 */
@Injectable()
export class StudioContextGuard implements CanActivate {
  constructor(
    @Inject(TenantResolverService)
    private readonly tenants: TenantResolverService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<StudioRequest>();
    const user = request.user;
    if (!user) {
      throw new ForbiddenException("Authentication required");
    }

    if (user.role === UserRole.SYSTEM_ADMIN) {
      throw new ForbiddenException(
        "System admins cannot access tenant studio data",
      );
    }

    const requested = resolveRequestedStudioId(request);
    if (!requested) {
      throw new ForbiddenException("Studio context is required");
    }

    const studio = await this.tenants.resolveActive({
      kind: "id",
      value: requested,
    });

    if (!user.studioId || user.studioId !== studio.id) {
      throw new ForbiddenException("You don't have access to this studio.");
    }

    request.studioContext = {
      studioId: studio.id,
      userId: user.id,
      role: user.role,
      slug: studio.slug,
    };

    return true;
  }
}

function resolveRequestedStudioId(request: StudioRequest): string | null {
  const params = request.params ?? {};
  if (typeof params.studioId === "string" && params.studioId.length > 0) {
    return params.studioId;
  }

  const queryStudioId = request.query?.studioId;
  if (typeof queryStudioId === "string" && queryStudioId.length > 0) {
    return queryStudioId;
  }

  return null;
}
