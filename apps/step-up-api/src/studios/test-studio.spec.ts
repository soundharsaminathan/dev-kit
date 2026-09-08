import { describe, expect, it } from "vitest";
import { isIncludeTestQuery, isTestStudio } from "./test-studio";

describe("isTestStudio", () => {
  it("matches seeded e2e and smoke slugs", () => {
    expect(
      isTestStudio({ slug: "e2e-test-studio", name: "E2E Test Studio" }),
    ).toBe(true);
    expect(
      isTestStudio({ slug: "e2e-test-studio-b", name: "E2E Test Studio B" }),
    ).toBe(true);
    expect(
      isTestStudio({ slug: "smoke-test-studio", name: "Smoke Test Studio" }),
    ).toBe(true);
  });

  it("matches leftover journey studios that are not named test", () => {
    expect(
      isTestStudio({
        slug: "e2e-owner-login-1785885721343",
        name: "E2E Owner Login 1785885721343",
      }),
    ).toBe(true);
    expect(
      isTestStudio({
        slug: "http-studio-1",
        name: "HTTP Studio 1",
      }),
    ).toBe(true);
  });

  it("leaves real studio slugs visible", () => {
    expect(isTestStudio({ slug: "classa", name: "classa" })).toBe(false);
    expect(isTestStudio({ slug: "latest-moves", name: "Latest Moves" })).toBe(
      false,
    );
    expect(isTestStudio({ slug: "contest-hub", name: "Contest Hub" })).toBe(
      false,
    );
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
