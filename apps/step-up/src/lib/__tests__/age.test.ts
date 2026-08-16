import { describe, expect, it } from "vitest";
import { ageFromDateOfBirth, ageRangeFromAge } from "../age";

const now = new Date("2026-08-16T12:00:00.000Z");

describe("ageFromDateOfBirth", () => {
  it("computes whole years from a date of birth", () => {
    expect(ageFromDateOfBirth("2000-01-15", now)).toBe(26);
    expect(ageFromDateOfBirth("2000-08-16", now)).toBe(26);
    expect(ageFromDateOfBirth("2000-08-17", now)).toBe(25);
    expect(ageFromDateOfBirth("2026-08-16", now)).toBe(0);
  });

  it("rejects malformed or future values", () => {
    expect(ageFromDateOfBirth("not-a-date", now)).toBeNull();
    expect(ageFromDateOfBirth("2099-01-01", now)).toBeNull();
    expect(ageFromDateOfBirth("", now)).toBeNull();
    expect(ageFromDateOfBirth(null, now)).toBeNull();
    expect(ageFromDateOfBirth(undefined, now)).toBeNull();
  });
});

describe("ageRangeFromAge", () => {
  it("maps ages to ranges", () => {
    expect(ageRangeFromAge(9)).toBe("UNDER_10");
    expect(ageRangeFromAge(10)).toBe("TEN_TO_TWENTY");
    expect(ageRangeFromAge(39)).toBe("TWENTY_TO_FORTY");
    expect(ageRangeFromAge(40)).toBe("FORTY_PLUS");
  });

  it("returns null for missing or invalid ages", () => {
    expect(ageRangeFromAge(null)).toBeNull();
    expect(ageRangeFromAge(undefined)).toBeNull();
  });
});
