import type { IconName } from "@dev-ui/icons";
import { type FeatureKey, isFeatureKey } from "@/lib/feature-keys";

export const FEATURE_ICONS = {
  chat: "message-square",
  feed: "image",
  payments: "credit-card",
  expenses: "wallet",
  payouts: "send",
  contests: "star",
  bookings: "book-open",
  data_import: "upload",
  ai_agent: "sparkles",
} as const satisfies Record<FeatureKey, IconName>;

export const FEATURE_CATEGORY_ICONS: Record<string, IconName> = {
  Communication: "message-square",
  Finance: "credit-card",
  Engagement: "star",
  Operations: "settings",
};

export function featureIcon(key: string): IconName {
  return isFeatureKey(key) ? FEATURE_ICONS[key] : "zap";
}

export function featureCategoryIcon(category: string): IconName {
  return FEATURE_CATEGORY_ICONS[category] ?? "layout-grid";
}
