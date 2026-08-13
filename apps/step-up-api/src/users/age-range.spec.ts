import { AgeRange } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { ageRangeFromAge, isImportAge } from "./age-range";

describe("ageRangeFromAge", () => {
  it("assigns under 10", () => {
    expect(ageRangeFromAge(0)).toBe(AgeRange.UNDER_10);
    expect(ageRangeFromAge(9)).toBe(AgeRange.UNDER_10);
  });

  it("assigns 10 to 20 at the lower bound", () => {
    expect(ageRangeFromAge(10)).toBe(AgeRange.TEN_TO_TWENTY);
    expect(ageRangeFromAge(19)).toBe(AgeRange.TEN_TO_TWENTY);
  });

  it("assigns 20 to 40 at the lower bound", () => {
    expect(ageRangeFromAge(20)).toBe(AgeRange.TWENTY_TO_FORTY);
    expect(ageRangeFromAge(39)).toBe(AgeRange.TWENTY_TO_FORTY);
  });

  it("assigns 40 and above", () => {
    expect(ageRangeFromAge(40)).toBe(AgeRange.FORTY_PLUS);
    expect(ageRangeFromAge(81)).toBe(AgeRange.FORTY_PLUS);
  });
});

describe("isImportAge", () => {
  it("accepts whole years in range", () => {
    expect(isImportAge(0)).toBe(true);
    expect(isImportAge(25)).toBe(true);
    expect(isImportAge(120)).toBe(true);
  });

  it("rejects fractions and out-of-range values", () => {
    expect(isImportAge(8.5)).toBe(false);
    expect(isImportAge(-1)).toBe(false);
    expect(isImportAge(121)).toBe(false);
  });
});
