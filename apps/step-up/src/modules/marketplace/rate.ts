import type { PublicMarketplaceCategory } from "./types";

export type MarketplaceRatingTarget = "STUDIO" | "TRAINER";
export type MarketplaceRatingSource = "TRIAL" | "CLASS" | "PRIVATE";

export type MarketplaceRatingPrompt = {
  studentId: string;
  studentName: string;
  target: MarketplaceRatingTarget;
  studioId: string | null;
  studioName: string | null;
  trainerId: string | null;
  trainerName: string | null;
  category: PublicMarketplaceCategory;
  source: MarketplaceRatingSource;
  attendedAt: string;
  className: string | null;
};

export function marketplaceRatingStars(value: number): number | null {
  if (!Number.isInteger(value) || value < 1 || value > 5) return null;
  return value;
}

export function ratePromptTitle(prompt: MarketplaceRatingPrompt): string {
  if (prompt.target === "TRAINER") {
    return `Rate ${prompt.trainerName ?? "your trainer"}`;
  }
  return `Rate ${prompt.studioName ?? "your studio"}`;
}

export function ratePromptHint(prompt: MarketplaceRatingPrompt): string {
  const place = [prompt.className, prompt.studioName].filter(Boolean).join(" · ");
  if (prompt.source === "TRIAL") {
    return place ? `Your trial at ${place}` : "Your trial";
  }
  if (prompt.source === "PRIVATE") {
    return place ? `Private at ${place}` : "Your private session";
  }
  return place || "Your class";
}
