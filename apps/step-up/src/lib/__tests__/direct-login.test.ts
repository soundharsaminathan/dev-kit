import { describe, expect, it } from "vitest";
import { buildDirectLoginUrl, isDirectLoginFlag } from "../direct-login";

describe("direct-login", () => {
  it("treats true, 1, and true strings as the direct login flag", () => {
    expect(isDirectLoginFlag(true)).toBe(true);
    expect(isDirectLoginFlag("true")).toBe(true);
    expect(isDirectLoginFlag("1")).toBe(true);
  });

  it("rejects missing or unrelated values", () => {
    expect(isDirectLoginFlag(undefined)).toBe(false);
    expect(isDirectLoginFlag(false)).toBe(false);
    expect(isDirectLoginFlag("0")).toBe(false);
    expect(isDirectLoginFlag("studio")).toBe(false);
  });

  it("builds a login url without a studio query", () => {
    expect(buildDirectLoginUrl("https://app.classa.test")).toBe(
      "https://app.classa.test/login?direct=1",
    );
  });
});
