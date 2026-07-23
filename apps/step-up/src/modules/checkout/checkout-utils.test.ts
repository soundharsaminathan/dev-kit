import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatSeconds, secondsLeft } from "./checkout-utils";

describe("checkout-utils", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-24T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns zero seconds when expiry is missing or past", () => {
    expect(secondsLeft(undefined)).toBe(0);
    expect(secondsLeft("2026-07-24T11:59:00.000Z")).toBe(0);
  });

  it("counts remaining whole seconds until expiry", () => {
    expect(secondsLeft("2026-07-24T12:01:30.000Z")).toBe(90);
  });

  it("formats mm:ss countdown", () => {
    expect(formatSeconds(90)).toBe("01:30");
    expect(formatSeconds(5)).toBe("00:05");
    expect(formatSeconds(0)).toBe("00:00");
  });
});
