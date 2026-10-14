import { describe, expect, it } from "vitest";
import { resolveAuthBypassEnabled } from "./auth-bypass";

describe("resolveAuthBypassEnabled", () => {
  it("honors an explicit true flag", () => {
    expect(
      resolveAuthBypassEnabled({
        authBypass: "true",
        nodeEnv: "production",
        firebaseConfigured: true,
      }),
    ).toBe(true);
  });

  it("honors an explicit false flag even in local development", () => {
    expect(
      resolveAuthBypassEnabled({
        authBypass: "false",
        nodeEnv: "development",
        firebaseConfigured: false,
      }),
    ).toBe(false);
  });

  it("enables bypass for e2e when the flag is unset", () => {
    expect(
      resolveAuthBypassEnabled({
        authBypass: undefined,
        nodeEnv: "test",
        e2e: "true",
        firebaseConfigured: false,
      }),
    ).toBe(true);
  });

  it("enables bypass in development when Firebase is not configured", () => {
    expect(
      resolveAuthBypassEnabled({
        authBypass: undefined,
        nodeEnv: "development",
        firebaseConfigured: false,
      }),
    ).toBe(true);
  });

  it("stays off in production when the flag is unset", () => {
    expect(
      resolveAuthBypassEnabled({
        authBypass: undefined,
        nodeEnv: "production",
        firebaseConfigured: false,
      }),
    ).toBe(false);
  });

  it("stays off in development when Firebase admin is configured", () => {
    expect(
      resolveAuthBypassEnabled({
        authBypass: undefined,
        nodeEnv: "development",
        firebaseConfigured: true,
      }),
    ).toBe(false);
  });
});
