import { describe, expect, it } from "vitest";
import { ApiError } from "../api";
import { shouldKeepHydratedSession } from "../auth-session";

describe("shouldKeepHydratedSession", () => {
  it("drops the session when there is no cached user", () => {
    expect(
      shouldKeepHydratedSession(new Error("Account sync timed out"), false),
    ).toBe(false);
  });

  it("keeps the cached user when revalidation times out", () => {
    expect(
      shouldKeepHydratedSession(new Error("Account sync timed out"), true),
    ).toBe(true);
  });

  it("keeps the cached user on network failures", () => {
    expect(
      shouldKeepHydratedSession(new TypeError("Failed to fetch"), true),
    ).toBe(true);
  });

  it("signs out when the account is gone", () => {
    expect(
      shouldKeepHydratedSession(new ApiError("No account found", 401), true),
    ).toBe(false);
  });
});
