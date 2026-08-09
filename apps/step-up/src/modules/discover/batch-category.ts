import type { AgeRange } from "@/lib/constants";

export type BatchCategory = "KIDS" | "ADULTS";

/** Maps a student's age range to the batch audience they belong in. */
export function batchCategoryForAgeRange(
  ageRange: AgeRange | null | undefined,
): BatchCategory | null {
  if (!ageRange) return null;
  if (ageRange === "UNDER_10" || ageRange === "TEN_TO_TWENTY") {
    return "KIDS";
  }
  return "ADULTS";
}
