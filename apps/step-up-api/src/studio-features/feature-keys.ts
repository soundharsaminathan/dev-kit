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

export const FEATURE_CATALOG: ReadonlyArray<{
  key: FeatureKey;
  name: string;
  description: string;
  category: string;
}> = [
  {
    key: "chat",
    name: "Chat",
    description: "Studio messaging and conversations.",
    category: "Communication",
  },
  {
    key: "feed",
    name: "Feed",
    description: "Social feed posts and comments.",
    category: "Communication",
  },
  {
    key: "payments",
    name: "Payments",
    description: "Online payments dashboard and Razorpay checkout.",
    category: "Finance",
  },
  {
    key: "expenses",
    name: "Expenses",
    description: "Studio expense tracking and reports.",
    category: "Finance",
  },
  {
    key: "payouts",
    name: "Payouts",
    description: "Trainer payout management.",
    category: "Finance",
  },
  {
    key: "contests",
    name: "Contests",
    description: "Studio contests and entries.",
    category: "Engagement",
  },
  {
    key: "bookings",
    name: "Bookings",
    description: "Trial and class bookings.",
    category: "Operations",
  },
  {
    key: "data_import",
    name: "Data Import",
    description: "Bulk CSV import of studio data.",
    category: "Operations",
  },
  {
    key: "ai_agent",
    name: "AI agent",
    description: "Staff AI assistant in the studio app.",
    category: "Operations",
  },
];
