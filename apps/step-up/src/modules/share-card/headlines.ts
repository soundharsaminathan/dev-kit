export const DEFAULT_SHARE_HEADLINE = "New Batch Starting!";
export const DEFAULT_SHARE_CTA = "Join This Batch";

export const SHARE_HEADLINES = [
  "New Batch Starting!",
  "Admissions Open",
  "Join Our Dance Family",
  "New Batch — Enroll Now",
] as const;

export type ShareHeadline = (typeof SHARE_HEADLINES)[number];
