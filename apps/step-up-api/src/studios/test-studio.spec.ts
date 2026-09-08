import { describe, expect, it } from "vitest";
import { isIncludeTestQuery, isTestStudioSlug } from "./test-studio";

describe("isTestStudioSlug", () => {
  it("matches seeded e2e and smoke slugs", () => {
    expect(isTestStudioSlug("e2e-test-studio")).toBe(true);
    expect(isTestStudioSlug("e2e-test-studio-b")).toBe(true);
    expect(isTestStudioSlug("smoke-test-studio")).toBe(true);
  });

  it("leaves real studio slugs visible", () => {
    expect(isTestStudioSlug("classa")).toBe(false);
    expect(isTestStudioSlug("latest-moves")).toBe(false);
    expect(isTestStudioSlug("contest-hub")).toBe(false);
  });
});

describe("isIncludeTestQuery", () => {
  it("accepts 1 and true", () => {
    expect(isIncludeTestQuery("1")).toBe(true);
    expect(isIncludeTestQuery("true")).toBe(true);
    expect(isIncludeTestQuery(true)).toBe(true);
  });

  it("rejects missing values", () => {
    expect(isIncludeTestQuery(undefined)).toBe(false);
    expect(isIncludeTestQuery("0")).toBe(false);
  });
});
