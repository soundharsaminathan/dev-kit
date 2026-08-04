import { describe, expect, it } from "vitest";
import { formatActiveDuration } from "../format-active-duration";

describe("formatActiveDuration", () => {
  it("returns null for invalid or missing dates", () => {
    expect(formatActiveDuration(null)).toBeNull();
    expect(formatActiveDuration(undefined)).toBeNull();
    expect(formatActiveDuration("")).toBeNull();
    expect(formatActiveDuration("not-a-date")).toBeNull();
  });

  it("returns null when createdAt is in the future", () => {
    expect(
      formatActiveDuration("2026-06-01T12:00:00.000Z", new Date("2026-05-01")),
    ).toBeNull();
  });

  it("formats same-day and short tenures in days", () => {
    const now = new Date(2026, 5, 15, 18, 0, 0);
    expect(formatActiveDuration(new Date(2026, 5, 15, 9, 0, 0), now)).toBe(
      "Active 1 Day",
    );
    expect(formatActiveDuration(new Date(2026, 5, 5, 9, 0, 0), now)).toBe(
      "Active 10 Days",
    );
    expect(formatActiveDuration(new Date(2026, 4, 17, 9, 0, 0), now)).toBe(
      "Active 29 Days",
    );
  });

  it("formats whole calendar months", () => {
    const now = new Date(2026, 3, 15, 12, 0, 0);
    expect(formatActiveDuration(new Date(2026, 0, 15, 9, 0, 0), now)).toBe(
      "Active 3 Months",
    );
    expect(formatActiveDuration(new Date(2026, 2, 15, 9, 0, 0), now)).toBe(
      "Active 1 Month",
    );
    expect(formatActiveDuration(new Date(2026, 0, 16, 9, 0, 0), now)).toBe(
      "Active 2 Months",
    );
  });

  it("formats whole calendar years", () => {
    const now = new Date(2026, 5, 15, 12, 0, 0);
    expect(formatActiveDuration(new Date(2024, 5, 15, 9, 0, 0), now)).toBe(
      "Active 2 Years",
    );
    expect(formatActiveDuration(new Date(2025, 5, 15, 9, 0, 0), now)).toBe(
      "Active 1 Year",
    );
    expect(formatActiveDuration(new Date(2024, 5, 16, 9, 0, 0), now)).toBe(
      "Active 1 Year",
    );
  });

  it("handles month-end anniversaries", () => {
    expect(
      formatActiveDuration(
        new Date(2026, 0, 31, 9, 0, 0),
        new Date(2026, 1, 28, 12, 0, 0),
      ),
    ).toBe("Active 1 Month");
    expect(
      formatActiveDuration(
        new Date(2026, 0, 31, 9, 0, 0),
        new Date(2026, 1, 27, 12, 0, 0),
      ),
    ).toBe("Active 27 Days");
  });

  it("handles leap-day anniversary on a non-leap year", () => {
    expect(
      formatActiveDuration(
        new Date(2024, 1, 29, 9, 0, 0),
        new Date(2025, 1, 28, 12, 0, 0),
      ),
    ).toBe("Active 1 Year");
    expect(
      formatActiveDuration(
        new Date(2024, 1, 29, 9, 0, 0),
        new Date(2025, 1, 27, 12, 0, 0),
      ),
    ).toBe("Active 11 Months");
  });
});
