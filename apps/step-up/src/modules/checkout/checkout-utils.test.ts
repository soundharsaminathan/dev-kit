import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatPaiseAsInr, formatSeconds, secondsLeft } from "./checkout-utils";

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

  it("formats multi-hour remaining time as total minutes", () => {
    expect(formatSeconds(3600)).toBe("60:00");
    expect(formatSeconds(3661)).toBe("61:01");
  });

  it("formats paise as INR", () => {
    expect(formatPaiseAsInr(100)).toBe("₹1.00");
    expect(formatPaiseAsInr(1250)).toBe("₹12.50");
  });
});
