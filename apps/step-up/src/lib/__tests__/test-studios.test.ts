import { describe, expect, it } from "vitest";
import { isIncludeTestFlag } from "../test-studios";

describe("isIncludeTestFlag", () => {
  it("treats true, 1, and true strings as include-test", () => {
    expect(isIncludeTestFlag(true)).toBe(true);
    expect(isIncludeTestFlag("true")).toBe(true);
    expect(isIncludeTestFlag("1")).toBe(true);
    expect(isIncludeTestFlag(1)).toBe(true);
  });

  it("rejects missing or unrelated values", () => {
    expect(isIncludeTestFlag(undefined)).toBe(false);
    expect(isIncludeTestFlag(false)).toBe(false);
    expect(isIncludeTestFlag("0")).toBe(false);
  });
});
