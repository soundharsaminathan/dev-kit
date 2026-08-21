import { describe, expect, it } from "vitest";
import {
  FEATURE_ICONS,
  featureCategoryIcon,
  featureIcon,
} from "./feature-icons";
import { FEATURE_KEYS } from "./feature-keys";
import {
  applyStudioFeatureEnabled,
  applyStudioFeatureItem,
  type StudioFeatureItem,
  type StudioFeaturesResponse,
} from "./studio-features";

function item(
  overrides: Partial<StudioFeatureItem> & Pick<StudioFeatureItem, "key">,
): StudioFeatureItem {
  return {
    name: overrides.key,
    description: "",
    category: "Operations",
    enabled: true,
    ...overrides,
  };
}

describe("feature icons", () => {
  it("maps every catalog key to an icon", () => {
    for (const key of FEATURE_KEYS) {
      expect(FEATURE_ICONS[key]).toBeTruthy();
      expect(featureIcon(key)).toBe(FEATURE_ICONS[key]);
    }
  });

  it("falls back for unknown keys and categories", () => {
    expect(featureIcon("not_a_feature")).toBe("zap");
    expect(featureCategoryIcon("Unknown")).toBe("layout-grid");
    expect(featureCategoryIcon("Finance")).toBe("credit-card");
  });
});

describe("studio feature cache patches", () => {
  const data: StudioFeaturesResponse = {
    features: [
      item({ key: "chat", enabled: true }),
      item({ key: "bookings", enabled: true }),
    ],
  };

  it("flips only the targeted feature", () => {
    expect(applyStudioFeatureEnabled(data, "chat", false)?.features).toEqual([
      item({ key: "chat", enabled: false }),
      item({ key: "bookings", enabled: true }),
    ]);
  });

  it("leaves undefined cache untouched", () => {
    expect(applyStudioFeatureEnabled(undefined, "chat", false)).toBeUndefined();
  });

  it("merges a server item without clobbering siblings", () => {
    const updated = item({
      key: "chat",
      enabled: false,
      name: "Chat",
      globallyEnabled: true,
    });
    expect(applyStudioFeatureItem(data, updated).features).toEqual([
      updated,
      item({ key: "bookings", enabled: true }),
    ]);
  });
});
