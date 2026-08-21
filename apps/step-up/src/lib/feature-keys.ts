export const FEATURE_KEYS = [
  "chat",
  "feed",
  "payments",
  "expenses",
  "payouts",
  "contests",
  "bookings",
  "data_import",
  "ai_agent",
] as const;

export type FeatureKey = (typeof FEATURE_KEYS)[number];

export function isFeatureKey(value: string): value is FeatureKey {
  return (FEATURE_KEYS as readonly string[]).includes(value);
}
