import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { DecryptedUser } from "../users/user-crypto.service";
import type { FeatureKey } from "./feature-keys";
import { REQUIRE_FEATURE_KEY } from "./require-feature.decorator";
import { StudioFeaturesService } from "./studio-features.service";

type FeatureRequest = {
  user?: DecryptedUser;
  params?: Record<string, string>;
  query?: Record<string, unknown>;
  body?: Record<string, unknown>;
  studioFeatureMaps?: Map<string, Map<string, boolean>>;
};

@Injectable()
export class FeatureGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(StudioFeaturesService)
    private readonly studioFeatures: StudioFeaturesService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<FeatureKey[]>(
      REQUIRE_FEATURE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!required?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<FeatureRequest>();
    const studioId = resolveStudioId(request);
    if (!studioId) {
      throw new ForbiddenException(
        "This feature is not available for this studio",
      );
    }

    for (const key of required) {
      const enabled = await this.studioFeatures.isEnabled(
        studioId,
        key,
        request,
      );
      if (!enabled) {
        throw new ForbiddenException(
          "This feature is not available for this studio",
        );
      }
    }

    return true;
  }
}

function resolveStudioId(request: FeatureRequest): string | null {
  const contextStudioId = (
    request as FeatureRequest & { studioContext?: { studioId?: string } }
  ).studioContext?.studioId;
  if (typeof contextStudioId === "string" && contextStudioId.length > 0) {
    return contextStudioId;
  }

  const params = request.params ?? {};
  if (typeof params.studioId === "string" && params.studioId.length > 0) {
    return params.studioId;
  }

  const userStudioId = request.user?.studioId;
  if (typeof userStudioId === "string" && userStudioId.length > 0) {
    return userStudioId;
  }

  return null;
}
