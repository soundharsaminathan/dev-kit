import { describe, expect, it } from "vitest";
import {
  isValidIanaTimeZone,
  utcOffsetMinutesForZone,
  zonedLocalToUtc,
} from "./zoned-local-time";

describe("zoned-local-time", () => {
  it("validates IANA time zones", () => {
    expect(isValidIanaTimeZone("Asia/Kolkata")).toBe(true);
    expect(isValidIanaTimeZone("UTC")).toBe(true);
    expect(isValidIanaTimeZone("Not/AZone")).toBe(false);
    expect(isValidIanaTimeZone("")).toBe(false);
  });

  it("returns getTimezoneOffset-style minutes for Asia/Kolkata", () => {
    expect(
      utcOffsetMinutesForZone(
        "Asia/Kolkata",
        new Date("2024-06-03T12:00:00.000Z"),
      ),
    ).toBe(-330);
  });

  it("converts local wall clock to UTC", () => {
    expect(zonedLocalToUtc("2024-06-03", "16:00", "UTC").toISOString()).toBe(
      "2024-06-03T16:00:00.000Z",
    );
    expect(
      zonedLocalToUtc("2024-06-03", "16:00", "Asia/Kolkata").toISOString(),
    ).toBe("2024-06-03T10:30:00.000Z");
  });
});
