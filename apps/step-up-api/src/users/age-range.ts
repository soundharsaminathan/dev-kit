import { AgeRange } from "@prisma/client";

const MIN_IMPORT_AGE = 0;
const MAX_IMPORT_AGE = 120;

export function isImportAge(age: number): boolean {
  return Number.isInteger(age) && age >= MIN_IMPORT_AGE && age <= MAX_IMPORT_AGE;
}

/** Maps an exact age to the stored age-range label. */
export function ageRangeFromAge(age: number): AgeRange {
  if (age < 10) return AgeRange.UNDER_10;
  if (age < 20) return AgeRange.TEN_TO_TWENTY;
  if (age < 40) return AgeRange.TWENTY_TO_FORTY;
  return AgeRange.FORTY_PLUS;
}
