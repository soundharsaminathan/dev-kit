import { describe, expect, it } from "vitest";
import { batchCategoryForAgeRange } from "./batch-category";

describe("batchCategoryForAgeRange", () => {
  it("returns null when age range is missing", () => {
    expect(batchCategoryForAgeRange(null)).toBeNull();
    expect(batchCategoryForAgeRange(undefined)).toBeNull();
  });

  it("maps kids and teens to KIDS", () => {
    expect(batchCategoryForAgeRange("UNDER_10")).toBe("KIDS");
    expect(batchCategoryForAgeRange("TEN_TO_TWENTY")).toBe("KIDS");
  });

  it("maps adult ranges to ADULTS", () => {
    expect(batchCategoryForAgeRange("TWENTY_TO_FORTY")).toBe("ADULTS");
    expect(batchCategoryForAgeRange("FORTY_PLUS")).toBe("ADULTS");
  });
});
