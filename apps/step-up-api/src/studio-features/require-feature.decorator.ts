import { SetMetadata } from "@nestjs/common";
import type { FeatureKey } from "./feature-keys";

export const REQUIRE_FEATURE_KEY = "requireFeature";

export const RequireFeature = (...keys: FeatureKey[]) =>
  SetMetadata(REQUIRE_FEATURE_KEY, keys);
